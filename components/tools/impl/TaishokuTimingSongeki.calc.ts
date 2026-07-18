/*
 * 退職タイミング損得カレンダー（P2-T09）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/17-taishoku-timing-songeki.md
 *
 * SSOT: data/seido/taishoku-timing-songeki.json。
 * 給付日数表・給付制限月数・待期日数はすべて同JSONから import し、ハードコードしない。
 *
 * ★このツールが扱う3つの損得★
 *   ① 社会保険料: 月末退職か月末以外かで、退職月の社会保険料の扱いが変わる。
 *   ② 住民税: 退職する月によって、残りの住民税が一括徴収されるかどうかが変わる。
 *   ③ 雇用保険: 離職理由・年齢・被保険者期間で所定給付日数と給付制限が変わる。
 *   ★金額（保険料の実額）は個々人の標準報酬・自治体で異なるため算出しない（捏造しない）。★
 */
import seido from "@/data/seido/taishoku-timing-songeki.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const taishokuTimingDataset = seido as unknown as SeidoDataset;
export const TAISHOKU_TIMING_DISCLAIMER = seido.disclaimer;

const KH = seido.data.koyouHoken;

/** 待期期間（離職理由を問わず全員） */
export const WAITING_DAYS = KH.taikiKikan.value; // 7
/** 給付制限期間（自己都合・令和7年4月以降・月数） */
export const RESTRICTION_MONTHS_JIKO = KH.kyufuSeigenJikoTsugou.value; // 1

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(s: string): { y: number; m: number; d: number } | null {
  const mt = DATE_RE.exec(s);
  if (!mt) return null;
  const y = Number(mt[1]);
  const m = Number(mt[2]);
  const d = Number(mt[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addOneDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// ---------------------------------------------------------------- 離職区分・給付日数

export type LeaveReason = "kaisha-tsugou" | "jiko-tsugou" | "shuushoku-konnan";

const TABLE_BY_REASON: Record<LeaveReason, string> = {
  "kaisha-tsugou": "tokutei-jukyuu-shikakusha",
  "jiko-tsugou": "ippan-rishokusha",
  "shuushoku-konnan": "shuushoku-konnansha",
};

interface AgeRange {
  min: number;
  max: number;
}

/** ageLabel（"30歳以上35歳未満"等）を [min,max) に解釈する */
function parseAgeLabel(label: string): AgeRange {
  if (label.includes("全年齢")) return { min: 0, max: Infinity };
  const withMin = /(\d+)歳以上(\d+)歳未満/.exec(label);
  if (withMin) return { min: Number(withMin[1]), max: Number(withMin[2]) };
  const onlyMax = /(\d+)歳未満/.exec(label);
  if (onlyMax) return { min: 0, max: Number(onlyMax[1]) };
  const onlyMin = /(\d+)歳以上/.exec(label);
  if (onlyMin) return { min: Number(onlyMin[1]), max: Infinity };
  return { min: 0, max: Infinity };
}

/**
 * 被保険者期間（年）から給付日数配列のインデックスを求める。
 * 5列表（特定受給資格者・就職困難者）は [<1,1-5,5-10,10-20,20+]。
 * 一般離職者(ippan)は原典の colspan により [<1, 1-10（同値）, 10-20, 20+] の4列。
 */
function periodIndex(reason: LeaveReason, years: number): number {
  if (reason === "jiko-tsugou") {
    if (years < 1) return 0;
    if (years < 10) return 1; // 1〜5年・5〜10年は同値（colspan）
    if (years < 20) return 2;
    return 3;
  }
  if (years < 1) return 0;
  if (years < 5) return 1;
  if (years < 10) return 2;
  if (years < 20) return 3;
  return 4;
}

export interface KyufuNissuuResult {
  reasonTable: string;
  days: number | null;
  ageLabel: string;
  periodIndex: number;
}

export function lookupKyufuNissuu(
  reason: LeaveReason,
  age: number,
  years: number,
): KyufuNissuuResult | null {
  const tableKey = TABLE_BY_REASON[reason];
  const table = KH.shoteiKyufuNissuu.tables.find((t) => t.key === tableKey);
  if (!table) return null;
  const row =
    table.rows.find((r) => {
      const range = parseAgeLabel(r.ageLabel);
      return age >= range.min && age < range.max;
    }) ?? table.rows[table.rows.length - 1];
  const idx = periodIndex(reason, years);
  const days = row.days[idx] ?? null;
  return { reasonTable: table.label, days, ageLabel: row.ageLabel, periodIndex: idx };
}

// ---------------------------------------------------------------- 住民税の一括徴収

export type JuuminzeiRule = "forced-lump" | "optional-lump" | "may-limit";

export function juuminzeiRule(month: number): JuuminzeiRule {
  if (month >= 1 && month <= 4) return "forced-lump"; // 1/1〜4/30：申出不要で一括徴収
  if (month === 5) return "may-limit"; // 5月：限度あり
  return "optional-lump"; // 6/1〜12/31：申出があれば一括
}

export const JUUMINZEI_RULE_TEXT: Record<JuuminzeiRule, string> = {
  "forced-lump":
    "1月〜4月に退職する場合は、本人の申し出の有無にかかわらず、残りの住民税が最後の給与や退職金から一括徴収されます。",
  "may-limit":
    "5月に退職する場合は、その月に支払われる給与・退職金から残りの月割額が徴収されます（一括徴収の限度）。",
  "optional-lump":
    "6月〜12月に退職する場合は、退職月の翌月以降の分は原則ご自身で納付（普通徴収）に切り替わります。本人が申し出れば一括徴収も選べます。",
};

// ---------------------------------------------------------------- 入力・結果

export interface TaishokuTimingInput {
  /** 退職日（YYYY-MM-DD） */
  resignDate: string;
  reason: LeaveReason;
  /** 離職日時点の年齢 */
  age: number;
  /** 被保険者期間（年） */
  insuredYears: number;
}

export interface TaishokuTimingResult {
  ok: true;
  resign: { y: number; m: number; d: number };
  /** 資格喪失日（退職日の翌日） */
  shikakuSoushitsu: { y: number; m: number; d: number };
  /** 月末退職か */
  isMonthEnd: boolean;
  /** 退職月の社会保険料が最後の給与から会社経由で控除されるか（月末退職＝true） */
  resignMonthShahoViaCompany: boolean;
  juuminzeiRule: JuuminzeiRule;
  juuminzeiText: string;
  kyufu: KyufuNissuuResult | null;
  waitingDays: number;
  restrictionMonths: number;
}

export type TaishokuTimingCalcResult = TaishokuTimingResult | { ok: false; error: string };

export function calcTaishokuTiming(input: TaishokuTimingInput): TaishokuTimingCalcResult {
  const resign = parseDate(input.resignDate);
  if (!resign) return { ok: false, error: "退職日を正しい日付で入力してください。" };
  if (!Number.isFinite(input.age) || input.age < 0) {
    return { ok: false, error: "年齢を0以上で入力してください。" };
  }
  if (!Number.isFinite(input.insuredYears) || input.insuredYears < 0) {
    return { ok: false, error: "被保険者期間（年）を0以上で入力してください。" };
  }

  const isMonthEnd = resign.d === lastDayOfMonth(resign.y, resign.m);
  const shikakuSoushitsu = addOneDay(resign.y, resign.m, resign.d);
  const rule = juuminzeiRule(resign.m);
  const kyufu = lookupKyufuNissuu(input.reason, Math.floor(input.age), input.insuredYears);
  const restrictionMonths = input.reason === "jiko-tsugou" ? RESTRICTION_MONTHS_JIKO : 0;

  return {
    ok: true,
    resign,
    shikakuSoushitsu,
    isMonthEnd,
    resignMonthShahoViaCompany: isMonthEnd,
    juuminzeiRule: rule,
    juuminzeiText: JUUMINZEI_RULE_TEXT[rule],
    kyufu,
    waitingDays: WAITING_DAYS,
    restrictionMonths,
  };
}

export function fmtDate(d: { y: number; m: number; d: number }): string {
  return `${d.y}年${d.m}月${d.d}日`;
}
