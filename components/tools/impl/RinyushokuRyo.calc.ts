/**
 * 離乳食の量・固さ早見（Q3-07）— 純粋な日付演算・段階判定ロジック。
 * 仕様: specs/b-tools/19-baby-food-amount-guide.md
 *
 * データ本体（段階の定義・食品群別目安量・注意事項・出典）は
 * data/tables/rinyushoku-ryo.json を単一の情報源(SSOT)として import する。
 * 数値・文言が変わったら同JSONだけを更新すれば追随する。
 */
import table from "@/data/tables/rinyushoku-ryo.json";

export interface SimpleDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const DAYS_31 = new Set([1, 3, 5, 7, 8, 10, 12]);
const DAYS_30 = new Set([4, 6, 9, 11]);

/** うるう年判定（4で割り切れる年。ただし100で割り切れる年は除く。ただし400で割り切れる年は含む） */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 指定した年月の日数 */
export function daysInMonth(year: number, month: number): number {
  if (DAYS_31.has(month)) return 31;
  if (DAYS_30.has(month)) return 30;
  return isLeapYear(year) ? 29 : 28;
}

/** "YYYY-MM-DD" 形式の文字列をパースする。不正な形式・実在しない日付は null */
export function parseDate(value: string): SimpleDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** a と b の前後比較。a<b なら負、等しければ0、a>b なら正 */
export function compareDates(a: SimpleDate, b: SimpleDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function toEpochDay(d: SimpleDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

/** b − a の日数（暦日の単純差） */
export function diffDays(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

/**
 * 月齢の算出（仕様書 calcAgeMonths 準拠）。
 * 「生後◯ヶ月」は暦月で切り捨てて算出する（例: 生後6ヶ月20日 → 6ヶ月として扱う）。
 */
export function calcAgeMonths(birthDate: SimpleDate, today: SimpleDate): number {
  let months = (today.year - birthDate.year) * 12 + (today.month - birthDate.month);
  if (today.day < birthDate.day) months -= 1;
  return Math.max(months, 0);
}

/**
 * 週の早産分を月数に概算換算する（1ヶ月≈4.345週）。
 * weeksEarly が0以下（正期産・過期産）の場合は0を返す。
 */
export function calcMonthsEarlyFromWeeks(weeksEarly: number): number {
  if (weeksEarly <= 0) return 0;
  return Math.round(weeksEarly / 4.345);
}

/**
 * 修正月齢の算出（仕様書 calcCorrectedAgeMonths 準拠）。
 * gestationalWeeksAtBirth（出生時の在胎週数）が40週未満の分だけ、実齢月から差し引く。
 */
export function calcCorrectedAgeMonths(
  actualAgeMonths: number,
  gestationalWeeksAtBirth: number,
): number {
  const weeksEarly = 40 - gestationalWeeksAtBirth;
  const monthsEarly = calcMonthsEarlyFromWeeks(weeksEarly);
  return Math.max(actualAgeMonths - monthsEarly, 0);
}

/**
 * 出産予定日から修正月齢を算出する（UI入力の簡易版）。
 * 出産予定日 − 生年月日 の日数を週に換算したものが「早産週数」に等しい
 * （出産予定日は在胎40週の時点を表すため）。予定日が生年月日以前（正期産・過期産・過去入力ミス等）の場合は実齢をそのまま返す。
 */
export function calcCorrectedAgeMonthsFromDueDate(
  birthDate: SimpleDate,
  dueDate: SimpleDate,
  actualAgeMonths: number,
): number {
  const earlyDays = diffDays(birthDate, dueDate);
  if (earlyDays <= 0) return actualAgeMonths;
  const weeksEarly = earlyDays / 7;
  const monthsEarly = calcMonthsEarlyFromWeeks(weeksEarly);
  return Math.max(actualAgeMonths - monthsEarly, 0);
}

export type StageCode =
  | "STAGE_BEFORE"
  | "STAGE_GOKKUN"
  | "STAGE_MOGUMOGU"
  | "STAGE_KAMIKAMI"
  | "STAGE_PAKUPAKU"
  | "STAGE_AFTER";

const STAGE_ORDER: StageCode[] = [
  "STAGE_BEFORE",
  "STAGE_GOKKUN",
  "STAGE_MOGUMOGU",
  "STAGE_KAMIKAMI",
  "STAGE_PAKUPAKU",
  "STAGE_AFTER",
];

/** 各段階が開始する月齢（STAGE_BEFORE は 0 として扱う） */
const STAGE_START_MONTH: Record<StageCode, number> = {
  STAGE_BEFORE: 0,
  STAGE_GOKKUN: 5,
  STAGE_MOGUMOGU: 7,
  STAGE_KAMIKAMI: 9,
  STAGE_PAKUPAKU: 12,
  STAGE_AFTER: 19,
};

/** 離乳段階の判定（仕様書 determineStage 準拠） */
export function determineStage(ageMonths: number): StageCode {
  if (ageMonths < 5) return "STAGE_BEFORE";
  if (ageMonths <= 6) return "STAGE_GOKKUN";
  if (ageMonths <= 8) return "STAGE_MOGUMOGU";
  if (ageMonths <= 11) return "STAGE_KAMIKAMI";
  if (ageMonths <= 18) return "STAGE_PAKUPAKU";
  return "STAGE_AFTER";
}

export interface StageFoodGroups {
  grain: string;
  vegFruit: string;
  fish: string;
  meat: string;
  tofu: string;
  egg: string;
  dairy: string;
}

export interface StageTableEntry {
  code: StageCode;
  label: string;
  ageRangeLabel: string;
  mealsPerDay: string | null;
  textureLabel: string | null;
  message: string | null;
  foodGroups: StageFoodGroups | null;
}

const STAGES = table.stages as StageTableEntry[];

function getStageTableEntry(code: StageCode): StageTableEntry {
  const entry = STAGES.find((s) => s.code === code);
  if (!entry) throw new Error(`data/tables/rinyushoku-ryo.json に段階が見つかりません: ${code}`);
  return entry;
}

export interface NextStageInfo {
  stageCode: StageCode;
  label: string;
  monthsRemaining: number;
}

/**
 * 次の段階までの残り月数（境界が近い場合の簡易プレビュー表示用）。
 * 残り1ヶ月以内（例: ゴックン期の6ヶ月＝モグモグ期の目前）のときのみ返す。それ以外・次段階がない場合は null。
 */
export function calcNextStageInfo(ageMonths: number, stage: StageCode): NextStageInfo | null {
  const idx = STAGE_ORDER.indexOf(stage);
  const nextStage = STAGE_ORDER[idx + 1];
  if (!nextStage) return null;
  const nextStart = STAGE_START_MONTH[nextStage];
  const monthsRemaining = nextStart - ageMonths;
  if (monthsRemaining <= 0 || monthsRemaining > 1) return null;
  const nextEntry = getStageTableEntry(nextStage);
  return { stageCode: nextStage, label: nextEntry.label, monthsRemaining };
}

export interface RinyushokuInput {
  /** 生年月日（YYYY-MM-DD） */
  birthDate: string;
  /** 出産予定日（YYYY-MM-DD、任意）。入力があり早産だった場合のみ修正月齢を算出する */
  dueDate?: string;
  /** 基準日（YYYY-MM-DD）。未指定時は当日 */
  today?: string;
  /** 離乳食を開始済みか（デフォルト true） */
  weaningStarted?: boolean;
}

export interface RinyushokuResult {
  actualAgeMonths: number;
  correctedAgeMonths: number | null;
  usingCorrectedAge: boolean;
  weaningStarted: boolean;
  stage: StageTableEntry;
  nextStage: NextStageInfo | null;
}

export type RinyushokuCalcResult =
  | { ok: true; result: RinyushokuResult }
  | { ok: false; error: string };

const MAX_AGE_MONTHS_RANGE = 36;

/**
 * 離乳食の量・固さ早見の計算本体。
 * すべてクライアント内で完結する日付演算＋データ表の絞り込みのみを行い、
 * 医学的な適否判定（量が足りているか等）は一切行わない（YMYL配慮事項）。
 */
export function calculateRinyushokuRyo(input: RinyushokuInput): RinyushokuCalcResult {
  const birth = parseDate(input.birthDate);
  if (!birth) {
    return { ok: false, error: "生年月日をご確認ください" };
  }

  const todayStr = input.today ?? new Date().toISOString().slice(0, 10);
  const today = parseDate(todayStr);
  if (!today) {
    return { ok: false, error: "基準日の形式が正しくありません" };
  }

  if (compareDates(birth, today) > 0) {
    return { ok: false, error: "生年月日をご確認ください" };
  }

  const actualAgeMonths = calcAgeMonths(birth, today);
  if (actualAgeMonths > MAX_AGE_MONTHS_RANGE) {
    return { ok: false, error: "生年月日をご確認ください" };
  }

  let correctedAgeMonths: number | null = null;
  let usingCorrectedAge = false;
  if (input.dueDate && input.dueDate.trim() !== "") {
    const due = parseDate(input.dueDate);
    if (!due) {
      return { ok: false, error: "出産予定日をご確認ください" };
    }
    correctedAgeMonths = calcCorrectedAgeMonthsFromDueDate(birth, due, actualAgeMonths);
    usingCorrectedAge = true;
  }

  const weaningStarted = input.weaningStarted !== false;
  const judgingAgeMonths =
    usingCorrectedAge && correctedAgeMonths !== null ? correctedAgeMonths : actualAgeMonths;
  const stageCode: StageCode = weaningStarted ? determineStage(judgingAgeMonths) : "STAGE_BEFORE";
  const stage = getStageTableEntry(stageCode);
  const nextStage = weaningStarted ? calcNextStageInfo(judgingAgeMonths, stageCode) : null;

  return {
    ok: true,
    result: {
      actualAgeMonths,
      correctedAgeMonths,
      usingCorrectedAge,
      weaningStarted,
      stage,
      nextStage,
    },
  };
}

// UI・formula から参照するデータ表の付随情報
export const FOOD_GROUP_ORDER = table.foodGroupOrder as (keyof StageFoodGroups)[];
export const FOOD_GROUP_LABELS = table.foodGroupLabels as Record<keyof StageFoodGroups, string>;
export const PROTEIN_NOTE = table.proteinNote;
export const COMMON_NOTES = table.commonNotes as { title: string; content: string }[];
export const RINYUSHOKU_DISCLAIMER = table.disclaimer;
export const RINYUSHOKU_PREMATURE_DISCLAIMER = table.prematureDisclaimer;
export const RINYUSHOKU_SOURCE = table.source;
