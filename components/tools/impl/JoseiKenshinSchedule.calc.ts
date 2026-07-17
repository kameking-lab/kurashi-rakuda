/**
 * 健診・がん検診 年齢別スケジュール（女性）（P2-T33）— 純粋な年齢判定ロジック。
 * 仕様: specs/b-tools/p2-t33-josei-kenshin-schedule.md
 *
 * 対象年齢・受診間隔の数値はすべて data/seido/kenshin-gankenshin-schedule.json から読む
 * （厚生労働省「がん予防重点健康教育及びがん検診実施のための指針」令和7年12月24日一部改正版、
 * 「特定健診・特定保健指導について」、高齢者の医療の確保に関する法律 が一次情報）。
 * ここに年齢の数値を直書きしない。データの value（自然文の文字列）から正規表現で年齢を
 * 抽出する方式は lib/tools/impl/kaigo-jikofutan.ts の YD_MIDDLE と同じ考え方を踏襲している。
 *
 * ★このファイルが守っている「罠」（データの amendments[].impact 参照）★
 *   1. 子宮頸がん検診は「2年に1回」と一律に書かない（細胞診は2年、HPV検査単独法は5年で
 *      市区町村により方式が異なる）。両方の間隔をラベルに併記する。
 *   2. 肺がん検診の検診項目に「喀痰細胞診」を含めない（令和7年12月24日改正で削除済み）。
 *   3. 対象年齢の上限（69歳）は「受診を特に推奨する年齢」の上限であり、対象年齢そのものの
 *      上限ではない（70歳以上も対象。commonRules.recommendedAgeNote 参照）。
 *      本ツールの対象年齢判定に recommendedAge は使わず targetAge のみを使う。
 *   4. 特定健診（40〜74歳）と後期高齢者健診（75歳以上）は別制度・別実施主体であり、
 *      75歳到達で自動的に切り替わる（本ツールは誕生日基準の満年齢で判定する簡易実装。
 *      実際の特定健診は「当該年度において40〜74歳に達する加入者」という年度単位の年齢で
 *      判定されるため、誕生日の前後数か月は本ツールの判定と実際の運用が数か月ずれることがある）。
 *   5. 現在がん・前がん病変で治療中の方はそのがん検診の対象にならない
 *      （commonRules.underTreatmentExclusion）。年齢だけで機械的に「対象」と言い切らない。
 *   6. 実施の有無・自己負担額・案内方法は市区町村（特定健診は医療保険者、後期高齢者健診は
 *      広域連合）ごとに異なる（努力義務規定・disclaimer 参照）。金額は一切出さない。
 */

import kenshinSeido from "@/data/seido/kenshin-gankenshin-schedule.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kenshinGankenshinDataset = kenshinSeido as unknown as SeidoDataset;

const CS = kenshinSeido.data.cancerScreenings;
const SHC = kenshinSeido.data.specificHealthCheckup;
const EHC = kenshinSeido.data.elderlyHealthCheckup;
const COMMON = CS.commonRules;
const COMPREHENSIVE = CS.comprehensive;

/** 治療中は対象外である旨（データ由来。年齢判定と独立して常に表示する） */
export const UNDER_TREATMENT_EXCLUSION_NOTE = COMMON.underTreatmentExclusion.value;
/** 総合がん検診（40歳・50歳が対象）の他検診への影響（データ由来。参考情報として表示） */
export const COMPREHENSIVE_SCREENING_NOTE = `${COMPREHENSIVE.targetAge.value}が対象の「総合がん検診」を受けた場合、${COMPREHENSIVE.effectOnOtherScreenings.value}`;

// ---------------------------------------------------------------- 文字列からの年齢抽出

/**
 * 「50歳以上」「40歳以上の女性」のような文字列から最初に現れる年齢（数値）を抽出する。
 * データの自然文表現を年齢しきい値としてそのまま使うためのヘルパー。
 * kaigo-jikofutan.ts の YD_MIDDLE と同じ「正規表現でデータの自然文から数値を取り出す」方針。
 */
export function extractFirstAge(text: string): number {
  const m = /(\d+)歳/.exec(text);
  if (!m) {
    throw new Error(`年齢を抽出できませんでした: ${text}`);
  }
  return Number(m[1]);
}

/** 「40歳〜74歳」のような文字列から [下限, 上限] の年齢を抽出する */
export function extractAgeRange(text: string): [number, number] {
  const m = /(\d+)歳.*?(\d+)歳/.exec(text);
  if (!m) {
    throw new Error(`年齢範囲を抽出できませんでした: ${text}`);
  }
  return [Number(m[1]), Number(m[2])];
}

// ---------------------------------------------------------------- 検診の定義

export type ScreeningId =
  | "cervical"
  | "breast"
  | "stomach"
  | "lung"
  | "colorectal"
  | "specificHealthCheckup"
  | "elderlyHealthCheckup";

export interface ScreeningDef {
  id: ScreeningId;
  /** 表示名 */
  name: string;
  /** 対象年齢の表示ラベル（データの value をそのまま、または組み合わせたもの） */
  targetAgeLabel: string;
  /** 対象と判定する年齢の下限（満年齢。この年齢に達した年から対象） */
  minAge: number;
  /** 対象と判定する年齢の上限（満年齢。null は上限なし） */
  maxAge: number | null;
  /** 受診間隔の表示ラベル */
  intervalLabel: string;
  /** 補足（自治体差・方式差・切替の説明など） */
  note?: string;
}

export const SCREENING_DEFS: ScreeningDef[] = [
  {
    id: "cervical",
    name: "子宮頸がん検診",
    targetAgeLabel: CS.cervical.targetAgeCytology.value,
    minAge: extractFirstAge(CS.cervical.targetAgeCytology.value),
    maxAge: null,
    intervalLabel: `子宮頸部の細胞診: ${CS.cervical.intervalCytologyYears.value}年に1回／HPV検査単独法（${CS.cervical.targetAgeHpv.value}）: ${CS.cervical.intervalHpvYears.value}年に1回`,
    note:
      "採用する検査方法（細胞診／HPV検査単独法）はお住まいの市区町村によって異なります。HPV検査単独法は、陽性の場合にトリアージ検査、トリアージ検査が陰性でも翌年度に追跡検査が必要になることがあります。",
  },
  {
    id: "breast",
    name: "乳がん検診",
    targetAgeLabel: CS.breast.targetAge.value,
    minAge: extractFirstAge(CS.breast.targetAge.value),
    maxAge: null,
    intervalLabel: `${CS.breast.intervalYears.value}年に1回`,
    note: "視診・触診（視触診）単独の検診は指針上推奨されていません。乳房エックス線検査（マンモグラフィ）と併せて行うことになっています。",
  },
  {
    id: "stomach",
    name: "胃がん検診",
    targetAgeLabel: CS.stomach.targetAge.value,
    minAge: extractFirstAge(CS.stomach.targetAge.value),
    maxAge: null,
    intervalLabel: `${CS.stomach.intervalYears.value}年に1回`,
    note: `${CS.stomach.targetAgeException.value}（${CS.stomach.intervalException.value}）`,
  },
  {
    id: "lung",
    name: "肺がん検診",
    targetAgeLabel: CS.lung.targetAge.value,
    minAge: extractFirstAge(CS.lung.targetAge.value),
    maxAge: null,
    intervalLabel: `${CS.lung.intervalYears.value}年に1回`,
    note: "検診項目は「質問」と「胸部エックス線検査」です（令和7年12月24日改正で喀痰細胞診は項目から削除されています）。",
  },
  {
    id: "colorectal",
    name: "大腸がん検診",
    targetAgeLabel: CS.colorectal.targetAge.value,
    minAge: extractFirstAge(CS.colorectal.targetAge.value),
    maxAge: null,
    intervalLabel: `${CS.colorectal.intervalYears.value}年に1回`,
  },
  {
    id: "specificHealthCheckup",
    name: "特定健康診査（特定健診）",
    targetAgeLabel: SHC.targetAge.value,
    minAge: extractAgeRange(SHC.targetAge.value)[0],
    maxAge: extractAgeRange(SHC.targetAge.value)[1],
    intervalLabel: SHC.frequency.value,
    note: "75歳になると特定健診の対象からは外れ、後期高齢者健診に切り替わります。実施主体は加入する医療保険者（健康保険組合・協会けんぽ・市町村国保など）です。",
  },
  {
    id: "elderlyHealthCheckup",
    name: "後期高齢者健診",
    targetAgeLabel: EHC.targetPersons.value,
    minAge: extractFirstAge(EHC.targetPersons.value),
    maxAge: null,
    intervalLabel: "実施主体（後期高齢者医療広域連合）が定める（全国一律の頻度を定めた一次情報なし）",
    note: "特定健診（40〜74歳）から切り替わる健診です。実施は努力義務のため、内容は広域連合ごとに異なります。一定の障害がある場合は65歳から対象になることがあります。",
  },
];

// ---------------------------------------------------------------- 年齢判定

export type EligibilityStatus = "eligible" | "notYetEligible" | "notEligible";

export interface ScreeningJudgement extends ScreeningDef {
  status: EligibilityStatus;
  /** status が "notYetEligible" のときのみ、対象年齢に達するまでの年数 */
  yearsUntilEligible: number | null;
}

/** 満年齢1つに対して、1つの検診定義を判定する */
export function judgeScreening(age: number, def: ScreeningDef): ScreeningJudgement {
  if (def.maxAge !== null && age > def.maxAge) {
    return { ...def, status: "notEligible", yearsUntilEligible: null };
  }
  if (age >= def.minAge) {
    return { ...def, status: "eligible", yearsUntilEligible: null };
  }
  return { ...def, status: "notYetEligible", yearsUntilEligible: def.minAge - age };
}

/** 満年齢1つに対して、すべての検診を判定する */
export function judgeAllScreenings(age: number): ScreeningJudgement[] {
  return SCREENING_DEFS.map((def) => judgeScreening(age, def));
}

// ---------------------------------------------------------------- 日付・年齢ユーティリティ

/** "YYYY-MM-DD" 形式で実在する日付か */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * 生年月日と基準日（今日）から満年齢を計算する。
 * 「誕生日を迎えた日から加齢する」という一般的な満年齢の数え方（年齢計算ニ関スル法律の
 * 「前日に達する」という法的な数え方ではなく、日常的な誕生日基準の数え方）を用いる。
 * 本ツールは年単位の対象判定のみを行うため、この簡略化による実務上の影響はない。
 */
export function calcAge(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) {
    age -= 1;
  }
  return age;
}

/** 基準日からみて妥当とみなす生年月日の範囲（誤入力対策のゆるいガード） */
const MAX_AGE_YEARS = 120;

export interface JoseiKenshinInput {
  /** 生年月日（YYYY-MM-DD） */
  birthDate?: string;
}

/** 入力バリデーション。問題なければ null、エラーならメッセージを返す */
export function validateJoseiKenshinInput(input: JoseiKenshinInput, baseDate: string): string | null {
  if (!input.birthDate) {
    return "生年月日を入力してください";
  }
  if (!isValidDateString(input.birthDate)) {
    return "生年月日を正しい日付で入力してください";
  }
  if (input.birthDate > baseDate) {
    return "生年月日が今日より後の日付になっています。入力内容をご確認ください";
  }
  const age = calcAge(input.birthDate, baseDate);
  if (age > MAX_AGE_YEARS) {
    return "生年月日が古すぎます。入力内容をご確認ください";
  }
  return null;
}

export interface JoseiKenshinResult {
  age: number;
  judgements: ScreeningJudgement[];
}

export type JoseiKenshinCalcResult =
  | { ok: true; result: JoseiKenshinResult }
  | { ok: false; message: string };

/**
 * 健診・がん検診 年齢別スケジュールの計算のオーケストレーター。
 * バリデーション → 満年齢の算出 → 各検診の年齢判定、の順に行う。
 */
export function calcJoseiKenshinSchedule(
  input: JoseiKenshinInput,
  baseDate: string,
): JoseiKenshinCalcResult {
  const message = validateJoseiKenshinInput(input, baseDate);
  if (message) {
    return { ok: false, message };
  }

  const age = calcAge(input.birthDate as string, baseDate);
  const judgements = judgeAllScreenings(age);

  return { ok: true, result: { age, judgements } };
}
