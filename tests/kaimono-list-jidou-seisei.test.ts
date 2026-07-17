import { describe, expect, it } from "vitest";
import {
  buildShoppingList,
  groupRecipesByCourse,
  encodeSelectedRecipeIds,
  decodeSelectedRecipeIds,
  LIKELY_ON_HAND_COMMONNESS,
} from "@/components/tools/impl/KaimonoListJidouSeisei.calc";
import { kondateData, type KondateData } from "@/lib/tools/impl/kondate-teian";
import ingredientsJson from "@/data/kondate/ingredients.json";

/*
 * 買い物リスト自動生成（P2-T23）のテスト。
 * テストケース表は specs/b-tools/p2-t23-kaimono-list-jidou-seisei.md と対応する（#1〜12）。
 * 前半は合成フィクスチャ（データの将来変更に影響されない決定的なテスト）、
 * 後半は実データ（data/kondate）を使った健全性・整合性の確認。
 */

// ---------------------------------------------------------------- 合成フィクスチャ

const FIXTURE: KondateData = {
  version: "test",
  algorithmVersion: 1,
  disclaimer: {
    intro: "",
    allergy: "",
    nutrition: "",
    time: "",
    pregnancy: "",
    data: "",
  },
  allowedTags: [],
  minimumCounts: { main: 1, side: 1, soup: 1 },
  ingredients: [
    { id: "tofu", name: "豆腐", category: "soy", shelf: "fridge", excludable: true, commonness: 2 },
    { id: "negi", name: "ねぎ", category: "vegetable", shelf: "fridge", excludable: true, commonness: 2 },
    { id: "shoyu", name: "しょうゆ", category: "seasoning", shelf: "room", excludable: false, commonness: 5 },
  ],
  recipes: [
    {
      id: "r-a",
      name: "レシピA",
      course: "main",
      cookTimeMin: 10,
      genre: "japanese",
      method: "boil",
      mainIngredientId: "tofu",
      mainCategory: "soy",
      ingredients: [
        { id: "tofu", role: "main" },
        { id: "shoyu", role: "seasoning" },
      ],
      tags: [],
      servingsBase: 2,
      scalable: true,
      season: ["all"],
      source: "original",
      weight: 1,
    },
    {
      id: "r-b",
      name: "レシピB",
      course: "side",
      cookTimeMin: 5,
      genre: "japanese",
      method: "raw",
      mainIngredientId: "negi",
      mainCategory: "vegetable",
      ingredients: [
        { id: "negi", role: "sub" },
        { id: "shoyu", role: "seasoning" },
      ],
      tags: [],
      servingsBase: 2,
      scalable: true,
      season: ["all"],
      source: "original",
      weight: 1,
    },
    {
      id: "r-c",
      name: "レシピC",
      course: "main",
      cookTimeMin: 8,
      genre: "japanese",
      method: "raw",
      mainIngredientId: "negi",
      mainCategory: "vegetable",
      ingredients: [{ id: "negi", role: "main" }],
      tags: [],
      servingsBase: 2,
      scalable: true,
      season: ["all"],
      source: "original",
      weight: 1,
    },
    {
      id: "r-d",
      name: "レシピD（食材マスタ未登録の食材を含む）",
      course: "soup",
      cookTimeMin: 3,
      genre: "japanese",
      method: "boil",
      mainIngredientId: "ghost-ingredient",
      mainCategory: "other",
      ingredients: [{ id: "ghost-ingredient", role: "seasoning" }],
      tags: [],
      servingsBase: 2,
      scalable: true,
      season: ["all"],
      source: "original",
      weight: 1,
    },
  ],
};

describe("buildShoppingList（合成フィクスチャ）", () => {
  it("#1 レシピ0件選択はエラーにせず空リストを返す", () => {
    const r = buildShoppingList([], FIXTURE);
    expect(r.items).toEqual([]);
    expect(r.usedRecipes).toEqual([]);
    expect(r.unknownRecipeIds).toEqual([]);
  });

  it("#2 存在しないレシピidは無視して unknownRecipeIds に集める", () => {
    const r = buildShoppingList(["存在しないid"], FIXTURE);
    expect(r.items).toEqual([]);
    expect(r.usedRecipes).toEqual([]);
    expect(r.unknownRecipeIds).toEqual(["存在しないid"]);
  });

  it("#3 1件選択: 全食材が count=1 で並ぶ", () => {
    const r = buildShoppingList(["r-a"], FIXTURE);
    expect(r.usedRecipes).toEqual([{ id: "r-a", name: "レシピA", course: "main" }]);
    expect(r.items).toHaveLength(2);
    const tofu = r.items.find((i) => i.ingredientId === "tofu");
    expect(tofu?.count).toBe(1);
    expect(tofu?.recipeNames).toEqual(["レシピA"]);
    expect(tofu?.role).toBe("main");
  });

  it("#4 同一レシピidの重複指定は1回分に正規化される", () => {
    const once = buildShoppingList(["r-a"], FIXTURE);
    const twice = buildShoppingList(["r-a", "r-a"], FIXTURE);
    expect(twice).toEqual(once);
  });

  it("#5 同じ食材・同じ役割は複数レシピをまたいで合算される（しょうゆ=調味料がr-a・r-bの両方に登場）", () => {
    const r = buildShoppingList(["r-a", "r-b"], FIXTURE);
    const shoyu = r.items.find((i) => i.ingredientId === "shoyu");
    expect(shoyu?.count).toBe(2);
    expect(shoyu?.recipeNames).toEqual(["レシピA", "レシピB"]);
  });

  it("#6 同じ食材でも役割が違えば合算せず別行になる（ねぎ: r-bはsub、r-cはmain）", () => {
    const r = buildShoppingList(["r-b", "r-c"], FIXTURE);
    const negiItems = r.items.filter((i) => i.ingredientId === "negi");
    expect(negiItems).toHaveLength(2);
    const roles = negiItems.map((i) => i.role).sort();
    expect(roles).toEqual(["main", "sub"]);
    for (const item of negiItems) {
      expect(item.count).toBe(1);
    }
  });

  it("#8 items の並び順は実行のたびに一致する（決定的なソート）", () => {
    const r1 = buildShoppingList(["r-a", "r-b", "r-c"], FIXTURE);
    const r2 = buildShoppingList(["r-a", "r-b", "r-c"], FIXTURE);
    expect(r1.items.map((i) => `${i.ingredientId}:${i.role}`)).toEqual(
      r2.items.map((i) => `${i.ingredientId}:${i.role}`),
    );
  });

  it("#10 入力順序を入れ替えても結果は変わらない（順序に依存しない正規化）", () => {
    const a = buildShoppingList(["r-a", "r-b"], FIXTURE);
    const b = buildShoppingList(["r-b", "r-a"], FIXTURE);
    expect(a).toEqual(b);
  });

  it("#11 常備度が高い食材（しょうゆ=5）は likelyOnHand=true、低い食材（ねぎ=2）は false", () => {
    const r = buildShoppingList(["r-a"], FIXTURE);
    const shoyu = r.items.find((i) => i.ingredientId === "shoyu");
    expect(shoyu?.commonness).toBeGreaterThanOrEqual(LIKELY_ON_HAND_COMMONNESS);
    expect(shoyu?.likelyOnHand).toBe(true);

    const r2 = buildShoppingList(["r-c"], FIXTURE);
    const negi = r2.items.find((i) => i.ingredientId === "negi");
    expect(negi?.likelyOnHand).toBe(false);
  });

  it("#12 食材マスタに存在しない食材id: nameがidにフォールバックし、クラッシュしない", () => {
    const r = buildShoppingList(["r-d"], FIXTURE);
    expect(r.items).toHaveLength(1);
    const ghost = r.items[0];
    expect(ghost.ingredientId).toBe("ghost-ingredient");
    expect(ghost.name).toBe("ghost-ingredient");
    expect(ghost.category).toBe("other");
    expect(ghost.shelf).toBe("room");
    expect(ghost.commonness).toBe(1);
    expect(ghost.likelyOnHand).toBe(false);
  });

  it("複数レシピを組み合わせても、レシピにない食材は登場しない（r-dを含まなければ ghost-ingredient は出ない）", () => {
    const r = buildShoppingList(["r-a", "r-b", "r-c"], FIXTURE);
    expect(r.items.some((i) => i.ingredientId === "ghost-ingredient")).toBe(false);
  });
});

describe("buildShoppingList（実データ: data/kondate）", () => {
  it("#7 全76レシピを選択してもクラッシュせず集計できる", () => {
    const allIds = kondateData.recipes.map((r) => r.id);
    const r = buildShoppingList(allIds);
    expect(r.usedRecipes).toHaveLength(kondateData.recipes.length);
    expect(r.unknownRecipeIds).toEqual([]);
    expect(r.items.length).toBeGreaterThan(0);
  });

  it("#9 各itemのcategory/shelf/commonnessはingredients.jsonのマスタ値と一致する", () => {
    const allIds = kondateData.recipes.map((r) => r.id);
    const r = buildShoppingList(allIds);
    const master = new Map(ingredientsJson.ingredients.map((i) => [i.id, i]));
    for (const item of r.items) {
      const m = master.get(item.ingredientId);
      expect(m).toBeDefined();
      expect(item.category).toBe(m?.category);
      expect(item.shelf).toBe(m?.shelf);
      expect(item.commonness).toBe(m?.commonness);
    }
  });

  it("実データ: 玉ねぎ(onion)は主材料(onion-soup)と副材料(aji-nanbanzuke)の両方で使われ、別行になる", () => {
    const r = buildShoppingList(["onion-soup", "aji-nanbanzuke"]);
    const onionItems = r.items.filter((i) => i.ingredientId === "onion");
    expect(onionItems).toHaveLength(2);
    expect(onionItems.map((i) => i.role).sort()).toEqual(["main", "sub"]);
  });

  it("実データ: しょうゆ(soy-sauce)が調味料として複数レシピで使われる場合は合算される", () => {
    const r = buildShoppingList(["aji-nanbanzuke", "buri-teriyaki"]);
    const shoyu = r.items.find((i) => i.ingredientId === "soy-sauce" && i.role === "seasoning");
    expect(shoyu?.count).toBe(2);
    expect(shoyu?.recipeNames).toHaveLength(2);
  });

  it("items は shelf → ingredientId → role の順で安定ソートされる", () => {
    const allIds = kondateData.recipes.map((r) => r.id);
    const r = buildShoppingList(allIds);
    const shelfRank: Record<string, number> = { room: 0, fridge: 1, freezer: 2 };
    for (let i = 1; i < r.items.length; i++) {
      const prev = r.items[i - 1];
      const cur = r.items[i];
      const prevRank = shelfRank[prev.shelf] ?? 0;
      const curRank = shelfRank[cur.shelf] ?? 0;
      expect(curRank).toBeGreaterThanOrEqual(prevRank);
    }
  });
});

describe("groupRecipesByCourse", () => {
  it("main/side/soupの3群に分類し、各群はid昇順である", () => {
    const groups = groupRecipesByCourse(kondateData);
    expect(groups.main.length + groups.side.length + groups.soup.length).toBe(
      kondateData.recipes.length,
    );
    for (const course of ["main", "side", "soup"] as const) {
      const ids = groups[course].map((r) => r.id);
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
      for (const r of groups[course]) {
        expect(r.course).toBe(course);
      }
    }
  });
});

describe("encodeSelectedRecipeIds / decodeSelectedRecipeIds", () => {
  it("id昇順に正規化してエンコードする", () => {
    const q = encodeSelectedRecipeIds(["r-b", "r-a", "r-a"]);
    expect(q).toBe("r=r-a%2Cr-b");
  });

  it("空配列はrパラメータを付けない", () => {
    expect(encodeSelectedRecipeIds([])).toBe("");
  });

  it("エンコード→デコードで往復できる", () => {
    const q = encodeSelectedRecipeIds(["r-a", "r-b", "r-c"]);
    expect(decodeSelectedRecipeIds(q)).toEqual(["r-a", "r-b", "r-c"]);
  });

  it("不正・空の要素を含むクエリでもクラッシュせず取り除く", () => {
    expect(decodeSelectedRecipeIds("r=r-a,,%20,r-b")).toEqual(["r-a", "r-b"]);
    expect(decodeSelectedRecipeIds("")).toEqual([]);
    expect(decodeSelectedRecipeIds("x=1")).toEqual([]);
  });
});
