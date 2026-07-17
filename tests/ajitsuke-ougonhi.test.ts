import { describe, expect, it } from "vitest";
import {
  formatAmount,
  fmt,
  scaleDish,
  scaleDishByServings,
} from "@/components/tools/impl/AjitsukeOugonhi.calc";

/*
 * 味付け黄金比計算（P2-T21）のテスト。
 * 比率データは data/tables/ajitsuke-ougonhi.json を正とする。
 * テストケース表は specs/b-tools/p2-t21-ajitsuke-ougonhi.md と対応する。
 */

function amountOf(ingredients: { key: string; ml: number }[], key: string): number {
  const found = ingredients.find((i) => i.key === key);
  if (!found) throw new Error(`ingredient not found: ${key}`);
  return found.ml;
}

describe("scaleDish / scaleDishByServings", () => {
  it("#1 煮物・1人分の基準ケース（人数指定）", () => {
    const r = scaleDishByServings("nimono", 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "dashi")).toBeCloseTo(150, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(18.75, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(18.75, 5);
  });

  it("#2 煮物・だし400ml基準（直接指定）", () => {
    const r = scaleDish("nimono", 400);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "dashi")).toBeCloseTo(400, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(50, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(50, 5);
    const shoyu = r.result.ingredients.find((i) => i.key === "shoyu")!;
    expect(fmt(shoyu.tbsp)).toBe("3.3");
  });

  it("#3 万能だれ（照り焼き用）・しょうゆ15ml基準は1:1:1", () => {
    const r = scaleDish("teriyaki_dare", 15);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(15, 5);
    expect(amountOf(r.result.ingredients, "sake")).toBeCloseTo(15, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(15, 5);
    expect(r.result.confirmed).toBe(true);
  });

  it("#4 煮魚・酒60ml基準は6:1:1", () => {
    const r = scaleDish("nizakana", 60);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "sake")).toBeCloseTo(60, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(10, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(10, 5);
  });

  it("#5 めんつゆ・だし120ml基準は12:1:1", () => {
    const r = scaleDish("mentsuyu", 120);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "dashi")).toBeCloseTo(120, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(10, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(10, 5);
  });

  it("#6 万能合わせだれ・みそ15ml基準は1:1:1:1:1（大さじ1ずつ）", () => {
    const r = scaleDish("bannou_awasedare", 15);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const key of ["miso", "sake", "mirin", "surigoma", "mizu"]) {
      expect(amountOf(r.result.ingredients, key)).toBeCloseTo(15, 5);
    }
    expect(r.result.confirmed).toBe(true);
  });

  it("#7 すき焼きの割り下・しょうゆ30ml基準は1:1:1:1（confirmed=false）", () => {
    const r = scaleDish("sukiyaki_warishita", 30);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const key of ["shoyu", "mirin", "sake", "satou"]) {
      expect(amountOf(r.result.ingredients, key)).toBeCloseTo(30, 5);
    }
    expect(r.result.confirmed).toBe(false);
  });

  it("#8 天つゆ・だし80ml基準は4:1:1（confirmed=false）", () => {
    const r = scaleDish("tentsuyu", 80);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "dashi")).toBeCloseTo(80, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(20, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(20, 5);
    expect(r.result.confirmed).toBe(false);
  });

  it("#9 酢の物（三杯酢）・酢30ml基準は3:2:1（confirmed=false）", () => {
    const r = scaleDish("sanbaizu", 30);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "su")).toBeCloseTo(30, 5);
    expect(amountOf(r.result.ingredients, "satou")).toBeCloseTo(20, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(10, 5);
    expect(r.result.confirmed).toBe(false);
  });

  it("#10 エッジケース: 人数0はエラー", () => {
    const r = scaleDishByServings("nimono", 0);
    expect(r.ok).toBe(false);
  });

  it("#11 エッジケース: 人数が負の値はエラー", () => {
    const r = scaleDishByServings("nimono", -1);
    expect(r.ok).toBe(false);
  });

  it("#12 エッジケース: 直接指定0mlはエラー", () => {
    const r = scaleDish("nimono", 0);
    expect(r.ok).toBe(false);
  });

  it("#13 エッジケース: 直接指定が負の値はエラー", () => {
    const r = scaleDish("nimono", -10);
    expect(r.ok).toBe(false);
  });

  it("#14 大人数（10人分）でも比率どおりスケールする", () => {
    const r = scaleDishByServings("nimono", 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(amountOf(r.result.ingredients, "dashi")).toBeCloseTo(1500, 5);
    expect(amountOf(r.result.ingredients, "shoyu")).toBeCloseTo(187.5, 5);
    expect(amountOf(r.result.ingredients, "mirin")).toBeCloseTo(187.5, 5);
  });

  it("#15 未知の料理キーはエラー（防御的実装）", () => {
    const r1 = scaleDish("unknown", 100);
    expect(r1.ok).toBe(false);
    const r2 = scaleDishByServings("unknown", 2);
    expect(r2.ok).toBe(false);
  });

  it("#16 小さじ未満（5ml未満）の量はml表記になる", () => {
    const r = scaleDish("nimono", 15);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const shoyu = r.result.ingredients.find((i) => i.key === "shoyu")!;
    expect(shoyu.ml).toBeCloseTo(1.875, 5);
    expect(formatAmount(shoyu.ml)).toBe("1.9ml");
  });

  it("formatAmount: 大さじ・小さじ・mlの3段階を正しく切り替える", () => {
    expect(formatAmount(30)).toBe("大さじ2");
    expect(formatAmount(10)).toBe("小さじ2");
    expect(formatAmount(3)).toBe("3ml");
  });

  it("非数（NaN）を渡すとエラーになる", () => {
    const r = scaleDish("nimono", Number.NaN);
    expect(r.ok).toBe(false);
  });
});
