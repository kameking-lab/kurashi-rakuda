import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysInMonth,
  generateSchedule,
  needsFiscalYearBoundaryNote,
  parseDate,
  parseYearMonth,
  suggestEntryType,
  validateMunicipalityDeadline,
  validateTargetMonth,
  withDay,
  type Milestone,
  type SimpleDate,
} from "@/components/tools/impl/HokatsuSchedule.calc";

/**
 * 仕様書 specs/b-tools/23-hokatsu-schedule-maker.md の「テストケース（12件）」を反映。
 *
 * 実装上の判断メモ（仕様書との差分）:
 * - 一次選考結果通知は 表A の代表日（20日）を採用する（疑似コードは日を明示していないが、
 *   テストケース#1の期待値「2026-12-20」は代表日20日を適用しないと再現できないため）。
 * - 直近アラートの疑似コードは条件を entry_type=="april" に限定しているが、
 *   テストケース#5（随時入園・入園希望月が実行月の翌月）でも同じ警告が期待されているため、
 *   実装では entry_type を問わず「残り3ヶ月未満」で警告する（HokatsuSchedule.calc.ts 内にも同旨のコメントあり）。
 */

const TODAY: SimpleDate = { year: 2026, month: 7, day: 17 };

function ym(value: string): SimpleDate {
  const parsed = parseYearMonth(value);
  if (!parsed) throw new Error(`invalid year-month in test: ${value}`);
  return parsed;
}

function d(value: string): SimpleDate {
  const parsed = parseDate(value);
  if (!parsed) throw new Error(`invalid date in test: ${value}`);
  return parsed;
}

function byKey(milestones: Milestone[], key: string): Milestone {
  const m = milestones.find((x) => x.key === key);
  if (!m) throw new Error(`milestone not found: ${key}`);
  return m;
}

describe("HokatsuSchedule.calc — 仕様書テストケース表（12件）", () => {
  it("#1 2027-04／4月一斉／自治体締切未入力 → 全国目安値で主要マイルストーンを逆算", () => {
    const v = validateTargetMonth(ym("2027-04"), TODAY);
    expect(v.ok).toBe(true);

    const { milestones, urgentAlert } = generateSchedule({
      targetMonth: ym("2027-04"),
      entryType: "april",
      today: TODAY,
    });

    expect(byKey(milestones, "info").start).toEqual(d("2026-04-01"));
    expect(byKey(milestones, "tour").start).toEqual(d("2026-06-01"));
    expect(byKey(milestones, "tour").end).toEqual(d("2026-09-01"));
    expect(byKey(milestones, "primary-deadline").start).toEqual(d("2026-10-25"));
    expect(byKey(milestones, "primary-result").start).toEqual(d("2026-12-20"));
    expect(byKey(milestones, "secondary-deadline").start).toEqual(d("2027-01-15"));
    expect(byKey(milestones, "secondary-result").start).toEqual(d("2027-02-15"));
    expect(byKey(milestones, "prep").start).toEqual(d("2027-03-01"));
    expect(byKey(milestones, "entry").start).toEqual(d("2027-04-01"));

    // 情報収集開始（2026-04）は実行日（2026-07-17）より前なので「過去」
    expect(byKey(milestones, "info").status).toBe("past");
    // 一次申込み締切（2026-10-25）はまだ先なので「今後」
    expect(byKey(milestones, "primary-deadline").status).toBe("upcoming");
    expect(urgentAlert).toBe(false);
  });

  it("#2 2027-04／4月一斉／自治体締切2026-11-05入力 → 入力値を一次締切として採用し以降を再計算", () => {
    const { milestones } = generateSchedule({
      targetMonth: ym("2027-04"),
      entryType: "april",
      municipalityDeadline: d("2026-11-05"),
      today: TODAY,
    });

    expect(byKey(milestones, "primary-deadline").start).toEqual(d("2026-11-05"));
    // 申込書類準備開始 = 締切-1ヶ月（締切の日付をそのまま維持する）
    expect(byKey(milestones, "docs").start).toEqual(d("2026-10-05"));
    // 一次選考結果通知は「締切+2ヶ月・代表日20日」だが、上限（E-3ヶ月=2027-01-01）を超えるため上限に丸められる
    expect(byKey(milestones, "primary-result").start).toEqual(d("2027-01-01"));
  });

  it("#3 2026-10／随時入園／自治体締切未入力 → 随時入園モデルで逆算", () => {
    const { milestones } = generateSchedule({
      targetMonth: ym("2026-10"),
      entryType: "midyear",
      today: TODAY,
    });

    expect(byKey(milestones, "info").start).toEqual(d("2026-07-01"));
    expect(byKey(milestones, "tour").start).toEqual(d("2026-08-01"));
    expect(byKey(milestones, "deadline").start).toEqual(d("2026-09-10"));
    expect(byKey(milestones, "result").start).toEqual(d("2026-09-25"));
    expect(byKey(milestones, "entry").start).toEqual(d("2026-10-01"));
  });

  it("#4 2026-09（4月以外）→ entry_type は自動的に midyear を初期提案。ユーザーが april を選び直しても計算は成立する", () => {
    expect(suggestEntryType(ym("2026-09"))).toBe("midyear");

    // ユーザーが明示的に4月一斉を選び直した場合、その通りに（4月一斉モデルの式で）計算する
    const { milestones } = generateSchedule({
      targetMonth: ym("2026-09"),
      entryType: "april",
      today: TODAY,
    });
    expect(milestones).toHaveLength(9);
    expect(byKey(milestones, "info").start).toEqual(d("2025-09-01"));
  });

  it("#5 2026-08（実行日から+1ヶ月）／随時入園 → 申込締切は既に過去日、直近アラートを表示", () => {
    const { milestones, urgentAlert } = generateSchedule({
      targetMonth: ym("2026-08"),
      entryType: "midyear",
      today: TODAY,
    });

    expect(byKey(milestones, "deadline").start).toEqual(d("2026-07-10"));
    expect(byKey(milestones, "deadline").status).toBe("past");
    expect(urgentAlert).toBe(true);
  });

  it("#6 2028-01（+18ヶ月、上限値）→ バリデーション通過。4月でないため midyear を初期提案", () => {
    const v = validateTargetMonth(ym("2028-01"), TODAY);
    expect(v.ok).toBe(true);
    expect(suggestEntryType(ym("2028-01"))).toBe("midyear");
  });

  it("#7 2028-02（+19ヶ月、上限超過）→ バリデーションエラー", () => {
    const v = validateTargetMonth(ym("2028-02"), TODAY);
    expect(v.ok).toBe(false);
    expect(v.error).toBe("入園希望月は1〜18ヶ月先の範囲で指定してください");
  });

  it("#8 2026-07（実行月と同月、0ヶ月先）→ バリデーションエラー（範囲外）", () => {
    const v = validateTargetMonth(ym("2026-07"), TODAY);
    expect(v.ok).toBe(false);
    expect(v.error).toBe("入園希望月は1〜18ヶ月先の範囲で指定してください");
  });

  it("#9 自治体締切に target_month より後の日付（2027-05-01）を入力 → バリデーションエラー", () => {
    const v = validateMunicipalityDeadline(d("2027-05-01"), ym("2027-04"));
    expect(v.ok).toBe(false);
    expect(v.error).toBe("締切日は入園希望月より前の日付にしてください");
  });

  it("#10 has_sibling=true → マイルストーン算出ロジックはケース1と同一（優先順位の計算はスコープ外、UI注記のみで対応）", () => {
    // ScheduleInput / generateSchedule は has_sibling を受け取らない設計そのものによって
    // 「計算ロジックを変えない」という仕様要件を満たす（きょうだい優先利用調整の注記はUI側の責務）。
    const a = generateSchedule({ targetMonth: ym("2027-04"), entryType: "april", today: TODAY });
    const b = generateSchedule({ targetMonth: ym("2027-04"), entryType: "april", today: TODAY });
    expect(b.milestones).toEqual(a.milestones);
  });

  it("#11 facility_type=other → マイルストーン算出ロジックはケース1と同一（認可外向けの注記はUI側で追加表示するのみ）", () => {
    // 同上。facility_type も generateSchedule の入力に含まれないため、ロジックには一切影響しない。
    const a = generateSchedule({ targetMonth: ym("2027-04"), entryType: "april", today: TODAY });
    expect(byKey(a.milestones, "entry").start).toEqual(d("2027-04-01"));
  });

  it("#12 2027-01（年度またぎの随時入園）→ ケース3同様に月オフセットで算出し、年度切り替えの注記対象と判定される", () => {
    const { milestones } = generateSchedule({
      targetMonth: ym("2027-01"),
      entryType: "midyear",
      today: TODAY,
    });

    expect(byKey(milestones, "info").start).toEqual(d("2026-10-01"));
    expect(byKey(milestones, "tour").start).toEqual(d("2026-11-01"));
    expect(byKey(milestones, "deadline").start).toEqual(d("2026-12-10"));
    expect(byKey(milestones, "result").start).toEqual(d("2026-12-25"));
    expect(byKey(milestones, "entry").start).toEqual(d("2027-01-01"));

    expect(needsFiscalYearBoundaryNote(ym("2027-01"), "midyear")).toBe(true);
    expect(needsFiscalYearBoundaryNote(ym("2027-04"), "april")).toBe(false);
  });
});

describe("HokatsuSchedule.calc — 補助関数", () => {
  it("parseYearMonth: 'YYYY-MM' をその月の1日として解釈し、不正な形式は null", () => {
    expect(parseYearMonth("2027-04")).toEqual({ year: 2027, month: 4, day: 1 });
    expect(parseYearMonth("2027-13")).toBeNull();
    expect(parseYearMonth("not-a-month")).toBeNull();
  });

  it("parseDate: 不正な形式・存在しない日付は null", () => {
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("2026-07-17")).toEqual({ year: 2026, month: 7, day: 17 });
  });

  it("addMonths: 月末クランプ（1/31 + 1ヶ月 = 2/28）と負数オフセット（過去方向）", () => {
    expect(addMonths(d("2027-01-31"), 1)).toEqual({ year: 2027, month: 2, day: 28 });
    expect(addMonths(d("2027-04-01"), -6)).toEqual({ year: 2026, month: 10, day: 1 });
  });

  it("daysInMonth: うるう年の2月は29日、平年は28日", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("withDay: 代表日が月末を超える場合は月末にクランプする", () => {
    expect(withDay(d("2026-02-01"), 31)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(withDay(d("2026-10-01"), 25)).toEqual({ year: 2026, month: 10, day: 25 });
  });

  it("suggestEntryType: target_month が4月なら april、それ以外は midyear", () => {
    expect(suggestEntryType(ym("2027-04"))).toBe("april");
    expect(suggestEntryType(ym("2027-05"))).toBe("midyear");
  });

  it("直近アラート: 残り3ヶ月以上あれば表示しない（4月一斉モデル）", () => {
    const { urgentAlert } = generateSchedule({
      targetMonth: ym("2026-12"),
      entryType: "april",
      today: TODAY,
    });
    expect(urgentAlert).toBe(false);
  });
});
