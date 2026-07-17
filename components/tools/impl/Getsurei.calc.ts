/**
 * 月齢計算（Q3-05）— 純粋な日付演算ロジック。
 * 仕様: specs/b-tools/17-age-in-months-calculator.md
 *
 * すべて実在の暦（グレゴリオ暦）上の日付演算。UIから独立したテスト可能な純関数として提供する。
 */

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

function toEpochDay(d: SimpleDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

/** b − a の日数（暦日の単純差） */
export function diffDays(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

/** a と b の前後比較。a<b なら負、等しければ0、a>b なら正 */
export function compareDates(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

/** date の n 日後の日付 */
export function addDays(date: SimpleDate, n: number): SimpleDate {
  const d = new Date((toEpochDay(date) + n) * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * date から n か月後の日付（応当日方式・月末クランプ）。
 * 応当日が存在しない月（例: 1/31 生まれの2月）はその月の末日にクランプする。
 */
export function addMonths(date: SimpleDate, n: number): SimpleDate {
  const idx = date.year * 12 + (date.month - 1) + n;
  const y = Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12 + 1;
  const d = Math.min(date.day, daysInMonth(y, m));
  return { year: y, month: m, day: d };
}

export interface AgeInMonths {
  months: number;
  remainderDays: number;
}

/**
 * 暦月ベース・応当日方式の月齢計算。baseDate >= birthDate が前提。
 * 「◯か月」は生まれた日と同じ日（応当日）を迎えるたびに1ヶ月、という数え方。
 */
export function calcAgeInMonths(birthDate: SimpleDate, baseDate: SimpleDate): AgeInMonths {
  let months = 0;
  while (compareDates(addMonths(birthDate, months + 1), baseDate) <= 0) {
    months += 1;
  }
  const remainderDays = diffDays(addMonths(birthDate, months), baseDate);
  return { months, remainderDays };
}

export interface BasicAgeResult {
  daysSinceBirth: number;
  weeks: number;
  weekRemainderDays: number;
  months: number;
  monthRemainderDays: number;
}

/** 生後日数・生後週数・月齢をまとめて計算する */
export function calcBasicAge(birthDate: SimpleDate, baseDate: SimpleDate): BasicAgeResult {
  const daysSinceBirth = diffDays(birthDate, baseDate);
  const weeks = Math.floor(daysSinceBirth / 7);
  const weekRemainderDays = daysSinceBirth % 7;
  const { months, remainderDays } = calcAgeInMonths(birthDate, baseDate);
  return {
    daysSinceBirth,
    weeks,
    weekRemainderDays,
    months,
    monthRemainderDays: remainderDays,
  };
}

export type CorrectedAgeResult =
  | { status: "calculated"; months: number; remainderDays: number }
  | { status: "not-yet"; daysUntilDue: number };

/**
 * 修正月齢（早産児向け）。出産予定日を起点に calcAgeInMonths と同じロジックを適用する。
 * 基準日が予定日にまだ達していない場合は「予定日まであと◯日」を返す。
 */
export function calcCorrectedAge(dueDate: SimpleDate, baseDate: SimpleDate): CorrectedAgeResult {
  if (compareDates(baseDate, dueDate) >= 0) {
    const { months, remainderDays } = calcAgeInMonths(dueDate, baseDate);
    return { status: "calculated", months, remainderDays };
  }
  return { status: "not-yet", daysUntilDue: diffDays(baseDate, dueDate) };
}

/** 早産日数 = 出産予定日 − 生年月日（dueDate >= birthDate が前提。0以上の値を返す） */
export function calcPrematureDays(birthDate: SimpleDate, dueDate: SimpleDate): number {
  return diffDays(birthDate, dueDate);
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const MIN_BIRTH_DATE: SimpleDate = { year: 1900, month: 1, day: 1 };

/** 生年月日のバリデーション（基準日以前・1900-01-01以降であること） */
export function validateBirthDate(birthDate: SimpleDate, baseDate: SimpleDate): ValidationResult {
  if (compareDates(birthDate, baseDate) > 0) {
    return { ok: false, error: "生年月日は基準日より前の日付にしてください" };
  }
  if (compareDates(birthDate, MIN_BIRTH_DATE) < 0) {
    return { ok: false, error: "生年月日は1900年1月1日以降の日付にしてください" };
  }
  return { ok: true };
}

/** 出産予定日のソフトバリデーション。生年月日から+70日を超える差は注意表示（エラーにはしない） */
export function isDueDateFarFromBirth(birthDate: SimpleDate, dueDate: SimpleDate): boolean {
  return diffDays(birthDate, dueDate) > 70;
}

/** 生年月日が基準日から120年を超えて古いかどうか（用途外の案内表示に使う） */
export function isBirthDateTooOld(birthDate: SimpleDate, baseDate: SimpleDate): boolean {
  return compareDates(baseDate, addMonths(birthDate, 120 * 12)) > 0;
}

export interface Milestone {
  label: string;
  date: SimpleDate;
  /** baseDate から見た残り日数。負の値は経過済みを表す */
  daysRemaining: number;
}

/** 節目（生後100日・ハーフバースデー・満1歳）までの日数（参考表示用） */
export function calcMilestones(birthDate: SimpleDate, baseDate: SimpleDate): Milestone[] {
  const hundredDays = addDays(birthDate, 100);
  const halfBirthday = addMonths(birthDate, 6);
  const firstBirthday = addMonths(birthDate, 12);
  return [
    { label: "生後100日", date: hundredDays, daysRemaining: diffDays(baseDate, hundredDays) },
    {
      label: "ハーフバースデー（生後6か月）",
      date: halfBirthday,
      daysRemaining: diffDays(baseDate, halfBirthday),
    },
    { label: "満1歳", date: firstBirthday, daysRemaining: diffDays(baseDate, firstBirthday) },
  ];
}
