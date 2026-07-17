import { describe, expect, it } from "vitest";
import {
  calcPmsYosokuCalendar,
  PMS_ONSET_DAYS_FROM,
  PMS_ONSET_DAYS_TO,
  PMS_PREVALENCE_FROM_PERCENT,
  PMS_PREVALENCE_TO_PERCENT,
  LUTEAL_PHASE_DAYS,
  CYCLE_LENGTH_MIN,
  CYCLE_LENGTH_MAX,
} from "@/components/tools/impl/PmsYosokuCalendar.calc";

/*
 * PMS・体調予測カレンダー（P2-T31）のテスト。
 * specs/b-tools/p2-t31-pms-yosoku-calendar.md「テストケース表」を反映。
 * 次回月経開始予定日・黄体期間はQ3-03（tests/seiri-shuki.test.ts）と同じ
 * lmp/cycleLength/baseDateで一致することを前提に、そこから導出する
 * 黄体期間・PMS目安期間の値を検証する。
 */

describe("calcPmsYosokuCalendar（仕様書のテストケース表）", () => {
  it("#1 基準ケース: lmp=2026-01-01, 周期28（既定）", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-29");
    expect(r.current.lutealPhaseStart).toBe("2026-01-15");
    expect(r.current.lutealPhaseEnd).toBe("2026-01-28");
    expect(r.current.pmsWindowStart).toBe("2026-01-19");
    expect(r.current.pmsWindowEnd).toBe("2026-01-26");
  });

  it("#2 長周期の補正確認: 周期35", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 35, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-02-05");
    expect(r.current.lutealPhaseStart).toBe("2026-01-22");
    expect(r.current.lutealPhaseEnd).toBe("2026-02-04");
    expect(r.current.pmsWindowStart).toBe("2026-01-26");
    expect(r.current.pmsWindowEnd).toBe("2026-02-02");
  });

  it("#3 短周期の補正確認: 周期21", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 21, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-22");
    expect(r.current.lutealPhaseStart).toBe("2026-01-08");
    expect(r.current.lutealPhaseEnd).toBe("2026-01-21");
    expect(r.current.pmsWindowStart).toBe("2026-01-12");
    expect(r.current.pmsWindowEnd).toBe("2026-01-19");
  });

  it("#4 月末日LMP（月またぎ）: lmp=2026-01-31, 周期28", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-31", cycleLength: 28, baseDate: "2026-01-31" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-02-28");
    expect(r.current.lutealPhaseStart).toBe("2026-02-14");
    expect(r.current.lutealPhaseEnd).toBe("2026-02-27");
    expect(r.current.pmsWindowStart).toBe("2026-02-18");
    expect(r.current.pmsWindowEnd).toBe("2026-02-25");
  });

  it("#5 うるう年境界: lmp=2028-02-01, 周期28（2028年2月29日を正しく扱う）", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2028-02-01", cycleLength: 28, baseDate: "2028-02-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2028-02-29");
    expect(r.current.lutealPhaseStart).toBe("2028-02-15");
    expect(r.current.lutealPhaseEnd).toBe("2028-02-28");
    expect(r.current.pmsWindowStart).toBe("2028-02-19");
    expect(r.current.pmsWindowEnd).toBe("2028-02-26");
  });

  it("#6 年またぎ: lmp=2026-12-20, 周期28", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-12-20", cycleLength: 28, baseDate: "2026-12-20" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2027-01-17");
    expect(r.current.lutealPhaseStart).toBe("2027-01-03");
    expect(r.current.lutealPhaseEnd).toBe("2027-01-16");
    expect(r.current.pmsWindowStart).toBe("2027-01-07");
    expect(r.current.pmsWindowEnd).toBe("2027-01-14");
  });

  it("#7 周期日数の下限境界値: 20", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 20, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-21");
    expect(r.current.lutealPhaseStart).toBe("2026-01-07");
    expect(r.current.lutealPhaseEnd).toBe("2026-01-20");
    expect(r.current.pmsWindowStart).toBe("2026-01-11");
    expect(r.current.pmsWindowEnd).toBe("2026-01-18");
  });

  it("#8 周期日数の上限境界値: 45", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 45, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-02-15");
    expect(r.current.lutealPhaseStart).toBe("2026-02-01");
    expect(r.current.lutealPhaseEnd).toBe("2026-02-14");
    expect(r.current.pmsWindowStart).toBe("2026-02-05");
    expect(r.current.pmsWindowEnd).toBe("2026-02-12");
  });

  it("#9 複数周期表示（calendarCount=4）: 第2周期の黄体期間・PMS目安期間", () => {
    const r = calcPmsYosokuCalendar({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-01-01",
      calendarCount: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.calendar).toHaveLength(4);
    const second = r.calendar[1];
    expect(second.cycleNumber).toBe(2);
    expect(second.periodDate).toBe("2026-02-26");
    expect(second.lutealPhaseStart).toBe("2026-02-12");
    expect(second.lutealPhaseEnd).toBe("2026-02-25");
    expect(second.pmsWindowStart).toBe("2026-02-16");
    expect(second.pmsWindowEnd).toBe("2026-02-23");
  });

  it("#10 バリデーションエラー: 周期日数19（下限を1日下回る）", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 19, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("CYCLE_LENGTH_OUT_OF_RANGE");
  });

  it("#11 バリデーションエラー: 不正なlmp", () => {
    const r = calcPmsYosokuCalendar({ lmp: "not-a-date", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("INVALID_LMP");
  });

  it("#12 バリデーションエラー: baseDateがlmpより前", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-10", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("BASE_BEFORE_LMP");
  });

  it("#13 バリデーションエラー: lmpがbaseDateから91日以上前", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2025-10-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("LMP_TOO_OLD");
  });

  it("#14 デフォルト値の確認: cycleLength省略（デフォルト28）", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nextPeriodDate).toBe("2026-01-29");
    expect(r.current.pmsWindowStart).toBe("2026-01-19");
    expect(r.current.pmsWindowEnd).toBe("2026-01-26");
  });

  it("#15 定数の確認: pms-yosoku-shikumi.json / SeiriShuki.calc.tsの値と一致", () => {
    expect(PMS_ONSET_DAYS_FROM).toBe(3);
    expect(PMS_ONSET_DAYS_TO).toBe(10);
    expect(PMS_PREVALENCE_FROM_PERCENT).toBe(2);
    expect(PMS_PREVALENCE_TO_PERCENT).toBe(10);
    expect(LUTEAL_PHASE_DAYS).toBe(14);
    expect(CYCLE_LENGTH_MIN).toBe(20);
    expect(CYCLE_LENGTH_MAX).toBe(45);
  });
});

describe("calcPmsYosokuCalendar（追加のエッジケース）", () => {
  it("PMS目安期間は黄体期間の部分集合になる（開始・終了とも黄体期間内）", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.current.pmsWindowStart >= r.current.lutealPhaseStart).toBe(true);
    expect(r.current.pmsWindowEnd <= r.current.lutealPhaseEnd).toBe(true);
  });

  it("周期日数の上限を超える46はエラー", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 46, baseDate: "2026-01-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("CYCLE_LENGTH_OUT_OF_RANGE");
  });

  it("calendarCountを省略した場合はデフォルト3件のカレンダーが返る", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.calendar).toHaveLength(3);
  });

  it("第3周期の黄体期間・PMS目安期間も正しく算出される（calendarCount=4）", () => {
    const r = calcPmsYosokuCalendar({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-01-01",
      calendarCount: 4,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const third = r.calendar[2];
    expect(third.periodDate).toBe("2026-03-26");
    expect(third.lutealPhaseStart).toBe("2026-03-12");
    expect(third.lutealPhaseEnd).toBe("2026-03-25");
    expect(third.pmsWindowStart).toBe("2026-03-16");
    expect(third.pmsWindowEnd).toBe("2026-03-23");
  });

  it("current は calendar の1件目と一致する", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2026-01-01", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.current).toEqual(r.calendar[0]);
  });

  it("lmpがbaseDateからちょうど90日前は許容される境界値", () => {
    const r = calcPmsYosokuCalendar({ lmp: "2025-10-03", cycleLength: 28, baseDate: "2026-01-01" });
    expect(r.ok).toBe(true);
  });
});
