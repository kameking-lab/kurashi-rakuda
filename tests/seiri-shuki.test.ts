import { describe, expect, it } from "vitest";
import { calcSeiriShuki } from "@/components/tools/impl/SeiriShuki.calc";

/*
 * 生理周期・排卵日予測（Q3-03）のテスト。
 * specs/b-tools/03-menstrual-cycle-ovulation-predictor.md「テストケース（10件）」を反映し、
 * 月またぎ・年またぎ・うるう年境界・バリデーションのケースを追加している。
 */

describe("calcSeiriShuki（仕様書のテストケース表）", () => {
  it("#1 基準ケース: LMP=2026-01-01, 周期28（既定）", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-29");
    expect(r.ovulationDate).toBe("2026-01-15");
    expect(r.fertileWindowStart).toBe("2026-01-10");
    expect(r.fertileWindowEnd).toBe("2026-01-16");
  });

  it("#2 長周期の補正確認: 周期35", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 35, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-02-05");
    expect(r.ovulationDate).toBe("2026-01-22");
    expect(r.fertileWindowStart).toBe("2026-01-17");
    expect(r.fertileWindowEnd).toBe("2026-01-23");
  });

  it("#3 短周期の補正確認: 周期21", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 21, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-22");
    expect(r.ovulationDate).toBe("2026-01-08");
    expect(r.fertileWindowStart).toBe("2026-01-03");
    expect(r.fertileWindowEnd).toBe("2026-01-09");
  });

  it("#4 月末日LMP（月またぎ）: LMP=2026-01-31, 周期28", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-31", cycleLength: 28, baseDate: "2026-01-31" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-02-28");
    expect(r.ovulationDate).toBe("2026-02-14");
    expect(r.fertileWindowStart).toBe("2026-02-09");
    expect(r.fertileWindowEnd).toBe("2026-02-15");
  });

  it("#5 平年2月をまたいで3月になるケース: LMP=2026-02-01, 周期28", () => {
    const r = calcSeiriShuki({ lmp: "2026-02-01", cycleLength: 28, baseDate: "2026-02-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-03-01");
    expect(r.ovulationDate).toBe("2026-02-15");
    expect(r.fertileWindowStart).toBe("2026-02-10");
    expect(r.fertileWindowEnd).toBe("2026-02-16");
  });

  it("#6 うるう年境界: LMP=2028-02-01, 周期28（2028年2月29日を正しく扱う）", () => {
    const r = calcSeiriShuki({ lmp: "2028-02-01", cycleLength: 28, baseDate: "2028-02-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2028-02-29");
    expect(r.ovulationDate).toBe("2028-02-15");
    expect(r.fertileWindowStart).toBe("2028-02-10");
    expect(r.fertileWindowEnd).toBe("2028-02-16");
  });

  it("#7 周期日数の下限境界値: 20", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 20, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-21");
    expect(r.ovulationDate).toBe("2026-01-07");
    expect(r.fertileWindowStart).toBe("2026-01-02");
    expect(r.fertileWindowEnd).toBe("2026-01-08");
  });

  it("#8 周期日数の上限境界値: 45", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 45, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-02-15");
    expect(r.ovulationDate).toBe("2026-02-01");
    expect(r.fertileWindowStart).toBe("2026-01-27");
    expect(r.fertileWindowEnd).toBe("2026-02-02");
  });

  it("#9 年またぎ: LMP=2026-12-20, 周期28", () => {
    const r = calcSeiriShuki({ lmp: "2026-12-20", cycleLength: 28, baseDate: "2026-12-20" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2027-01-17");
    expect(r.ovulationDate).toBe("2027-01-03");
    expect(r.fertileWindowStart).toBe("2026-12-29");
    expect(r.fertileWindowEnd).toBe("2027-01-04");
  });

  it("#10 バリデーションエラー: 周期日数19（下限を1日下回る）", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 19, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("CYCLE_LENGTH_OUT_OF_RANGE");
    expect(r.message).toBe("周期日数は20〜45の範囲で入力してください");
  });
});

describe("calcSeiriShuki（追加のエッジケース）", () => {
  it("周期日数の上限を超える46はエラー", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 46, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("CYCLE_LENGTH_OUT_OF_RANGE");
  });

  it("baseDate が lmp より前はエラー", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-10", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("BASE_BEFORE_LMP");
    expect(r.message).toBe("基準日は最終月経開始日より後の日付を指定してください");
  });

  it("lmp が baseDate から91日以上前はエラー（範囲外）", () => {
    const r = calcSeiriShuki({ lmp: "2025-10-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("LMP_TOO_OLD");
    expect(r.message).toBe("入力範囲外です。最新の月経開始日を入力してください");
  });

  it("lmp が baseDate からちょうど90日前は許容される境界値", () => {
    // 2026-01-01 から90日前 = 2025-10-03
    const r = calcSeiriShuki({ lmp: "2025-10-03", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
  });

  it("periodLength が範囲外（1）はエラー", () => {
    const r = calcSeiriShuki({
      lmp: "2026-01-01",
      cycleLength: 28,
      periodLength: 1,
      baseDate: "2026-01-01",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("PERIOD_LENGTH_OUT_OF_RANGE");
  });

  it("periodLength が範囲外（11）はエラー", () => {
    const r = calcSeiriShuki({
      lmp: "2026-01-01",
      cycleLength: 28,
      periodLength: 11,
      baseDate: "2026-01-01",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("PERIOD_LENGTH_OUT_OF_RANGE");
  });

  it("経過状況: baseDate が排卵日より前は「これからです（予測）」", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ovulationStatus).toBe("これからです（予測）");
  });

  it("経過状況: baseDate が妊娠しやすい期間内は該当バッジ", () => {
    // ovulationDate=2026-01-15, fertileWindowEnd=2026-01-16
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-16" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ovulationStatus).toBe("妊娠しやすい期間の目安に入っています");
  });

  it("経過状況: baseDate が妊娠しやすい期間を過ぎていると「排卵日は過ぎています」", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-20" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ovulationStatus).toBe("この周期の排卵日は過ぎています");
  });

  it("次々回の月経開始予定日は LMP + cycleLength×2 で算出される", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next2PeriodDate).toBe("2026-02-26");
  });

  it("calendarCount を指定すると、その周期数分の月経開始予定日が算出される", () => {
    const r = calcSeiriShuki({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-01-01",
      calendarCount: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.calendar).toEqual([
      "2026-01-29",
      "2026-02-26",
      "2026-03-26",
      "2026-04-23",
    ]);
  });

  it("cycleLength・periodLength を省略した場合はデフォルト（28日・5日）が使われる", () => {
    const r = calcSeiriShuki({ lmp: "2026-01-01", baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-29");
  });
});
