import { describe, expect, it } from "vitest";
import {
  calcYuukyuuFuyoNissuu,
  parseDate,
  addMonths,
  compareDates,
  diffDays,
  validateHireDate,
  buildSchedule,
  findCurrentAndNext,
  grantDaysForRow,
  isSubjectToMandatory5Days,
  MANDATORY_5DAYS_THRESHOLD,
  MANDATORY_5DAYS_REQUIRED_DAYS,
  FIRST_GRANT_DAYS,
  MAX_GRANT_DAYS,
  ELIGIBLE_CONTINUOUS_SERVICE_MONTHS,
  ELIGIBLE_ATTENDANCE_RATE,
} from "@/components/tools/impl/YuukyuuFuyoNissuuKijun.calc";

/*
 * 有給残・取得計画（P3-T02）のテスト。
 * テストケース表は specs/b-tools/p3-t02-yuukyuu-fuyo-nissuu-kijun.md と対応する。
 * 制度事実は data/seido/yuukyuu-fuyo-nissuu-kijun.json を正とする。
 * 期待値はデータファイルの standardGrantTable.rows / proportionalGrant.table.rows を
 * そのまま転記したもの（本テストでは数値が壊れずに反映されることを確認する）。
 */

describe("日付ユーティリティ", () => {
  it("parseDateは不正な暦日にnullを返す（2026-02-30は存在しない）", () => {
    expect(parseDate("2026-02-30")).toBeNull();
  });

  it("parseDateは不正な形式にnullを返す", () => {
    expect(parseDate("2026/07/18")).toBeNull();
  });

  it("parseDateは正しい日付をパースする", () => {
    expect(parseDate("2026-07-18")).toEqual({ y: 2026, m: 7, d: 18 });
  });

  it("addMonthsは月末クランプする（1/31の7か月後は8/31だが、8/31の6か月後は2月末）", () => {
    expect(addMonths({ y: 2026, m: 8, d: 31 }, 6)).toEqual({ y: 2027, m: 2, d: 28 });
  });

  it("addMonthsはうるう年の2/29を非うるう年では2/28にクランプする", () => {
    expect(addMonths({ y: 2024, m: 2, d: 29 }, 12)).toEqual({ y: 2025, m: 2, d: 28 });
  });

  it("compareDates/diffDaysは前後関係・日数差を正しく返す", () => {
    const a = { y: 2026, m: 7, d: 1 };
    const b = { y: 2026, m: 7, d: 10 };
    expect(compareDates(a, b)).toBeLessThan(0);
    expect(diffDays(a, b)).toBe(9);
  });
});

describe("validateHireDate", () => {
  it("1950-01-01は範囲内（下限境界値）", () => {
    expect(validateHireDate({ y: 1950, m: 1, d: 1 }).ok).toBe(true);
  });

  it("1949-12-31は範囲外（下限未満）", () => {
    expect(validateHireDate({ y: 1949, m: 12, d: 31 }).ok).toBe(false);
  });

  it("2100-12-31は範囲内（上限境界値）", () => {
    expect(validateHireDate({ y: 2100, m: 12, d: 31 }).ok).toBe(true);
  });

  it("2101-01-01は範囲外（上限超）", () => {
    expect(validateHireDate({ y: 2101, m: 1, d: 1 }).ok).toBe(false);
  });
});

describe("grantDaysForRow / isSubjectToMandatory5Days（区分ごとの付与日数）", () => {
  it("標準（フルタイム）: index0（6か月）は10日・義務対象", () => {
    expect(grantDaysForRow("standard", 0)).toBe(FIRST_GRANT_DAYS);
    expect(isSubjectToMandatory5Days("standard", 0)).toBe(true);
  });

  it("標準（フルタイム）: index6（6年6か月以上）は上限20日", () => {
    expect(grantDaysForRow("standard", 6)).toBe(MAX_GRANT_DAYS);
  });

  it("週4日: index3（3年6か月）で10日に達し、そこから義務対象になる", () => {
    expect(grantDaysForRow("days4", 3)).toBe(10);
    expect(isSubjectToMandatory5Days("days4", 3)).toBe(true);
    expect(grantDaysForRow("days4", 2)).toBe(9);
    expect(isSubjectToMandatory5Days("days4", 2)).toBe(false);
  });

  it("週3日: index5（5年6か月）で10日に達し、そこから義務対象になる", () => {
    expect(grantDaysForRow("days3", 5)).toBe(10);
    expect(isSubjectToMandatory5Days("days3", 5)).toBe(true);
    expect(grantDaysForRow("days3", 4)).toBe(9);
    expect(isSubjectToMandatory5Days("days3", 4)).toBe(false);
  });

  it("週2日: 6年6か月以上でも最大7日で、義務対象にはならない", () => {
    expect(grantDaysForRow("days2", 6)).toBe(7);
    expect(isSubjectToMandatory5Days("days2", 6)).toBe(false);
  });

  it("週1日: 6年6か月以上でも最大3日で、義務対象にはならない", () => {
    expect(grantDaysForRow("days1", 6)).toBe(3);
    expect(isSubjectToMandatory5Days("days1", 6)).toBe(false);
  });
});

describe("buildSchedule / findCurrentAndNext（基準日スケジュール）", () => {
  const hireDate = { y: 2026, m: 1, d: 1 };

  it("スケジュールは常に7区分を返す", () => {
    const schedule = buildSchedule(hireDate, "standard", { y: 2026, m: 7, d: 1 });
    expect(schedule).toHaveLength(7);
  });

  it("6か月経過日は雇入れ日の6か月後（2026-01-01 → 2026-07-01）", () => {
    const schedule = buildSchedule(hireDate, "standard", { y: 2026, m: 7, d: 1 });
    expect(schedule[0]!.basisDate).toEqual({ y: 2026, m: 7, d: 1 });
  });

  it("6年6か月以上の基準日は雇入れ日の78か月後（2026-01-01 → 2032-07-01）", () => {
    const schedule = buildSchedule(hireDate, "standard", { y: 2026, m: 7, d: 1 });
    expect(schedule[6]!.basisDate).toEqual({ y: 2032, m: 7, d: 1 });
  });

  it("基準日ちょうど（境界値）はその区分に到達済みとして扱う", () => {
    const schedule = buildSchedule(hireDate, "standard", { y: 2026, m: 7, d: 1 });
    const { reachedCount, current, next } = findCurrentAndNext(schedule, { y: 2026, m: 7, d: 1 });
    expect(reachedCount).toBe(1);
    expect(current?.grantDays).toBe(10);
    expect(next.grantDays).toBe(11);
    expect(next.serviceLabel).toBe("1年6か月");
  });

  it("基準日の前日（境界値）はまだ到達していない", () => {
    const schedule = buildSchedule(hireDate, "standard", { y: 2026, m: 6, d: 30 });
    const { reachedCount, current } = findCurrentAndNext(schedule, { y: 2026, m: 6, d: 30 });
    expect(reachedCount).toBe(0);
    expect(current).toBeNull();
  });

  it("6年6か月をちょうど1年超えると、付与日数据え置きのまま次の周期に入る（extraYearsBeyondCap=1）", () => {
    const schedule = buildSchedule(hireDate, "standard", { y: 2033, m: 7, d: 1 });
    const { current, next } = findCurrentAndNext(schedule, { y: 2033, m: 7, d: 1 });
    expect(current?.extraYearsBeyondCap).toBe(1);
    expect(current?.grantDays).toBe(20);
    expect(next.basisDate).toEqual({ y: 2034, m: 7, d: 1 });
    expect(next.extraYearsBeyondCap).toBe(2);
  });
});

describe("calcYuukyuuFuyoNissuu（総合）", () => {
  it("正常系: フルタイム・6か月経過日ちょうどは10日付与・義務対象", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "standard", true, "2026-07-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligible).toBe(true);
    expect(r.current?.grantDays).toBe(10);
    expect(r.current?.subjectToMandatory5Days).toBe(true);
    expect(r.currentGrantWithheld).toBe(false);
  });

  it("正常系: 6か月経過前は未発生（発生要件①未達）", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "standard", true, "2026-06-30");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligible).toBe(false);
    expect(r.current).toBeNull();
    expect(r.daysUntilFirstEligible).toBe(1);
  });

  it("出勤率8割未満の場合は、到達済みでも今回の付与は行われない扱いになる", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "standard", false, "2026-07-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligible).toBe(true);
    expect(r.currentGrantWithheld).toBe(true);
    // current.grantDays自体は「本来の区分の日数」を保持する（0にはしない。UI側で withheld を見て扱う）
    expect(r.current?.grantDays).toBe(10);
  });

  it("週4日勤務・3年6か月経過日は10日付与・義務対象", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "days4", true, "2029-07-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isStandard).toBe(false);
    expect(r.current?.grantDays).toBe(10);
    expect(r.current?.subjectToMandatory5Days).toBe(true);
  });

  it("週2日勤務は6年6か月以上でも義務対象にならない（最大7日）", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "days2", true, "2032-07-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.current?.grantDays).toBe(7);
    expect(r.current?.subjectToMandatory5Days).toBe(false);
  });

  it("異常系: 雇い入れ日の形式が不正", () => {
    const r = calcYuukyuuFuyoNissuu("2026/01/01", "standard", true, "2026-07-18");
    expect(r.ok).toBe(false);
  });

  it("異常系: 勤務形態が不正な値", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "unknown", true, "2026-07-18");
    expect(r.ok).toBe(false);
  });

  it("異常系: 雇い入れ日が範囲外（1949年以前）", () => {
    const r = calcYuukyuuFuyoNissuu("1900-01-01", "standard", true, "2026-07-18");
    expect(r.ok).toBe(false);
  });

  it("雇い入れ日が基準日より未来の場合はエラーにせず、入社前のプレビューとして扱う", () => {
    const r = calcYuukyuuFuyoNissuu("2027-01-01", "standard", true, "2026-07-18");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isFutureHire).toBe(true);
    expect(r.eligible).toBe(false);
    expect(r.daysUntilFirstEligible).toBeGreaterThan(0);
  });

  it("スケジュールは常に7区分・basisDateは昇順である", () => {
    const r = calcYuukyuuFuyoNissuu("2026-01-01", "standard", true, "2026-07-18");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schedule).toHaveLength(7);
    for (let i = 1; i < r.schedule.length; i += 1) {
      expect(compareDates(r.schedule[i - 1]!.basisDate, r.schedule[i]!.basisDate)).toBeLessThan(0);
    }
  });
});

describe("制度事実の参照が壊れていないことの確認（データ駆動）", () => {
  it("発生要件は6か月継続勤務・出勤率8割", () => {
    expect(ELIGIBLE_CONTINUOUS_SERVICE_MONTHS).toBe(6);
    expect(ELIGIBLE_ATTENDANCE_RATE).toBe(0.8);
  });

  it("年5日の時季指定義務は付与日数10日以上が対象、5日取得させる義務", () => {
    expect(MANDATORY_5DAYS_THRESHOLD).toBe(10);
    expect(MANDATORY_5DAYS_REQUIRED_DAYS).toBe(5);
  });
});
