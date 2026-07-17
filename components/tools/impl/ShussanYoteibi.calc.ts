/*
 * 出産予定日・妊娠週数計算（Q3-01）— 計算ロジック（純関数）。
 * 仕様: specs/b-tools/01-due-date-pregnancy-week-calculator.md
 *
 * 医学的判断（診断・受診の要否・健康状態の評価）は一切含まない。
 * 行うのは「最終月経開始日（LMP）を起点にした日付の加減算」のみ（ネーゲレ概算法）。
 * すべて YYYY-MM-DD の文字列で入出力し、内部では Date.UTC ベースの
 * 「1970-01-01からの経過日数（整数）」に変換して演算することでタイムゾーン依存を排除する。
 */

const MS_PER_DAY = 86_400_000;

/** YYYY-MM-DD → 1970-01-01 からの経過日数（整数・UTC基準） */
function toEpochDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** 経過日数（UTC基準） → YYYY-MM-DD */
function fromEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD に日数を加算（負数で減算）した YYYY-MM-DD を返す */
export function addDays(iso: string, days: number): string {
  return fromEpochDay(toEpochDay(iso) + days);
}

/** a − b の日数差（整数。a が後なら正） */
export function diffInDays(a: string, b: string): number {
  return toEpochDay(a) - toEpochDay(b);
}

/** 実行時の「今日」を YYYY-MM-DD で返す（ユーザーのローカル日付基準）。UIからのみ呼び出す */
export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → 「2026年10月8日」表記 */
export function formatJapaneseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export interface DueDateResult {
  /** 出産予定日（YYYY-MM-DD） */
  dueDate: string;
  /** 周期補正日数（cycleLength − 28）。既定周期なら0 */
  correctionDays: number;
}

/**
 * ネーゲレ概算法による出産予定日の算出。
 * EDD = LMP + 280日 + (cycleLength − 28)日
 */
export function calcDueDate(
  lastPeriodStart: string,
  cycleLength: number = 28,
): DueDateResult {
  const correctionDays = cycleLength - 28;
  return {
    dueDate: addDays(lastPeriodStart, 280 + correctionDays),
    correctionDays,
  };
}

export interface GestationalWeekResult {
  /** 基準日とLMPの経過日数 */
  diffDays: number;
  weeks: number;
  days: number;
  /** 「12週6日」形式の表示文字列 */
  label: string;
}

/**
 * 基準日時点の妊娠週数・日数。
 * weeks = floor(diffDays / 7), days = diffDays mod 7
 */
export function calcGestationalWeek(
  lastPeriodStart: string,
  baseDate: string,
): GestationalWeekResult {
  const diffDays = diffInDays(baseDate, lastPeriodStart);
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays - weeks * 7;
  return { diffDays, weeks, days, label: `${weeks}週${days}日` };
}

/**
 * 妊娠月数（「妊娠◯ヶ月」表記）。
 * weeks <= 39 の範囲でのみ 1〜10ヶ月を返し、それを超える場合は null（月数表示なし）。
 */
export function calcPregnancyMonth(weeks: number): number | null {
  if (weeks < 0 || weeks > 39) return null;
  return Math.floor(weeks / 4) + 1;
}

export type PregnancyPeriod = "初期" | "中期" | "後期";

/**
 * 妊娠期（日本産科婦人科学会の用語定義）。
 * 初期: 〜13週6日（diffDays<=97）／中期: 14週0日〜27週6日（diffDays<=195）／後期: 28週0日〜
 */
export function calcPregnancyPeriod(diffDays: number): PregnancyPeriod {
  if (diffDays <= 97) return "初期";
  if (diffDays <= 195) return "中期";
  return "後期";
}

export interface RemainingDaysResult {
  /** 残り日数の絶対値 */
  remainingDays: number;
  /** true なら出産予定日を経過済み */
  overdue: boolean;
}

/** 出産予定日までの残り日数（負の場合は経過日数の絶対値＋overdue=true） */
export function calcRemainingDays(
  dueDate: string,
  baseDate: string,
): RemainingDaysResult {
  const diff = diffInDays(dueDate, baseDate);
  return { remainingDays: Math.abs(diff), overdue: diff < 0 };
}

export interface ShussanYoteibiInput {
  /** 最終月経開始日（YYYY-MM-DD）。必須 */
  lmp: string;
  /** 平均月経周期日数。既定28、有効範囲20〜45 */
  cycleLength?: number;
  /** 基準日（YYYY-MM-DD）。既定は呼び出し側が todayISO() を渡す */
  baseDate: string;
  /** 医師から伝えられた出産予定日（YYYY-MM-DD）。指定時はネーゲレ概算法をスキップ */
  knownEdd?: string;
}

export interface ShussanYoteibiResult {
  ok: true;
  /** 出産予定日（YYYY-MM-DD） */
  dueDate: string;
  /** 週数計算に用いた実効LMP（knownEdd指定時は逆算値） */
  effectiveLmp: string;
  /** 周期補正日数（knownEdd指定時は常に0） */
  correctionDays: number;
  diffDays: number;
  weeks: number;
  days: number;
  weeksLabel: string;
  month: number | null;
  period: PregnancyPeriod;
  remainingDays: number;
  overdue: boolean;
  /** 出産予定日を42週0日（294日）超過している場合の注意フラグ */
  pastDueDateNotice: boolean;
}

export interface ShussanYoteibiError {
  ok: false;
  message: string;
}

/** "YYYY-MM-DD" 形式で実在する日付か（2/30 や "abc" を NaN のまま通さない） */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** 入力バリデーション。問題なければ null、エラーならメッセージを返す */
export function validateShussanYoteibiInput(
  input: ShussanYoteibiInput,
): string | null {
  if (!input.lmp || !isValidDateString(input.lmp)) {
    return "最終月経開始日を正しい日付で入力してください";
  }
  if (!input.baseDate || !isValidDateString(input.baseDate)) {
    return "基準日を正しい日付で入力してください";
  }
  const cycleLength = input.cycleLength ?? 28;
  if (!Number.isInteger(cycleLength) || cycleLength < 20 || cycleLength > 45) {
    return "周期日数は20〜45の整数で入力してください";
  }
  if (diffInDays(input.baseDate, input.lmp) < 0) {
    return "基準日は最終月経開始日より後の日付を指定してください";
  }
  if (diffInDays(input.baseDate, input.lmp) >= 330) {
    return "入力範囲外です。日付をご確認ください";
  }
  return null;
}

/**
 * 出産予定日・妊娠週数計算のオーケストレーター。
 * knownEdd が指定された場合はネーゲレ概算法の計算をスキップし、
 * LMP' = knownEdd − 280日 を逆算して週数計算のみに用いる。
 */
export function calcShussanYoteibi(
  input: ShussanYoteibiInput,
): ShussanYoteibiResult | ShussanYoteibiError {
  const validationMessage = validateShussanYoteibiInput(input);
  if (validationMessage) {
    return { ok: false, message: validationMessage };
  }

  const cycleLength = input.cycleLength ?? 28;
  const { dueDate, correctionDays } = input.knownEdd
    ? { dueDate: input.knownEdd, correctionDays: 0 }
    : calcDueDate(input.lmp, cycleLength);

  const effectiveLmp = input.knownEdd
    ? addDays(input.knownEdd, -280)
    : input.lmp;

  const gestational = calcGestationalWeek(effectiveLmp, input.baseDate);
  const month = calcPregnancyMonth(gestational.weeks);
  const period = calcPregnancyPeriod(gestational.diffDays);
  const remaining = calcRemainingDays(dueDate, input.baseDate);

  return {
    ok: true,
    dueDate,
    effectiveLmp,
    correctionDays,
    diffDays: gestational.diffDays,
    weeks: gestational.weeks,
    days: gestational.days,
    weeksLabel: gestational.label,
    month,
    period,
    remainingDays: remaining.remainingDays,
    overdue: remaining.overdue,
    pastDueDateNotice: gestational.diffDays > 294,
  };
}
