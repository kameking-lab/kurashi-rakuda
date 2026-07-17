/*
 * 児童手当計算（Q3-08）— 計算ロジック本体。
 *
 * 制度データは data/seido/jido-teate.json を単一の情報源(SSOT)とする。
 * 金額・年齢境界・支給月はすべて同JSONを import して参照し、本ファイルには
 * ハードコードしない（数値が変わったら jido-teate.json だけを更新すれば追随する）。
 *
 * 実装上の最重要論点（jido-teate.json の note に詳しい）:
 * - 支給対象は 0歳〜「18歳に達する日以後の最初の3月31日」まで。
 * - 「第3子以降」の判定（多子加算のカウント）は、支給対象より広い
 *   「22歳に達する日以後の最初の3月31日」までの兄姉を、年齢が上から順に数える。
 * - 18歳年度末を超えた兄姉（19〜22歳年度末）をカウントに含めるには、
 *   親等の経済的負担（監護相当・生計費の負担）があることが要件。
 */
import seido from "@/data/seido/jido-teate.json";

const AMOUNTS = seido.data.monthlyAmounts;
const PAYMENT_MONTHS = seido.data.payment.months.value as number[];
export const JIDO_TEATE_DISCLAIMER = seido.disclaimer;

export type JidoTeateAgeCategory =
  | "under3"
  | "age3ToHighSchool"
  | "over18to22"
  | "over22";

export type JidoTeateTier = "firstSecondChild" | "thirdChildOnwards";

export interface JidoTeateChildInput {
  /** 生年月日（YYYY-MM-DD） */
  birthDate: string;
  /**
   * 18歳到達後最初の3月31日を過ぎた兄姉についてのみ意味を持つフラグ。
   * 親等が経済的負担（監護相当・生計費の負担）をしているかどうか。
   * 支給対象児童（18歳年度末まで）や、22歳年度末を超えた子には影響しない。
   */
  economicallySupported?: boolean;
}

export interface JidoTeateChildResult {
  index: number;
  birthDate: string;
  /** 満年齢（基準日時点） */
  age: number;
  ageCategory: JidoTeateAgeCategory;
  /** 支給対象児童か（0歳〜18歳年度末） */
  isRecipient: boolean;
  /** 多子加算のカウント対象に入るか（22歳年度末まで、18〜22歳年度末は経済的負担が必要） */
  countedForRanking: boolean;
  /** 年齢が上の子から数えた順位（カウント対象のみ。1始まり） */
  rank: number | null;
  tier: JidoTeateTier | null;
  monthlyAmount: number;
}

export interface JidoTeateResult {
  children: JidoTeateChildResult[];
  totalMonthly: number;
  totalAnnual: number;
  /** 1回あたりの支給額（偶数月年6回、前2か月分をまとめて支給） */
  perPaymentAmount: number;
  paymentMonths: number[];
  disclaimer: string;
}

export interface JidoTeateFieldError {
  index: number;
  message: string;
}

export type JidoTeateCalcResult =
  | { ok: true; result: JidoTeateResult }
  | { ok: false; errors: JidoTeateFieldError[] };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD文字列を厳密に検証してUTC日付にする。不正な日付（2/30等）はnull */
function parseISODateStrict(s: string): Date | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

function addYearsUTC(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

/**
 * 「N歳に達する日以後の最初の3月31日」を返す（年度末カットオフの共通計算）。
 * ★「N歳に達する日」は誕生日の前日★（年齢計算ニ関スル法律・民法143条）。
 * このため4/1生まれはN歳到達日が3/31となり、4/2以降生まれより1年早く年度末を迎える
 * （学年の区切りが4/1生まれまでなのと同じ理屈）。
 */
function nendoMatsuCutoff(birthDate: Date, attainAge: number): Date {
  const attainDay = new Date(addYearsUTC(birthDate, attainAge).getTime() - 86400000);
  const month = attainDay.getUTCMonth() + 1; // 1-12
  const year = month >= 4 ? attainDay.getUTCFullYear() + 1 : attainDay.getUTCFullYear();
  return new Date(Date.UTC(year, 2, 31)); // 3月(index 2)31日
}

/** 満年齢（基準日時点） */
function fullAge(birthDate: Date, baseDate: Date): number {
  let age = baseDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthdayThisYear =
    baseDate.getUTCMonth() < birthDate.getUTCMonth() ||
    (baseDate.getUTCMonth() === birthDate.getUTCMonth() &&
      baseDate.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

function classify(birthDate: Date, baseDate: Date): { category: JidoTeateAgeCategory; age: number } {
  const age = fullAge(birthDate, baseDate);
  const cutoff18 = nendoMatsuCutoff(birthDate, 18);
  const cutoff22 = nendoMatsuCutoff(birthDate, 22);
  const thirdBirthday = addYearsUTC(birthDate, 3);

  if (baseDate.getTime() > cutoff22.getTime()) {
    return { category: "over22", age };
  }
  if (baseDate.getTime() > cutoff18.getTime()) {
    return { category: "over18to22", age };
  }
  // ★月単位で判定★ 0〜2歳の月額は「3歳の誕生日の前日が属する月まで」
  // （data/seido/jido-teate.json の note）。日単位で切ると誕生月の途中から
  // 10,000円になり、その月分を過少表示してしまう。
  const thirdBirthdayEve = new Date(thirdBirthday.getTime() - 86400000);
  const baseYm = baseDate.getUTCFullYear() * 12 + baseDate.getUTCMonth();
  const eveYm = thirdBirthdayEve.getUTCFullYear() * 12 + thirdBirthdayEve.getUTCMonth();
  if (baseYm <= eveYm) {
    return { category: "under3", age };
  }
  return { category: "age3ToHighSchool", age };
}

/**
 * 児童手当の計算本体。
 * @param children 子ども1人ずつの生年月日・経済的負担フラグの配列（1世帯分）
 * @param baseDateStr 基準日（YYYY-MM-DD）。未指定時は当日。
 */
export function calculateJidoTeate(
  children: JidoTeateChildInput[],
  baseDateStr?: string,
): JidoTeateCalcResult {
  const baseDateInput = baseDateStr ?? new Date().toISOString().slice(0, 10);
  const baseDate = parseISODateStrict(baseDateInput);
  if (!baseDate) {
    return { ok: false, errors: [{ index: -1, message: "基準日の形式が正しくありません" }] };
  }

  const errors: JidoTeateFieldError[] = [];
  const parsed: { index: number; birthDate: Date; input: JidoTeateChildInput }[] = [];

  children.forEach((child, index) => {
    const bd = parseISODateStrict(child.birthDate);
    if (!bd) {
      errors.push({ index, message: "生年月日の形式が正しくありません" });
      return;
    }
    if (bd.getTime() > baseDate.getTime()) {
      errors.push({ index, message: "生年月日は基準日より前の日付にしてください" });
      return;
    }
    parsed.push({ index, birthDate: bd, input: child });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const classified = parsed.map(({ index, birthDate, input }) => {
    const { category, age } = classify(birthDate, baseDate);
    const isRecipient = category === "under3" || category === "age3ToHighSchool";
    const countedForRanking =
      isRecipient || (category === "over18to22" && input.economicallySupported === true);
    return { index, birthDate, category, age, isRecipient, countedForRanking };
  });

  // 年齢が上の子（生年月日が早い子）から順に、カウント対象のみを並べて順位付け
  const rankOrder = classified
    .filter((c) => c.countedForRanking)
    .slice()
    .sort((a, b) => a.birthDate.getTime() - b.birthDate.getTime());
  const rankByIndex = new Map<number, number>();
  rankOrder.forEach((c, i) => rankByIndex.set(c.index, i + 1));

  const results: JidoTeateChildResult[] = classified.map((c) => {
    const rank = rankByIndex.get(c.index) ?? null;
    let tier: JidoTeateTier | null = null;
    let monthlyAmount = 0;

    if (c.isRecipient) {
      tier = rank !== null && rank >= 3 ? "thirdChildOnwards" : "firstSecondChild";
      const table = c.category === "under3" ? AMOUNTS.under3 : AMOUNTS.age3ToHighSchool;
      monthlyAmount = table[tier].value;
    }

    return {
      index: c.index,
      birthDate: parsed.find((p) => p.index === c.index)!.input.birthDate,
      age: c.age,
      ageCategory: c.category,
      isRecipient: c.isRecipient,
      countedForRanking: c.countedForRanking,
      rank,
      tier,
      monthlyAmount,
    };
  });

  const totalMonthly = results.reduce((sum, r) => sum + r.monthlyAmount, 0);
  const totalAnnual = totalMonthly * 12;
  const paymentsPerYear = PAYMENT_MONTHS.length; // 6（偶数月）
  const perPaymentAmount = Math.round((totalMonthly * 12) / paymentsPerYear);

  return {
    ok: true,
    result: {
      children: results,
      totalMonthly,
      totalAnnual,
      perPaymentAmount,
      paymentMonths: PAYMENT_MONTHS,
      disclaimer: JIDO_TEATE_DISCLAIMER,
    },
  };
}
