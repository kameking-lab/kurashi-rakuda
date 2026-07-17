import { describe, expect, it } from "vitest";
import {
  calcGakudouKabeDandori,
  classifyStage,
  fiscalYearOf,
  gradeOf,
  isEntryYearFarFuture,
  validateEntryYear,
  buildChecklist,
  WAITING_CHILDREN_BY_GRADE,
  WAITING_CHILDREN_PEAK_GRADE,
} from "@/components/tools/impl/GakudouKabeDandoriCheck.calc";

/*
 * 学童・小1の壁 段取りチェック（P2-T20）のテスト。
 * テストケース表は specs/b-tools/p2-t20-gakudou-kabe-dandori-check.md と対応する。
 * 制度事実は data/seido/gakudou-hoiku-kijun.json を正とする（本テストでは
 * 数値そのものは検証せず、参照が壊れていないことのみ間接的に確認する）。
 */

describe("fiscalYearOf", () => {
  it("#17 3月は前年度扱い（年度境界）", () => {
    expect(fiscalYearOf("2026-03-31")).toBe(2025);
  });

  it("#18 4月から新年度（年度境界）", () => {
    expect(fiscalYearOf("2026-04-01")).toBe(2026);
  });

  it("不正な日付形式は例外を投げる", () => {
    expect(() => fiscalYearOf("2026/04/01")).toThrow();
  });
});

describe("classifyStage", () => {
  it("#1 入学まで約2年・prepAutumnStartより前 → tooEarly", () => {
    expect(classifyStage(2028, "2026-07-18")).toBe("tooEarly");
  });

  it("#2 境界値: prepAutumnStartちょうど → prepAutumn", () => {
    expect(classifyStage(2027, "2026-09-01")).toBe("prepAutumn");
  });

  it("#3 境界値: prepAutumnStartの前日 → tooEarly", () => {
    expect(classifyStage(2027, "2026-08-31")).toBe("tooEarly");
  });

  it("#4 秋〜年内 → prepAutumn", () => {
    expect(classifyStage(2027, "2026-12-31")).toBe("prepAutumn");
  });

  it("#5 境界値: justBeforeStartちょうど → justBefore", () => {
    expect(classifyStage(2027, "2027-01-01")).toBe("justBefore");
  });

  it("#6 入学直前の末日 → justBefore", () => {
    expect(classifyStage(2027, "2027-03-31")).toBe("justBefore");
  });

  it("#7 境界値: 入学日ちょうど（gradeOffset=0） → afterEntry", () => {
    expect(classifyStage(2027, "2027-04-01")).toBe("afterEntry");
  });

  it("#8 今年度入学＝小1・経過中 → afterEntry", () => {
    expect(classifyStage(2026, "2026-07-18")).toBe("afterEntry");
  });

  it("#9 境界値: gradeOffset=5・小6 → afterEntry", () => {
    expect(classifyStage(2021, "2026-07-18")).toBe("afterEntry");
  });

  it("#10 境界値: gradeOffset=6・対象学年超過 → outOfRange", () => {
    expect(classifyStage(2020, "2026-07-18")).toBe("outOfRange");
  });

  it("#11 大きく超過 → outOfRange", () => {
    expect(classifyStage(2015, "2026-07-18")).toBe("outOfRange");
  });
});

describe("gradeOf", () => {
  it("就学前は null", () => {
    expect(gradeOf(2028, "2026-07-18")).toBeNull();
  });

  it("今年度入学は小1", () => {
    expect(gradeOf(2026, "2026-07-18")).toBe(1);
  });

  it("gradeOffset=5は小6（境界値）", () => {
    expect(gradeOf(2021, "2026-07-18")).toBe(6);
  });

  it("gradeOffset=6は対象範囲外（null）", () => {
    expect(gradeOf(2020, "2026-07-18")).toBeNull();
  });
});

describe("validateEntryYear", () => {
  it("#14 範囲外（下限未満）はエラー", () => {
    const r = validateEntryYear(1989);
    expect(r.ok).toBe(false);
  });

  it("#15 範囲外（上限超）はエラー", () => {
    const r = validateEntryYear(2101);
    expect(r.ok).toBe(false);
  });

  it("#16 非整数はエラー", () => {
    const r = validateEntryYear(2026.5);
    expect(r.ok).toBe(false);
  });

  it("範囲内・整数はOK", () => {
    expect(validateEntryYear(2027).ok).toBe(true);
    expect(validateEntryYear(MIN_ENTRY_YEAR()).ok).toBe(true);
    expect(validateEntryYear(MAX_ENTRY_YEAR()).ok).toBe(true);
  });
});

// 範囲境界の定数はテストの可読性のためだけにここでラップする（実装側の定数と一致させる）
function MIN_ENTRY_YEAR() {
  return 1990;
}
function MAX_ENTRY_YEAR() {
  return 2100;
}

describe("isEntryYearFarFuture", () => {
  it("#12 遠い将来（gradeOffset=-14）はソフト警告 true", () => {
    expect(isEntryYearFarFuture(2040, "2026-07-18")).toBe(true);
  });

  it("#13 境界値: gradeOffset=-10ちょうどは false", () => {
    expect(isEntryYearFarFuture(2036, "2026-07-18")).toBe(false);
  });

  it("gradeOffset=-11は true", () => {
    expect(isEntryYearFarFuture(2037, "2026-07-18")).toBe(true);
  });

  it("入学済み（gradeOffsetが正）は false", () => {
    expect(isEntryYearFarFuture(2024, "2026-07-18")).toBe(false);
  });
});

describe("buildChecklist", () => {
  it("#19 tooEarlyでは全カテゴリ isCurrent=false", () => {
    const categories = buildChecklist("tooEarly");
    expect(categories.every((c) => !c.isCurrent)).toBe(true);
    expect(categories).toHaveLength(3);
  });

  it("#20 afterEntryでは afterEntry カテゴリのみ isCurrent=true", () => {
    const categories = buildChecklist("afterEntry");
    const current = categories.filter((c) => c.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0]!.id).toBe("afterEntry");
  });

  it("prepAutumnでは prepAutumn カテゴリのみ isCurrent=true", () => {
    const categories = buildChecklist("prepAutumn");
    expect(categories.find((c) => c.id === "prepAutumn")!.isCurrent).toBe(true);
    expect(categories.find((c) => c.id === "justBefore")!.isCurrent).toBe(false);
  });

  it("justBeforeでは justBefore カテゴリのみ isCurrent=true", () => {
    const categories = buildChecklist("justBefore");
    expect(categories.find((c) => c.id === "justBefore")!.isCurrent).toBe(true);
  });

  it("outOfRangeでは全カテゴリ isCurrent=false", () => {
    const categories = buildChecklist("outOfRange");
    expect(categories.every((c) => !c.isCurrent)).toBe(true);
  });

  it("各カテゴリは空でない項目リストを持つ", () => {
    const categories = buildChecklist("afterEntry");
    for (const c of categories) {
      expect(c.items.length).toBeGreaterThan(0);
    }
  });
});

describe("calcGakudouKabeDandori（総合）", () => {
  it("正常系: 就学前・prepAutumn", () => {
    const r = calcGakudouKabeDandori(2027, "2026-10-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.phase).toBe("prepAutumn");
    expect(r.grade).toBeNull();
    expect(r.isFarFuture).toBe(false);
    expect(r.categories.find((c) => c.id === "prepAutumn")!.isCurrent).toBe(true);
  });

  it("正常系: 入学後・小1", () => {
    const r = calcGakudouKabeDandori(2026, "2026-07-18");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.phase).toBe("afterEntry");
    expect(r.grade).toBe(1);
  });

  it("正常系: 対象学年超過（outOfRange）でもエラーではなく結果を返す", () => {
    const r = calcGakudouKabeDandori(2015, "2026-07-18");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.phase).toBe("outOfRange");
    expect(r.grade).toBeNull();
  });

  it("異常系: 範囲外の年度はエラーを返す", () => {
    const r = calcGakudouKabeDandori(1800, "2026-07-18");
    expect(r.ok).toBe(false);
  });

  it("異常系: 非整数の年度はエラーを返す", () => {
    const r = calcGakudouKabeDandori(2026.5, "2026-07-18");
    expect(r.ok).toBe(false);
  });

  it("遠い将来の入学予定年度はソフト警告 true だがエラーにはしない", () => {
    const r = calcGakudouKabeDandori(2040, "2026-07-18");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isFarFuture).toBe(true);
  });
});

describe("待機児童の学年別データ（制度事実の参照が壊れていないことの確認）", () => {
  it("小学4年生が待機児童のピーク学年である", () => {
    expect(WAITING_CHILDREN_PEAK_GRADE).toBe(4);
    const values = Object.values(WAITING_CHILDREN_BY_GRADE);
    const max = Math.max(...values);
    expect(WAITING_CHILDREN_BY_GRADE[WAITING_CHILDREN_PEAK_GRADE]).toBe(max);
  });

  it("学年別の待機児童数はすべて正の数である", () => {
    for (const v of Object.values(WAITING_CHILDREN_BY_GRADE)) {
      expect(v).toBeGreaterThan(0);
    }
  });
});
