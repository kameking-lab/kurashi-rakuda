import { describe, expect, it } from "vitest";
import {
  calcShussanJunbiChecklist,
  isValidDateString,
  addDays,
  formatJapaneseDate,
} from "@/components/tools/impl/ShussanJunbiChecklist.calc";

/*
 * 出産準備チェックリスト（予定日逆算）（P2-T16）のテスト。
 * テストケース表は specs/b-tools/p2-t16-shussan-junbi-checklist.md と対応する。
 */

describe("calcShussanJunbiChecklist", () => {
  it("#1 安定期（臨月開始日より十分前）", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-05-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("安定期");
    expect(r.daysUntilDue).toBe(160);
    expect(r.daysUntilRingetsu).toBe(132);
    expect(r.ringetsuStartDate).toBe("2026-09-10");
    expect(r.overdue).toBe(false);
  });

  it("#2 臨月開始日の前日はまだ安定期", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-09-09");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("安定期");
    expect(r.daysUntilDue).toBe(29);
    expect(r.daysUntilRingetsu).toBe(1);
  });

  it("#3 臨月開始日ちょうど（境界値）は臨月に切り替わる", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-09-10");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("臨月");
    expect(r.daysUntilDue).toBe(28);
    expect(r.daysUntilRingetsu).toBe(0);
  });

  it("#4 出産予定日当日（境界値）は臨月のまま", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-10-08");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("臨月");
    expect(r.daysUntilDue).toBe(0);
    expect(r.daysUntilRingetsu).toBe(-28);
    expect(r.overdue).toBe(false);
  });

  it("#5 出産予定日の翌日から産後に切り替わる", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-10-09");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("産後");
    expect(r.daysUntilDue).toBe(-1);
    expect(r.daysUntilRingetsu).toBe(-29);
    expect(r.overdue).toBe(true);
  });

  it("#6 出産予定日が基準日より1年前（過去日）でもクラッシュせず産後を返す", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2027-10-08");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("産後");
    expect(r.daysUntilDue).toBe(-365);
    expect(r.daysUntilRingetsu).toBe(-393);
  });

  it("#7 出産予定日が基準日より3年先（遠い未来日）でもクラッシュせず安定期を返す", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2023-10-08");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("安定期");
    expect(r.daysUntilDue).toBe(1096);
    expect(r.daysUntilRingetsu).toBe(1068);
  });

  it("#8 出産予定日が未入力はエラー", () => {
    const r = calcShussanJunbiChecklist("", "2026-05-01");
    expect(r.ok).toBe(false);
  });

  it("#9 実在しない日付（2月30日）はエラー", () => {
    const r = calcShussanJunbiChecklist("2026-02-30", "2026-05-01");
    expect(r.ok).toBe(false);
  });

  it("#9b 基準日が実在しない日付でもエラー", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-13-01");
    expect(r.ok).toBe(false);
  });

  it("#10 安定期では stable/beforeRingetsu が isCurrent、他は false", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-05-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byId = Object.fromEntries(r.categories.map((c) => [c.id, c.isCurrent]));
    expect(byId.stable).toBe(true);
    expect(byId.beforeRingetsu).toBe(true);
    expect(byId.hospitalBag).toBe(false);
    expect(byId.postpartum).toBe(false);
  });

  it("#11 臨月では hospitalBag だけが isCurrent", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-09-20");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("臨月");
    const byId = Object.fromEntries(r.categories.map((c) => [c.id, c.isCurrent]));
    expect(byId.stable).toBe(false);
    expect(byId.beforeRingetsu).toBe(false);
    expect(byId.hospitalBag).toBe(true);
    expect(byId.postpartum).toBe(false);
  });

  it("#12 産後では postpartum だけが isCurrent", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-10-09");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byId = Object.fromEntries(r.categories.map((c) => [c.id, c.isCurrent]));
    expect(byId.stable).toBe(false);
    expect(byId.beforeRingetsu).toBe(false);
    expect(byId.hospitalBag).toBe(false);
    expect(byId.postpartum).toBe(true);
  });

  it("#13 4区分が常に全件返り、各区分に1件以上の項目がある（該当しない時期でも省略しない）", () => {
    const r = calcShussanJunbiChecklist("2026-10-08", "2026-05-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.categories).toHaveLength(4);
    const ids = r.categories.map((c) => c.id).sort();
    expect(ids).toEqual(["beforeRingetsu", "hospitalBag", "postpartum", "stable"]);
    for (const category of r.categories) {
      expect(category.items.length).toBeGreaterThan(0);
    }
  });
});

describe("isValidDateString", () => {
  it("正しい日付形式かつ実在する日付は true", () => {
    expect(isValidDateString("2026-10-08")).toBe(true);
  });

  it("実在しない日付（2月30日）は false", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
  });

  it("空文字は false", () => {
    expect(isValidDateString("")).toBe(false);
  });

  it("フォーマット崩れは false", () => {
    expect(isValidDateString("2026/10/08")).toBe(false);
  });
});

describe("addDays / formatJapaneseDate", () => {
  it("月をまたぐ日数加算ができる", () => {
    expect(addDays("2026-10-08", -28)).toBe("2026-09-10");
  });

  it("日本語表記に整形できる", () => {
    expect(formatJapaneseDate("2026-10-08")).toBe("2026年10月8日");
  });
});
