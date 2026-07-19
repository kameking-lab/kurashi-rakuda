/**
 * 月齢計算（Q3-05）— 純粋な日付演算ロジック。
 * 仕様: specs/b-tools/17-age-in-months-calculator.md
 *
 * すべて実在の暦（グレゴリオ暦）上の日付演算。UIから独立したテスト可能な純関数として提供する。
 */

// 暦日演算は共通土台 lib/tools/date.ts に集約（診断 A-12: SimpleDate 系15重実装の統合）
import {
  type SimpleDate,
  isLeapYear, daysInMonth, parseDate, diffDays, compareDates, addDays, addMonths,
} from "@/lib/tools/date";
export type { SimpleDate };
export { isLeapYear, daysInMonth, parseDate, diffDays, compareDates, addDays, addMonths };

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
