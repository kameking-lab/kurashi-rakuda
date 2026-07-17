/**
 * 復帰日計算（P2-T34）— 産休育休の各期限・保育園入園から逆算する計算ロジック本体。
 * 仕様: specs/b-tools/p2-t34-fukki-bi-keisan.md
 *
 * 制度データは data/seido/ikukyu-kyufu.json・data/seido/ikukyu-encho-youken.json を
 * 単一の情報源(SSOT)とする。期限文言・要件・給付率はすべて同JSONを import して参照し、
 * 本ファイルには制度上の数値・文言をハードコードしない
 * （例外は「12」「18」「24」のような月数の算術定数。根拠はコード内コメントと
 *   tests/fukki-bi-keisan.test.ts のデータ文言照合テストを参照）。
 *
 * 日付演算は components/tools/impl/Getsurei.calc.ts の UTC epoch day パターンを踏襲し、
 * ISO文字列（YYYY-MM-DD）で入出力する（lib/tools/impl/sankyu-ikukyu-money.ts と同じ流儀）。
 *
 * ★実装上の最重要論点（data/seido/ikukyu-encho-youken.json の note に詳しい）★
 *   「一歳到達日」＝1歳の誕生日の前日（年齢計算ニ関スル法律・民法143条の一般原則）。
 *   1歳6か月・2歳に達する日も同じ考え方（応当日の前日）で計算する。
 *   育児休業給付金の給付率は通算180日目まで67%・181日目以降50%であり、
 *   「手取り10割」の80%とは別物（出生後休業支援給付金との合算は本ツールの範囲外）。
 */
import ikukyuKyufu from "@/data/seido/ikukyu-kyufu.json";
import ikukyuEncho from "@/data/seido/ikukyu-encho-youken.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const ikukyuKyufuDataset = ikukyuKyufu as unknown as SeidoDataset;
export const ikukyuEnchoDataset = ikukyuEncho as unknown as SeidoDataset;

const K = ikukyuKyufu.data.ikujiKyugyoKyufuKin;
const T = ikukyuKyufu.data.shussanTeateKin;
const EX = ikukyuEncho.data;

// ---------------------------------------------------------------- SSOT由来の定数

/** 産後の支給期間（56日=8週間）。T.periodAfterBirth（健康保険法第102条）。多胎でも56日で同じ */
export const POSTNATAL_LEAVE_DAYS: number = T.periodAfterBirth.value;

/** 育児休業給付金の給付率が切り替わる休業日数（通算180日） */
export const RATE_SWITCH_DAYS: number = K.rateSwitchDays.value;
/** 通算180日目までの給付率（67%） */
export const RATE_FIRST: number = K.rateFirst180Days.value;
/** 181日目以降の給付率（50%） */
export const RATE_AFTER: number = K.rateAfter180Days.value;

/** 育児休業の上限年齢（2歳）。ikukyu-encho-youken.json の secondExtension.maxAge（数値ノード） */
const LEAVE_MAX_AGE_YEARS: number = EX.leaveExtension.secondExtension.maxAge.value;

/**
 * 「1歳」「1歳6か月」「2歳」に達する日までの月数。
 * ikukyu-encho-youken.json の targetPeriod は「一歳から一歳六か月に達するまでの子」
 * 「一歳六か月から二歳に達するまでの子」という文言（数値ノードなし）で表現されているため、
 * 月数は算術定数として持つ。2歳（24か月）だけは secondExtension.maxAge（年単位の数値ノード）
 * から導出できるため、そちらを使う。1歳・1歳6か月の文言との整合は
 * tests/fukki-bi-keisan.test.ts が機械照合する。
 */
export const LEAVE_PRINCIPAL_MONTHS = 12;
export const LEAVE_EXTENSION_1_MONTHS = 18;
export const LEAVE_EXTENSION_2_MONTHS = LEAVE_MAX_AGE_YEARS * 12; // 24

/**
 * 産後6週間経過後の就業特例の日数（6週間=42日）。
 * ★注意★ この特例（本人が請求し、医師が支障ないと認めた業務に限り就業させて差し支えない）は
 * 労働基準法第65条第2項ただし書きに基づく一般に知られた規定だが、
 * data/seido/ikukyu-kyufu.json・ikukyu-encho-youken.json のいずれにも
 * 数値ノードとして収録されていない（出典検証スクリプトの対象外）。
 * そのため本ツールではこの日付を「参考情報」としてのみ表示し、
 * 復帰候補日や給付金の計算には使用しない。
 */
export const POSTNATAL_SIX_WEEK_DAYS = 42;

// ---------------------------------------------------------------- 延長要件・注記（UI表示用にそのまま引用する）

export const NURSERY_UNAVAILABLE_FIRST: string =
  EX.leaveExtension.nurseryUnavailableRule.firstExtension.value;
export const NURSERY_UNAVAILABLE_SECOND: string =
  EX.leaveExtension.nurseryUnavailableRule.secondExtension.value;
export const OTHER_EXTENSION_REASONS: string =
  EX.leaveExtension.nurseryUnavailableRule.otherReasons.value;

export const BENEFIT_EXTENSION_REQUIREMENT_1: string =
  EX.benefitExtension.requirements.requirement1.value;
export const BENEFIT_EXTENSION_REQUIREMENT_2: string =
  EX.benefitExtension.requirements.requirement2.value;
export const BENEFIT_EXTENSION_REQUIREMENT_3: string =
  EX.benefitExtension.requirements.requirement3.value;
export const BENEFIT_EXTENSION_COMMUTE_MINUTES: number =
  EX.benefitExtension.requirements.requirement2Details.commuteThresholdMinutes.value;

export const TWO_SEPARATE_SYSTEMS_NOTE: string = EX.keyPoints.twoSeparateSystems.value;
export const COPY_BEFORE_APPLYING_NOTE: string = EX.keyPoints.copyBeforeApplying.value;
export const FRAUD_WARNING: string = EX.benefitExtension.fraudWarning.value;

export const IKUKYU_KYUFU_DISCLAIMER: string = ikukyuKyufu.disclaimer;
export const IKUKYU_ENCHO_DISCLAIMER: string = ikukyuEncho.disclaimer;

// ---------------------------------------------------------------- 暦（Getsurei.calc.ts の epoch day パターンをISO文字列で踏襲）

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" が実在の暦日かどうかを厳密に検証する */
export function isValidISODate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** date の n 日後（nが負なら前）の日付 */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** a と b の日数差（b − a）。単純な暦日差 */
export function diffDays(a: string, b: string): number {
  const ta = new Date(`${a}T00:00:00Z`).getTime();
  const tb = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((tb - ta) / 86_400_000);
}

/** a, b の前後比較。a<b なら負、等しければ0、a>b なら正 */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * date から n か月後の日付（応当日方式・月末クランプ）。
 * 応当日が存在しない月（例: 1/31生まれの2月、うるう日2/29生まれの平年）は
 * その月の末日にクランプする（Getsurei.calc.ts の addMonths と同じ規則）。
 */
export function addMonths(iso: string, months: number): string {
  const m = DATE_RE.exec(iso);
  if (!m) throw new Error(`invalid ISO date: ${iso}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const idx = y * 12 + (mo - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = ((idx % 12) + 12) % 12 + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/**
 * 「Nか月に達する日」＝ 応当日（birthDateからNか月後の同日）の前日。
 * 根拠: ikukyu-encho-youken.json leaveExtension.firstExtension.targetPeriod.note
 * 「『一歳到達日』＝1歳の誕生日の前日」（年齢計算ニ関スル法律・民法143条の一般原則を
 * 1歳6か月・2歳にも同様に適用する）。
 */
export function attainDay(birthDateIso: string, monthsFromBirth: number): string {
  return addDays(addMonths(birthDateIso, monthsFromBirth), -1);
}

// ---------------------------------------------------------------- 入力・バリデーション

export type ExtensionIntent = "none" | "until18m" | "until24m";

export interface FukkiBiKeisanInput {
  /** 出産日、または（まだ出産前なら）出産予定日。YYYY-MM-DD */
  birthDate: string;
  /** 育休を延長する意向 */
  extensionIntent: ExtensionIntent;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const MIN_BIRTH_DATE = "1900-01-01";
const MAX_FUTURE_DAYS = 365; // 出産予定日として現実的な範囲（1年以内）の目安

/** 出産日（出産予定日）の入力チェック */
export function validateBirthDate(birthDate: string, todayIso: string): ValidationResult {
  if (!isValidISODate(birthDate)) {
    return { ok: false, error: "出産日（出産予定日）の形式が正しくありません。" };
  }
  if (compareDates(birthDate, MIN_BIRTH_DATE) < 0) {
    return { ok: false, error: "1900年1月1日以降の日付にしてください。" };
  }
  if (diffDays(todayIso, birthDate) > MAX_FUTURE_DAYS) {
    return { ok: false, error: "出産予定日が遠すぎます。日付をご確認ください。" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------- 計算本体

export interface Deadline {
  key: "postnatalEnd" | "principal" | "extension18" | "extension24";
  label: string;
  /** 期限の日付（到達日・産後休業終了日そのもの。この日までが対象期間） */
  date: string;
}

/** 育休期間中の給付率67%/50%の日数内訳 */
export interface LeaveRateBreakdown {
  /** 育休の対象日数（開始日〜終了日を含む） */
  totalDays: number;
  /** 給付率67%（通算180日目まで）の日数 */
  days67: number;
  /** 給付率50%（181日目以降）の日数 */
  days50: number;
  /** 給付率が67%→50%に切り替わる日（switchDaysに到達しない場合はnull） */
  rateSwitchDate: string | null;
}

export type ReturnCandidateKey = "afterPostnatal" | "principal" | "extension18" | "extension24";

export interface ReturnCandidate {
  key: ReturnCandidateKey;
  label: string;
  /** 復帰候補日（育休最終日の翌日、または産休明けすぐの場合は産休最終日の翌日） */
  returnDate: string;
  /** 育休を取得する場合の対象日数の内訳。育休を取らない場合は null */
  leave: LeaveRateBreakdown | null;
  /** 延長手続き（勤務先への申出・給付金の延長申請）が必要か */
  requiresExtension: boolean;
  /** ユーザーが入力した延長意向と一致する候補か */
  matchesIntent: boolean;
  /** 保育園入園の申込を検討し始める目安の期間（一般的な目安。自治体により大きく異なる） */
  nurseryCheckWindow: { from: string; to: string };
}

export interface FukkiBiKeisanResult {
  birthDate: string;
  /** 産後休業終了日の目安（出産日 + 56日） */
  postnatalEnd: string;
  /** 育児休業の開始日（産後休業の翌日） */
  ikukyuStart: string;
  /** 産後6週間経過日（参考情報。就業特例の目安日。計算には使用しない） */
  postnatalSixWeekDate: string;
  deadlines: Deadline[];
  candidates: ReturnCandidate[];
}

function leaveRateBreakdown(ikukyuStart: string, endDateInclusive: string): LeaveRateBreakdown {
  const totalDays = Math.max(0, diffDays(ikukyuStart, endDateInclusive) + 1);
  const days67 = Math.min(totalDays, RATE_SWITCH_DAYS);
  const days50 = Math.max(0, totalDays - RATE_SWITCH_DAYS);
  // 育休開始日を1日目として数えるため、切替日（181日目）は ikukyuStart + RATE_SWITCH_DAYS
  const rateSwitchDate = days50 > 0 ? addDays(ikukyuStart, RATE_SWITCH_DAYS) : null;
  return { totalDays, days67, days50, rateSwitchDate };
}

/** 保育園入園の申込を検討し始める目安の期間（期限日の4か月前〜2か月前）。一般的な目安であり断定しない */
function nurseryCheckWindow(deadlineDate: string): { from: string; to: string } {
  return { from: addMonths(deadlineDate, -4), to: addMonths(deadlineDate, -2) };
}

/**
 * 復帰日計算の本体。
 * @param input 出産日（予定日）と育休延長の意向
 */
export function calcFukkiBi(input: FukkiBiKeisanInput): FukkiBiKeisanResult {
  const birthDate = input.birthDate;
  const postnatalEnd = addDays(birthDate, POSTNATAL_LEAVE_DAYS);
  const ikukyuStart = addDays(postnatalEnd, 1);
  const postnatalSixWeekDate = addDays(birthDate, POSTNATAL_SIX_WEEK_DAYS);

  const principalEnd = attainDay(birthDate, LEAVE_PRINCIPAL_MONTHS);
  const extension18End = attainDay(birthDate, LEAVE_EXTENSION_1_MONTHS);
  const extension24End = attainDay(birthDate, LEAVE_EXTENSION_2_MONTHS);

  const deadlines: Deadline[] = [
    { key: "postnatalEnd", label: "産後休業終了日の目安", date: postnatalEnd },
    { key: "principal", label: "育休の原則終了日（1歳に達する日）", date: principalEnd },
    { key: "extension18", label: "育休延長①の期限（1歳6か月に達する日）", date: extension18End },
    { key: "extension24", label: "育休延長②の期限（2歳に達する日）", date: extension24End },
  ];

  const candidates: ReturnCandidate[] = [
    {
      key: "afterPostnatal",
      label: "産休明けすぐに復帰（育休を取らない）",
      returnDate: ikukyuStart,
      leave: null,
      requiresExtension: false,
      matchesIntent: false,
      nurseryCheckWindow: nurseryCheckWindow(ikukyuStart),
    },
    {
      key: "principal",
      label: "育休を原則どおり1歳まで取って復帰",
      returnDate: addDays(principalEnd, 1),
      leave: leaveRateBreakdown(ikukyuStart, principalEnd),
      requiresExtension: false,
      matchesIntent: input.extensionIntent === "none",
      nurseryCheckWindow: nurseryCheckWindow(principalEnd),
    },
    {
      key: "extension18",
      label: "1歳6か月まで延長して復帰",
      returnDate: addDays(extension18End, 1),
      leave: leaveRateBreakdown(ikukyuStart, extension18End),
      requiresExtension: true,
      matchesIntent: input.extensionIntent === "until18m",
      nurseryCheckWindow: nurseryCheckWindow(extension18End),
    },
    {
      key: "extension24",
      label: "2歳まで延長して復帰",
      returnDate: addDays(extension24End, 1),
      leave: leaveRateBreakdown(ikukyuStart, extension24End),
      requiresExtension: true,
      matchesIntent: input.extensionIntent === "until24m",
      nurseryCheckWindow: nurseryCheckWindow(extension24End),
    },
  ];

  return { birthDate, postnatalEnd, ikukyuStart, postnatalSixWeekDate, deadlines, candidates };
}
