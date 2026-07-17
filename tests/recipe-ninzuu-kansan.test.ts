import { describe, expect, it } from "vitest";
import {
  classifyUnit,
  fmtAmount,
  fmtRatio,
  roundAmount,
  scaleRecipe,
  type Ingredient,
} from "@/components/tools/impl/RecipeNinzuuKansan.calc";

/*
 * レシピ人数スケール換算（P2-T22）のテスト。
 * テストケース表は specs/b-tools/p2-t22-recipe-ninzuu-kansan.md と対応する。
 * 制度・統計データへの依存はなく、単純な比例計算（倍率×分量）のみを検証する。
 */

describe("scaleRecipe", () => {
  it("#1 整数倍（4人→8人、ratio=2）: 米2合→4合", () => {
    const ingredients: Ingredient[] = [{ name: "米", amount: 2, unit: "合" }];
    const r = scaleRecipe(4, 8, ingredients);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ratio).toBe(2);
    expect(r.items[0].scaledAmount).toBe(4);
  });

  it("#2 非整数倍（4人→6人、ratio=1.5）: 小麦粉200g→300g（小数第1位丸め）", () => {
    const ingredients: Ingredient[] = [{ name: "小麦粉", amount: 200, unit: "g" }];
    const r = scaleRecipe(4, 6, ingredients);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ratio).toBe(1.5);
    expect(r.items[0].scaledAmount).toBe(300);
  });

  it("#3 spoon系単位は0.5刻みに丸める: 醤油2大さじ×1.5倍→3大さじ", () => {
    const ingredients: Ingredient[] = [{ name: "醤油", amount: 2, unit: "大さじ" }];
    const r = scaleRecipe(2, 3, ingredients);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0].scaledAmount).toBe(3);
  });

  it("#4 count系単位は整数に丸める: 卵2個×(4/3)倍→3個", () => {
    const ingredients: Ingredient[] = [{ name: "卵", amount: 2, unit: "個" }];
    const r = scaleRecipe(3, 4, ingredients);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0].scaledAmount).toBe(3);
  });

  it("#5 元の人数が0はエラー", () => {
    const r = scaleRecipe(0, 4, [{ name: "米", amount: 2, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#6 元の人数が負数はエラー", () => {
    const r = scaleRecipe(-2, 4, [{ name: "米", amount: 2, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#7 目標人数が0はエラー", () => {
    const r = scaleRecipe(4, 0, [{ name: "米", amount: 2, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#8 目標人数が負数はエラー", () => {
    const r = scaleRecipe(4, -1, [{ name: "米", amount: 2, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#9 材料0件はエラー", () => {
    const r = scaleRecipe(4, 6, []);
    expect(r.ok).toBe(false);
  });

  it("#10 材料名未入力（空文字）はエラー", () => {
    const r = scaleRecipe(4, 6, [{ name: "", amount: 2, unit: "g" }]);
    expect(r.ok).toBe(false);
  });

  it("#10b 材料名が空白のみもエラー", () => {
    const r = scaleRecipe(4, 6, [{ name: "   ", amount: 2, unit: "g" }]);
    expect(r.ok).toBe(false);
  });

  it("#11 分量0はエラー", () => {
    const r = scaleRecipe(4, 6, [{ name: "米", amount: 0, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#12 分量が負数はエラー", () => {
    const r = scaleRecipe(4, 6, [{ name: "米", amount: -1, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#12b 分量がNaN（非数値）はエラー", () => {
    const r = scaleRecipe(4, 6, [{ name: "米", amount: NaN, unit: "合" }]);
    expect(r.ok).toBe(false);
  });

  it("#13 元の人数=目標人数（倍率1倍）: 米2合はそのまま2合", () => {
    const r = scaleRecipe(4, 4, [{ name: "米", amount: 2, unit: "合" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ratio).toBe(1);
    expect(r.items[0].scaledAmount).toBe(2);
  });

  it("#14 極端に小さい倍率でも0個にならない（最小値保証）", () => {
    const r = scaleRecipe(100, 1, [{ name: "塩", amount: 1, unit: "個" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0].scaledAmount).toBe(1);
    expect(r.items[0].clampedToMin).toBe(true);
  });

  it("#15 複数材料を同時にスケール", () => {
    const ingredients: Ingredient[] = [
      { name: "米", amount: 2, unit: "合" },
      { name: "塩", amount: 5, unit: "g" },
    ];
    const r = scaleRecipe(4, 6, ingredients);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0].scaledAmount).toBe(3);
    expect(r.items[1].scaledAmount).toBe(7.5);
  });

  it("2行目以降が不正な場合、行番号つきのエラーになる", () => {
    const r = scaleRecipe(4, 6, [
      { name: "米", amount: 2, unit: "合" },
      { name: "", amount: 1, unit: "g" },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("2行目");
  });
});

describe("classifyUnit", () => {
  it("大さじ・小さじ・カップはspoon", () => {
    expect(classifyUnit("大さじ")).toBe("spoon");
    expect(classifyUnit("小さじ")).toBe("spoon");
    expect(classifyUnit("カップ")).toBe("spoon");
  });

  it("個・本・枚などはcount", () => {
    expect(classifyUnit("個")).toBe("count");
    expect(classifyUnit("本")).toBe("count");
    expect(classifyUnit("枚")).toBe("count");
  });

  it("g・mlや未知の単位・空文字はweight_volume（既定値）", () => {
    expect(classifyUnit("g")).toBe("weight_volume");
    expect(classifyUnit("ml")).toBe("weight_volume");
    expect(classifyUnit("合")).toBe("weight_volume");
    expect(classifyUnit("")).toBe("weight_volume");
    expect(classifyUnit("謎の単位")).toBe("weight_volume");
  });
});

describe("roundAmount", () => {
  it("weight_volume系は小数第1位に丸める", () => {
    expect(roundAmount(103.44, "g").value).toBe(103.4);
  });

  it("spoon系は0.5刻みに丸める", () => {
    expect(roundAmount(1.2, "大さじ").value).toBe(1);
    expect(roundAmount(1.3, "大さじ").value).toBe(1.5);
  });

  it("count系は整数に丸める", () => {
    expect(roundAmount(2.4, "個").value).toBe(2);
    expect(roundAmount(2.6, "個").value).toBe(3);
  });

  it("丸めた結果が0でも元の値が正なら最小刻みに引き上げる", () => {
    const r = roundAmount(0.02, "g");
    expect(r.value).toBe(0.1);
    expect(r.clamped).toBe(true);
  });

  it("元の値が0以下なら引き上げない（呼び出し側でバリデーション済み想定だが念のため）", () => {
    const r = roundAmount(0, "g");
    expect(r.value).toBe(0);
    expect(r.clamped).toBe(false);
  });
});

describe("fmtAmount / fmtRatio", () => {
  it("整数は小数点なしで表示する", () => {
    expect(fmtAmount(4)).toBe("4");
  });

  it("小数はそのまま表示する", () => {
    expect(fmtAmount(2.5)).toBe("2.5");
  });

  it("fmtRatioは「◯倍」の形式で表示する", () => {
    expect(fmtRatio(1.5)).toBe("1.5倍");
    expect(fmtRatio(2)).toBe("2倍");
  });
});
