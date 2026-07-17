import { describe, expect, it } from "vitest";
import { calcFoodCostEstimate, fmtYen } from "@/components/tools/impl/ShokuhiMeyasu.calc";

/*
 * 食費の目安計算（P2-T28）のテスト。
 * データは data/tables/shokuhi-meyasu.json を正とする（総務省統計局「家計調査（家計収支編）」
 * 2025年（令和7年）平均）。テストケース表は specs/b-tools/p2-t28-shokuhi-meyasu.md と対応する。
 */

describe("calcFoodCostEstimate", () => {
  it("#1 setaininzuu=1 は単身世帯の実額を返す", () => {
    const r = calcFoodCostEstimate(1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.label).toBe("単身世帯（1人）");
    expect(r.bucket.shokuryou).toBe(44659);
    expect(r.bucket.shouhiShishutsu).toBe(173042);
    expect(r.isOverBucketed).toBe(false);
  });

  it("#2 setaininzuu=2 は2人世帯の実額を返す", () => {
    const r = calcFoodCostEstimate(2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.shokuryou).toBe(79340);
  });

  it("#3 setaininzuu=3 は3人世帯の実額を返す", () => {
    const r = calcFoodCostEstimate(3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.shokuryou).toBe(92240);
  });

  it("#4 setaininzuu=4 は4人世帯の実額を返す", () => {
    const r = calcFoodCostEstimate(4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.shokuryou).toBe(103384);
  });

  it("#5 setaininzuu=5 は5人世帯の実額を返す", () => {
    const r = calcFoodCostEstimate(5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.shokuryou).toBe(112019);
  });

  it("#6 setaininzuu=6 は6人以上世帯（境界値）の実額を返す", () => {
    const r = calcFoodCostEstimate(6);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.label).toBe("6人以上世帯");
    expect(r.bucket.shokuryou).toBe(123241);
    expect(r.bucket.setaiNinzuu).toBe(6.3);
  });

  it("#7 setaininzuu=7 は6人を超えても『6人以上』区分と同じ実額（按分しない）", () => {
    const r = calcFoodCostEstimate(7);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.shokuryou).toBe(123241);
    expect(r.isOverBucketed).toBe(true);
  });

  it("#8 setaininzuu=10 のような極端な人数でもクラッシュせず『6人以上』区分を返す", () => {
    const r = calcFoodCostEstimate(10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.shokuryou).toBe(123241);
    expect(r.isOverBucketed).toBe(true);
  });

  it("#9 setaininzuu=0 は入力エラー", () => {
    const r = calcFoodCostEstimate(0);
    expect(r.ok).toBe(false);
  });

  it("#10 setaininzuu=-3 は入力エラー", () => {
    const r = calcFoodCostEstimate(-3);
    expect(r.ok).toBe(false);
  });

  it("#11 setaininzuu=1.5 のような非整数は入力エラー", () => {
    const r = calcFoodCostEstimate(1.5);
    expect(r.ok).toBe(false);
  });

  it("#12 setaininzuu=NaN は入力エラー", () => {
    const r = calcFoodCostEstimate(NaN);
    expect(r.ok).toBe(false);
  });

  it("#13 内訳（sonota）は 食料-外食-調理食品 で算出される（4人世帯）", () => {
    const r = calcFoodCostEstimate(4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.gaishoku).toBe(20472);
    expect(r.bucket.chouriShokuhin).toBe(14133);
    expect(r.bucket.sonota).toBe(103384 - 20472 - 14133);
  });
});

describe("fmtYen", () => {
  it("3桁区切りでカンマを入れる", () => {
    expect(fmtYen(123241)).toBe("123,241");
  });

  it("整数丸めする", () => {
    expect(fmtYen(1000.4)).toBe("1,000");
  });
});
