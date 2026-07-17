/*
 * 買い物リスト自動生成（P2-T23）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t23-kaimono-list-jidou-seisei.md
 *
 * 献立自動提案（Q3-16 kondate-teian）のデータ・部品をそのまま流用する（docs/02 #44、#40の拡張）。
 * 新しいデータファイルは作らず、data/kondate/{recipes,ingredients}.json を kondateData 経由で参照する。
 *
 * ★重要な設計上の制約（正直な設計。仕様書「前提となるデータ制約」参照）★
 * data/kondate/recipes.json の各レシピの ingredients は { id, role } のみを持ち、分量（数量・単位）を
 * 一切持たない。存在しない分量データを仮定して合算することはしない。代わりに「食材id + role」を
 * 集計のキーとし、選択したレシピのうち何品でその組を必要とするか（使用回数）を数える。
 * role が異なれば実質的に別物として扱い、1行に合算しない（仕様書「集計の単位」参照）。
 */

import {
  kondateData,
  ingredientMap,
  type KondateData,
  type Recipe,
  type Course,
  type IngredientRole,
} from "@/lib/tools/impl/kondate-teian";

export type { Course, IngredientRole } from "@/lib/tools/impl/kondate-teian";

/** role の日本語ラベル。物理単位データがないため、role を「実質的な単位区分」として扱う */
export const ROLE_LABEL: Record<IngredientRole, string> = {
  main: "主材料",
  sub: "副材料",
  garnish: "薬味・付け合わせ",
  seasoning: "調味料",
};

/** 買い物のしやすさを優先した role の表示順 */
export const ROLE_ORDER: readonly IngredientRole[] = ["main", "sub", "garnish", "seasoning"];

export const SHELF_LABEL: Record<string, string> = {
  room: "常温",
  fridge: "冷蔵",
  freezer: "冷凍",
};

/** 常備度（1〜5）がこの値以上なら「常備していることが多い」注記の対象にする */
export const LIKELY_ON_HAND_COMMONNESS = 4;

export interface RecipeSummary {
  id: string;
  name: string;
  course: Course;
}

export interface ShoppingListItem {
  ingredientId: string;
  name: string;
  role: IngredientRole;
  roleLabel: string;
  /** この (ingredientId, role) を必要とする、選択済みレシピの数 */
  count: number;
  /** 使用するレシピ名（重複なし、レシピid昇順） */
  recipeNames: string[];
  category: string;
  shelf: string;
  /** 常備度1〜5。ingredients.json に存在しない食材は1にフォールバックする */
  commonness: number;
  /** 常備していることが多い食材か（保証ではない。仕様書「常備品への配慮」参照） */
  likelyOnHand: boolean;
}

export interface ShoppingListResult {
  /** 実在した選択済みレシピ（入力順序に依存せず id 昇順に正規化） */
  usedRecipes: RecipeSummary[];
  /** 買い物リストの各行。shelf → ingredientId → role の順に安定ソート */
  items: ShoppingListItem[];
  /** 入力に含まれていたが data に存在しなかったレシピid（id昇順） */
  unknownRecipeIds: string[];
}

const SHELF_ORDER: Record<string, number> = { room: 0, fridge: 1, freezer: 2 };

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * data.recipes をコースごとに分類し、id昇順で返す（UIのレシピ選択リスト用）。
 * kondate-teian の candidatePool と同じく、収録順ではなく id 順に安定させる。
 */
export function groupRecipesByCourse(data: KondateData = kondateData): Record<Course, Recipe[]> {
  const groups: Record<Course, Recipe[]> = { main: [], side: [], soup: [] };
  for (const r of data.recipes) groups[r.course].push(r);
  groups.main.sort(byId);
  groups.side.sort(byId);
  groups.soup.sort(byId);
  return groups;
}

/**
 * 選択されたレシピidから買い物リストを組み立てる（★純関数★）。
 * 乱数・日時・DOM等への依存はない。同じ入力なら常に同じ出力になる。
 */
export function buildShoppingList(
  recipeIds: readonly string[],
  data: KondateData = kondateData,
): ShoppingListResult {
  const recipeMap = new Map<string, Recipe>();
  for (const r of data.recipes) recipeMap.set(r.id, r);
  const ings = ingredientMap(data);

  // 重複・順序に依存しないよう、まず id の集合として正規化する
  const uniqueIds = Array.from(new Set(recipeIds));
  const usedRecipesRaw: Recipe[] = [];
  const unknownRecipeIds: string[] = [];
  for (const id of uniqueIds) {
    const r = recipeMap.get(id);
    if (r) usedRecipesRaw.push(r);
    else unknownRecipeIds.push(id);
  }
  usedRecipesRaw.sort(byId);

  // キー = `${ingredientId}::${role}`。同じレシピからの重複列挙は Set で1回に潰す
  const groups = new Map<
    string,
    { ingredientId: string; role: IngredientRole; recipeIds: Set<string> }
  >();
  for (const recipe of usedRecipesRaw) {
    for (const ri of recipe.ingredients) {
      const key = `${ri.id}::${ri.role}`;
      let g = groups.get(key);
      if (!g) {
        g = { ingredientId: ri.id, role: ri.role, recipeIds: new Set() };
        groups.set(key, g);
      }
      g.recipeIds.add(recipe.id);
    }
  }

  const items: ShoppingListItem[] = [];
  for (const g of groups.values()) {
    const ing = ings.get(g.ingredientId);
    const recipeNames = Array.from(g.recipeIds)
      .sort()
      .map((rid) => recipeMap.get(rid)?.name ?? rid);
    const commonness = ing?.commonness ?? 1;
    items.push({
      ingredientId: g.ingredientId,
      name: ing?.name ?? g.ingredientId,
      role: g.role,
      roleLabel: ROLE_LABEL[g.role],
      count: g.recipeIds.size,
      recipeNames,
      category: ing?.category ?? "other",
      shelf: ing?.shelf ?? "room",
      commonness,
      likelyOnHand: commonness >= LIKELY_ON_HAND_COMMONNESS,
    });
  }

  items.sort((a, b) => {
    const shelfDiff = (SHELF_ORDER[a.shelf] ?? 0) - (SHELF_ORDER[b.shelf] ?? 0);
    if (shelfDiff !== 0) return shelfDiff;
    if (a.ingredientId !== b.ingredientId) return a.ingredientId < b.ingredientId ? -1 : 1;
    return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
  });

  return {
    usedRecipes: usedRecipesRaw.map((r) => ({ id: r.id, name: r.name, course: r.course })),
    items,
    unknownRecipeIds: unknownRecipeIds.sort(),
  };
}

// ---------------------------------------------------------------- URL（kondate-teian の encode/decode と同じ設計）

/** 選択レシピidをURLクエリ用の文字列にする（id昇順に正規化してから結合。呼び出し側が history.replaceState する） */
export function encodeSelectedRecipeIds(recipeIds: readonly string[]): string {
  const p = new URLSearchParams();
  const normalized = Array.from(new Set(recipeIds)).sort();
  if (normalized.length > 0) p.set("r", normalized.join(","));
  return p.toString();
}

/** URLクエリから選択レシピidを読み出す。空文字・不正な要素は取り除く（壊れたURLで真っ白にしない） */
export function decodeSelectedRecipeIds(query: string): string[] {
  const p = new URLSearchParams(query);
  const raw = p.get("r") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}
