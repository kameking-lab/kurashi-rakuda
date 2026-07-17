import { describe, expect, it } from "vitest";
import {
  addMonths,
  calcAgeInMonths,
  calcBasicAge,
  calcCorrectedAge,
  calcPrematureDays,
  daysInMonth,
  diffDays,
  isBirthDateTooOld,
  isDueDateFarFromBirth,
  isLeapYear,
  parseDate,
  validateBirthDate,
  type SimpleDate,
} from "@/components/tools/impl/Getsurei.calc";

/** 仕様書 specs/b-tools/17-age-in-months-calculator.md の「テストケース（12件）」を反映 */

function d(value: string): SimpleDate {
  const parsed = parseDate(value);
  if (!parsed) throw new Error(`invalid date in test: ${value}`);
  return parsed;
}

describe("Getsurei.calc — 仕様書テストケース表（12件）", () => {
  it("#1 生年月日=基準日 → 生後0日／0週0日／月齢0か月0日", () => {
    const result = calcBasicAge(d("2026-01-01"), d("2026-01-01"));
    expect(result.daysSinceBirth).toBe(0);
    expect(result.weeks).toBe(0);
    expect(result.weekRemainderDays).toBe(0);
    expect(result.months).toBe(0);
    expect(result.monthRemainderDays).toBe(0);
  });

  it("#2 生後7日 → 1週0日／月齢0か月7日", () => {
    const result = calcBasicAge(d("2026-01-01"), d("2026-01-08"));
    expect(result.daysSinceBirth).toBe(7);
    expect(result.weeks).toBe(1);
    expect(result.weekRemainderDays).toBe(0);
    expect(result.months).toBe(0);
    expect(result.monthRemainderDays).toBe(7);
  });

  it("#3 生後31日（同日応当）→ 4週3日／月齢1か月0日", () => {
    const result = calcBasicAge(d("2026-01-15"), d("2026-02-15"));
    expect(result.daysSinceBirth).toBe(31);
    expect(result.weeks).toBe(4);
    expect(result.weekRemainderDays).toBe(3);
    expect(result.months).toBe(1);
    expect(result.monthRemainderDays).toBe(0);
  });

  it("#4 1/31生まれ→2/28応当日クランプ、3/1で1か月1日", () => {
    const result = calcBasicAge(d("2026-01-31"), d("2026-03-01"));
    expect(result.daysSinceBirth).toBe(29);
    expect(result.weeks).toBe(4);
    expect(result.weekRemainderDays).toBe(1);
    expect(result.months).toBe(1);
    expect(result.monthRemainderDays).toBe(1);
  });

  it("#5 2025-02-28生まれ、ちょうど1年後 → 365日／52週1日／12か月0日", () => {
    const result = calcBasicAge(d("2025-02-28"), d("2026-02-28"));
    expect(result.daysSinceBirth).toBe(365);
    expect(result.weeks).toBe(52);
    expect(result.weekRemainderDays).toBe(1);
    expect(result.months).toBe(12);
    expect(result.monthRemainderDays).toBe(0);
  });

  it("#6 うるう年2/29生まれ、非うるう年2/28基準 → 12か月0日（2/28クランプ）", () => {
    const result = calcBasicAge(d("2024-02-29"), d("2025-02-28"));
    expect(result.daysSinceBirth).toBe(365);
    expect(result.weeks).toBe(52);
    expect(result.weekRemainderDays).toBe(1);
    expect(result.months).toBe(12);
    expect(result.monthRemainderDays).toBe(0);
  });

  it("#7 2か月早産（実齢3か月0日／修正月齢1か月0日／早産日数61日）", () => {
    const birth = d("2026-05-01");
    const base = d("2026-08-01");
    const due = d("2026-07-01");

    const actual = calcBasicAge(birth, base);
    expect(actual.months).toBe(3);
    expect(actual.monthRemainderDays).toBe(0);

    const corrected = calcCorrectedAge(due, base);
    expect(corrected).toEqual({ status: "calculated", months: 1, remainderDays: 0 });

    // 仕様書のロジック仕様「早産日数 = dueDate − birthDate」（単純な暦日差）に厳密に従うと
    // 2026-05-01 → 2026-07-01 は61日（5月31日+6月30日）。仕様書の期待値表記「30日」は
    // 「2か月早産」という月単位の目安表現と混同した誤記と判断し、ロジック仕様の式を優先する。
    expect(calcPrematureDays(birth, due)).toBe(61);
  });

  it("#8 出産予定日がまだ先 → 実齢1か月0日／修正月齢は予定日まであと31日", () => {
    const birth = d("2026-06-01");
    const base = d("2026-07-01");
    const due = d("2026-08-01");

    const actual = calcBasicAge(birth, base);
    expect(actual.months).toBe(1);
    expect(actual.monthRemainderDays).toBe(0);

    const corrected = calcCorrectedAge(due, base);
    expect(corrected).toEqual({ status: "not-yet", daysUntilDue: 31 });
  });

  it("#9 生年月日が基準日より未来 → 入力エラー", () => {
    const result = validateBirthDate(d("2026-08-01"), d("2026-07-17"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("生年月日は基準日より前の日付にしてください");
  });

  it("#10 生後2191日／313週0日／月齢72か月0日", () => {
    const result = calcBasicAge(d("2020-07-17"), d("2026-07-17"));
    expect(result.daysSinceBirth).toBe(2191);
    expect(result.weeks).toBe(313);
    expect(result.weekRemainderDays).toBe(0);
    expect(result.months).toBe(72);
    expect(result.monthRemainderDays).toBe(0);
  });

  it("#11 同月内 → 生後27日／3週6日／月齢0か月27日", () => {
    const result = calcBasicAge(d("2026-02-01"), d("2026-02-28"));
    expect(result.daysSinceBirth).toBe(27);
    expect(result.weeks).toBe(3);
    expect(result.weekRemainderDays).toBe(6);
    expect(result.months).toBe(0);
    expect(result.monthRemainderDays).toBe(27);
  });

  it("#12 予定日=生年月日=基準日 → 実齢・修正月齢とも0か月0日／早産日数0日", () => {
    const birth = d("2026-01-01");
    const base = d("2026-01-01");
    const due = d("2026-01-01");

    const actual = calcBasicAge(birth, base);
    expect(actual.months).toBe(0);
    expect(actual.monthRemainderDays).toBe(0);

    const corrected = calcCorrectedAge(due, base);
    expect(corrected).toEqual({ status: "calculated", months: 0, remainderDays: 0 });

    expect(calcPrematureDays(birth, due)).toBe(0);
  });
});

describe("Getsurei.calc — 補助関数", () => {
  it("isLeapYear: グレゴリオ暦のうるう年規則（4年ごと・100で割り切れる年は除外・400で割り切れる年は含む）", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });

  it("daysInMonth: 大の月・小の月・2月の平年/うるう年", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it("parseDate: 不正な形式・存在しない日付は null を返す", () => {
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("2026-07-17")).toEqual({ year: 2026, month: 7, day: 17 });
  });

  it("addMonths: 月末クランプ（1/31 + 1か月 = 2/28、+2か月 = 3/31に復帰）", () => {
    const jan31 = d("2026-01-31");
    expect(addMonths(jan31, 1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addMonths(jan31, 2)).toEqual({ year: 2026, month: 3, day: 31 });
  });

  it("addMonths: うるう年2/29生まれは非うるう年の応当月で2/28にクランプされる", () => {
    const feb29 = d("2024-02-29");
    expect(addMonths(feb29, 12)).toEqual({ year: 2025, month: 2, day: 28 });
    // うるう年をまたぐ場合は2/29が復活する
    expect(addMonths(feb29, 48)).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it("calcAgeInMonths: 年をまたぐ場合も暦月ベースで正しく計算する", () => {
    const result = calcAgeInMonths(d("2025-11-20"), d("2026-01-05"));
    expect(result.months).toBe(1);
    expect(result.remainderDays).toBe(16);
  });

  it("diffDays: 単純な暦日差（うるう年をまたいでも実日数で計算）", () => {
    expect(diffDays(d("2024-02-28"), d("2024-03-01"))).toBe(2);
    expect(diffDays(d("2023-02-28"), d("2023-03-01"))).toBe(1);
  });

  it("isDueDateFarFromBirth: 生年月日から+70日を超える差はソフト警告対象", () => {
    expect(isDueDateFarFromBirth(d("2026-01-01"), d("2026-03-10"))).toBe(false);
    expect(isDueDateFarFromBirth(d("2026-01-01"), d("2026-03-20"))).toBe(true);
  });

  it("isBirthDateTooOld: 基準日から120年を超えて古い生年月日は用途外案内の対象", () => {
    expect(isBirthDateTooOld(d("1920-01-01"), d("2026-07-17"))).toBe(false);
    expect(isBirthDateTooOld(d("1900-01-01"), d("2026-07-17"))).toBe(true);
  });

  it("validateBirthDate: 1900-01-01より前の生年月日はエラー", () => {
    const result = validateBirthDate(d("1899-12-31"), d("2026-07-17"));
    expect(result.ok).toBe(false);
  });

  it("validateBirthDate: 妥当な生年月日はエラーなし", () => {
    const result = validateBirthDate(d("2025-01-01"), d("2026-07-17"));
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
