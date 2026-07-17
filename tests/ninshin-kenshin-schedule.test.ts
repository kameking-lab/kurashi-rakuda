import { describe, expect, it } from "vitest";
import {
  addCalendarMonths,
  addDays,
  calcNinshinKenshinSchedule,
  generateSchedule,
  intervalWeeksForGestationalWeek,
  isValidDateString,
  phaseLabelForGestationalWeek,
  resolveDates,
  standardVisitCount,
  visitStatus,
} from "@/components/tools/impl/NinshinKenshinSchedule.calc";

/** 仕様書 specs/b-tools/p2-t14-ninshin-kenshin-schedule.md の「テストケース表（14件）」を反映 */

const BASE = "2026-07-17";

describe("NinshinKenshinSchedule.calc — 仕様書テストケース表（14件）", () => {
  it("#1 出産予定日=2027-01-01（単独） → 実効LMP=2026-03-27、受診14回", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2027-01-01" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.lmp).toBe("2026-03-27");
    expect(r.result.visits).toHaveLength(14);
    expect(r.result.visits[0]).toMatchObject({
      index: 1,
      gestationalWeek: 8,
      date: "2026-05-22",
      intervalWeeksFromPrevious: null,
    });
    expect(r.result.visits[13]).toMatchObject({
      index: 14,
      gestationalWeek: 39,
      date: "2026-12-25",
    });
  });

  it("#2 出産予定日=2027-03-01（単独） → 実効LMP=2026-05-25、受診14回", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2027-03-01" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.lmp).toBe("2026-05-25");
    expect(r.result.visits).toHaveLength(14);
    expect(r.result.visits[0].date).toBe("2026-07-20");
    expect(r.result.visits[13].date).toBe("2027-02-22");
  });

  it("#3 最終月経開始日のみ入力（lmp=2026-08-01） → 出産予定日を280日で概算", () => {
    const r = calcNinshinKenshinSchedule({ lmp: "2026-08-01" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dueDate).toBe("2027-05-08");
    expect(r.result.visits).toHaveLength(14);
    expect(r.result.visits[0].date).toBe("2026-09-26");
    expect(r.result.visits[13].date).toBe("2027-05-01");
  });

  it("#4 出産予定日とLMP両方入力・食い違いあり → 出産予定日を優先し、食い違い日数を返す", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2027-01-01", lmp: "2026-03-01" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.lmp).toBe("2026-03-27");
    expect(r.result.lmpDueDateMismatchDays).toBe(-26);
  });

  it("#5 intervalWeeksForGestationalWeek: 23週と24週の境界", () => {
    expect(intervalWeeksForGestationalWeek(23)).toBe(4);
    expect(intervalWeeksForGestationalWeek(24)).toBe(2);
  });

  it("#6 intervalWeeksForGestationalWeek: 35週と36週の境界", () => {
    expect(intervalWeeksForGestationalWeek(35)).toBe(2);
    expect(intervalWeeksForGestationalWeek(36)).toBe(1);
  });

  it("#7 phaseLabelForGestationalWeek: 23週・24週・36週で区分ラベルが切り替わる", () => {
    expect(phaseLabelForGestationalWeek(23)).toContain("初期〜23週");
    expect(phaseLabelForGestationalWeek(24)).toContain("24週〜35週");
    expect(phaseLabelForGestationalWeek(36)).toContain("36週〜出産まで");
  });

  it("#8 産後健診の目安日（出産予定日=2027-01-01）", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2027-01-01" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.sanpuFirstCheckupDate).toBe("2027-01-15");
    expect(r.result.sanpuSecondCheckupDate).toBe("2027-02-01");
  });

  it("#9 addCalendarMonths: 1/31 + 1か月は月末クランプで2/28（2027年は平年）", () => {
    expect(addCalendarMonths("2027-01-31", 1)).toBe("2027-02-28");
  });

  it("#10 出産予定日が基準日からちょうど70日前 → 境界値OK", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2026-05-08" }, BASE);
    expect(r.ok).toBe(true);
  });

  it("#11 出産予定日が基準日から71日前 → エラー", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2026-05-07" }, BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("出産予定日が基準日より70日以上前です。入力内容をご確認ください");
  });

  it("#12 出産予定日が基準日からちょうど320日後 → 境界値OK", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2027-06-02" }, BASE);
    expect(r.ok).toBe(true);
  });

  it("#13 出産予定日が基準日から321日後 → エラー", () => {
    const r = calcNinshinKenshinSchedule({ dueDate: "2027-06-03" }, BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("出産予定日が基準日より320日以上先です。入力内容をご確認ください");
  });

  it("#14 出産予定日・最終月経開始日ともに未入力 → エラー", () => {
    const r = calcNinshinKenshinSchedule({}, BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("出産予定日（または最終月経開始日）を入力してください");
  });
});

describe("NinshinKenshinSchedule.calc — 補助関数", () => {
  it("isValidDateString: 不正な形式・存在しない日付を弾く", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("2026-07-17")).toBe(true);
  });

  it("addDays: 単純な日数加減算（うるう年をまたいでも実日数で計算）", () => {
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
    expect(addDays("2027-01-01", -280)).toBe("2026-03-27");
  });

  it("resolveDates: 出産予定日・LMPともに未入力なら null", () => {
    expect(resolveDates({})).toBeNull();
  });

  it("resolveDates: 出産予定日のみ入力なら280日で逆算し、mismatchはnull", () => {
    const r = resolveDates({ dueDate: "2027-01-01" });
    expect(r).toEqual({ lmp: "2026-03-27", dueDate: "2027-01-01", lmpDueDateMismatchDays: null });
  });

  it("visitStatus: 基準日からみて過去・当日・今後を判定する", () => {
    const visit = { index: 1, gestationalWeek: 8, date: "2026-07-17", intervalWeeksFromPrevious: null, phaseLabel: "", isWithinStandardVisitCount: true };
    expect(visitStatus(visit, "2026-07-17")).toBe("today");
    expect(visitStatus({ ...visit, date: "2026-07-16" }, "2026-07-17")).toBe("past");
    expect(visitStatus({ ...visit, date: "2026-07-18" }, "2026-07-17")).toBe("upcoming");
  });

  it("generateSchedule: visitCount を明示的に小さくすると、それを超える回は isWithinStandardVisitCount=false になる", () => {
    const visits = generateSchedule("2026-03-27", "2027-01-01", 10);
    expect(visits).toHaveLength(14);
    expect(visits[9].isWithinStandardVisitCount).toBe(true); // index10
    expect(visits[10].isWithinStandardVisitCount).toBe(false); // index11
    expect(visits[13].isWithinStandardVisitCount).toBe(false); // index14
  });

  it("standardVisitCount はデータ由来で14（2026-07-17時点）", () => {
    expect(standardVisitCount).toBe(14);
  });
});
