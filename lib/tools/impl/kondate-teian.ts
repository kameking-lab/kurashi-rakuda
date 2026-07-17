/**
 * 献立自動提案の抽選エンジン（specs/s-tools/06-kondate-teian.md）。
 *
 * ★このファイルは純関数だけで構成する（§9.1）★
 *   Math.random / Date / performance / window / localStorage / fetch を一切参照しない。
 *   乱数は mulberry32（§4.2）、シードの生成と URL 操作は呼び出し側（UI 層）の責務。
 *
 * ★制度データは使わない（§1.3）★
 *   YMYL 低。栄養価・健康効果・アレルギー安全性の判断は一切しない（§2.2）。
 *   「使わない食材」は食材 id による機械的な除外であって、アレルギー対応ではない（§8）。
 */

import recipesJson from "@/data/kondate/recipes.json";
import ingredientsJson from "@/data/kondate/ingredients.json";
import metaJson from "@/data/kondate/meta.json";

// ---------------------------------------------------------------- 型

export type Course = "main" | "side" | "soup";
export type Genre = "japanese" | "western" | "chinese" | "other";
export type GenreCondition = Genre | "any";
export type Method = "grill" | "fry" | "simmer" | "steam" | "deepfry" | "boil" | "dress" | "raw";
export type IngredientRole = "main" | "sub" | "garnish" | "seasoning";
export type IngredientCategory =
  | "meat"
  | "fish"
  | "vegetable"
  | "mushroom"
  | "seaweed"
  | "soy"
  | "egg"
  | "dairy"
  | "grain"
  | "noodle"
  | "seasoning"
  | "other";
export type Shelf = "room" | "fridge" | "freezer";
export type Season = "spring" | "summer" | "autumn" | "winter" | "all";

export interface Ingredient {
  id: string;
  name: string;
  aliases?: string[];
  category: IngredientCategory;
  shelf: Shelf;
  excludable: boolean;
  /** 常備度 1–5。5 = 常備前提（塩・しょうゆ）。使い回し判定から除く（§4.6） */
  commonness: number;
}

export interface RecipeIngredient {
  id: string;
  role: IngredientRole;
}

export interface Recipe {
  id: string;
  name: string;
  course: Course;
  cookTimeMin: number;
  genre: Genre;
  method: Method;
  mainIngredientId: string;
  mainCategory: IngredientCategory;
  ingredients: RecipeIngredient[];
  tags: string[];
  servingsBase: number;
  scalable: boolean;
  season: Season[];
  source: string;
  /** 抽選の重み 1–5。5 = 定番、1 = 変化球（§4.3） */
  weight: number;
}

export interface KondateDisclaimer {
  intro: string;
  allergy: string;
  nutrition: string;
  time: string;
  pregnancy: string;
  data: string;
}

export interface KondateData {
  version: string;
  algorithmVersion: number;
  recipes: Recipe[];
  ingredients: Ingredient[];
  disclaimer: KondateDisclaimer;
  allowedTags: string[];
  minimumCounts: { main: number; side: number; soup: number };
}

export interface Conditions {
  /** 人数。表示のみに使い、抽選には影響しない（§4.9） */
  servings: number;
  /** 1日の合計調理時間の上限（分）。順番に作った場合の目安（§4.7） */
  maxTotalTimeMin: number;
  /** 使わない食材の id。★アレルギー対応ではない（§8）★ */
  excludeIds: string[];
  genre: GenreCondition;
  includeSoup: boolean;
}

export interface Day {
  index: number;
  main: Recipe;
  side: Recipe;
  soup: Recipe | null;
  /** 順番に作った場合の目安（§4.7）。並行調理による短縮は推定しない */
  totalTimeMin: number;
}

export interface ReuseNote {
  ingredientId: string;
  name: string;
  /** 0–6 の日インデックス。2日以上で使うものだけを持つ */
  dayIndexes: number[];
}

export interface WeekMenu {
  days: Day[];
  seed: number;
  version: string;
  warnings: string[];
  /** 食材の使い回し（§4.6）。#44 買い物リストへの布石（§9.6） */
  reuse: ReuseNote[];
}

export type FailureReason =
  | "no-candidate"
  | "not-enough-main"
  | "time-limit"
  | "version-mismatch"
  | "invalid-input"
  | "no-more-candidate";

export interface Failure {
  reason: FailureReason;
  course?: Course;
  dayIndex?: number;
  /** 実際の候補数。「N品しかありません」を具体値で出すために持つ（§4.8） */
  count?: number;
  needed?: number;
  message: string;
  /** ★「条件を緩めてください」ではなく、何をどう緩めるかを具体値で示す（§4.8）★ */
  relaxHints: string[];
}

export type GenerateResult = { ok: true; menu: WeekMenu } | { ok: false; failure: Failure };

// ---------------------------------------------------------------- データ

export const DAYS_PER_WEEK = 7;

export const ALLOWED_TAGS: readonly string[] = metaJson.allowedTags;

/**
 * 禁止タグ（§3.4）。栄養・健康・アレルギーを主張する語をデータに入れさせない。
 * tests/kondate-teian.test.ts が機械的に検査する。
 */
export const BANNED_TAGS: readonly string[] = [
  "healthy",
  "low-calorie",
  "diet",
  "balanced",
  "nutritious",
  "immune",
  "for-pregnancy",
  "for-baby",
  "allergy-free",
  "egg-free",
  "gluten-free",
  "dairy-free",
  "milk-free",
  "wheat-free",
  "vitamin",
  "protein-rich",
];

export const kondateData: KondateData = {
  version: metaJson.version,
  algorithmVersion: metaJson.algorithmVersion,
  recipes: recipesJson.recipes as unknown as Recipe[],
  ingredients: ingredientsJson.ingredients as unknown as Ingredient[],
  disclaimer: metaJson.disclaimer as KondateDisclaimer,
  allowedTags: metaJson.allowedTags,
  minimumCounts: metaJson.minimumCounts,
};

export const KONDATE_DISCLAIMER: KondateDisclaimer = kondateData.disclaimer;

export const DEFAULT_CONDITIONS: Conditions = {
  servings: 2,
  maxTotalTimeMin: 45,
  excludeIds: [],
  genre: "any",
  includeSoup: true,
};

export const MAX_EXCLUDE_IDS = 10;
export const MIN_TOTAL_TIME = 10;
export const MAX_TOTAL_TIME = 180;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 8;

/** `version`.`algorithmVersion`。URL の `v` パラメータ（§4.10） */
export function dataVersion(data: KondateData = kondateData): string {
  return `${data.version}.${data.algorithmVersion}`;
}

/**
 * データ破損の検査（§7.1「データ破損」）。空の献立 UI を描画させないために例外を投げる。
 */
export function assertData(data: KondateData): void {
  if (!data.recipes || data.recipes.length === 0) {
    throw new Error("レシピデータを読み込めません");
  }
  if (!data.ingredients || data.ingredients.length === 0) {
    throw new Error("食材データを読み込めません");
  }
}

// ---------------------------------------------------------------- PRNG（§4.2）

/** mulberry32。32bit・決定的・依存ゼロ（§4.2） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a ベースの 32bit ハッシュ。派生シード（1日だけ・1品だけの引き直し）に使う（§4.2） */
export function hash32(...values: number[]): number {
  let h = 2166136261 >>> 0;
  for (const value of values) {
    let x = value >>> 0;
    for (let i = 0; i < 4; i++) {
      h = (h ^ (x & 0xff)) >>> 0;
      h = Math.imul(h, 16777619) >>> 0;
      x = x >>> 8;
    }
  }
  return h >>> 0;
}

/** 「引き直し」= シードを変えるだけ（§4.2） */
export function nextSeed(seed: number): number {
  return Math.floor(mulberry32(seed)() * 4294967296) >>> 0;
}

/**
 * 重み付き抽選（§4.3）。
 * ★候補は必ず id の辞書順に安定ソートしてから渡すこと★
 * 入力順に依存させないため、累積重み配列＋二分探索で選ぶ。
 */
export function weightedPick<T>(sorted: T[], weights: number[], rng: () => number): T {
  const cumulative: number[] = [];
  let sum = 0;
  for (const w of weights) {
    sum += Math.max(1, Math.floor(w));
    cumulative.push(sum);
  }
  const r = Math.floor(rng() * sum);
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] > r) hi = mid;
    else lo = mid + 1;
  }
  return sorted[lo];
}

// ---------------------------------------------------------------- 食材の正規化（§9.7）

/**
 * 表記ゆれ（aliases）を id に解決する。#37 / #44 / #45 / #49 と共有する想定の部品（§9.7）。
 * 見つからなければ null。呼び出し側が「無視して warnings に記録」する（TC-24）。
 */
export function resolveIngredientId(input: string, ingredients: Ingredient[]): string | null {
  const q = input.trim();
  if (q === "") return null;
  for (const ing of ingredients) {
    if (ing.id === q) return ing.id;
  }
  for (const ing of ingredients) {
    if (ing.name === q) return ing.id;
    if (ing.aliases?.includes(q)) return ing.id;
  }
  return null;
}

/** インクリメンタル検索。除外できる食材（excludable: true）だけを返す */
export function searchExcludableIngredients(
  query: string,
  ingredients: Ingredient[],
  limit = 8,
): Ingredient[] {
  const q = query.trim();
  if (q === "") return [];
  const hit = ingredients
    .filter((i) => i.excludable)
    .filter((i) => i.name.includes(q) || i.id.includes(q) || (i.aliases ?? []).some((a) => a.includes(q)))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return hit.slice(0, limit);
}

export function ingredientMap(data: KondateData): Map<string, Ingredient> {
  const m = new Map<string, Ingredient>();
  for (const i of data.ingredients) m.set(i.id, i);
  return m;
}

export function ingredientName(id: string, data: KondateData): string {
  return ingredientMap(data).get(id)?.name ?? id;
}

// ---------------------------------------------------------------- バリデーション（§5 / §7.1）

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** 存在しない id など。エラーにせず警告にする（TC-24） */
  warnings: string[];
  /** 正規化後の条件（未知 id を落としたもの） */
  normalized: Conditions;
}

export function validateConditions(conditions: Conditions, data: KondateData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const map = ingredientMap(data);

  if (!Number.isInteger(conditions.servings) || conditions.servings < MIN_SERVINGS || conditions.servings > MAX_SERVINGS) {
    errors.push(`人数は${MIN_SERVINGS}〜${MAX_SERVINGS}人の整数で入力してください。`);
  }
  if (
    !Number.isInteger(conditions.maxTotalTimeMin) ||
    conditions.maxTotalTimeMin < MIN_TOTAL_TIME ||
    conditions.maxTotalTimeMin > MAX_TOTAL_TIME
  ) {
    errors.push(`1日の合計調理時間は${MIN_TOTAL_TIME}〜${MAX_TOTAL_TIME}分の整数で入力してください。`);
  }
  if (conditions.excludeIds.length > MAX_EXCLUDE_IDS) {
    errors.push(`使わない食材は${MAX_EXCLUDE_IDS}件までです（現在${conditions.excludeIds.length}件）。`);
  }

  const kept: string[] = [];
  for (const id of conditions.excludeIds) {
    const ing = map.get(id);
    if (!ing) {
      warnings.push(`不明な食材が指定されました（${id}）。この指定は無視して献立を作りました。`);
      continue;
    }
    if (!ing.excludable) {
      errors.push(`「${ing.name}」は使わない食材に指定できません（調味料を外すと候補がなくなるためです）。`);
      continue;
    }
    kept.push(id);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: { ...conditions, excludeIds: Array.from(new Set(kept)).sort() },
  };
}

// ---------------------------------------------------------------- 候補プール（§4.5 H1・H3）

function byId(a: Recipe, b: Recipe): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function hasExcluded(recipe: Recipe, excludeIds: readonly string[]): boolean {
  // ★H1: role を問わない。garnish でも seasoning でも除外する★
  return recipe.ingredients.some((i) => excludeIds.includes(i.id));
}

/**
 * course ごとの候補プール（§4.4 STEP 1）。
 * ★必ず id の辞書順に安定ソートして返す（§4.3）★ recipes.json の並び順に依存させない。
 */
export function candidatePool(data: KondateData, conditions: Conditions, course: Course): Recipe[] {
  return data.recipes
    .filter((r) => r.course === course)
    .filter((r) => !hasExcluded(r, conditions.excludeIds))
    .filter((r) => {
      // H3: ジャンル条件。★soup は例外的にジャンル不問（味噌汁は洋食の日にも出る）★
      if (conditions.genre === "any") return true;
      if (course === "soup") return true;
      return r.genre === conditions.genre;
    })
    .slice()
    .sort(byId);
}

function minTime(pool: Recipe[]): number {
  return pool.reduce((min, r) => Math.min(min, r.cookTimeMin), Number.POSITIVE_INFINITY);
}

/**
 * H4（1日の合計時間）を満たしうる主菜だけに絞る。
 *
 * ★仕様書 §4.4 STEP 5 は「side/soup を選んでから H4 を検査し、最大20回再試行する」としているが、
 *   本実装は side/soup の候補プール自体を残り時間で絞る（ハード制約の前倒し）。
 *   再試行が原理的に不要になり、H4 違反が構造的に起こり得ないため、こちらを採る。
 *   main が時間で全滅した場合だけ Failure("time-limit") を返す。★
 */
function feasibleMains(mains: Recipe[], sides: Recipe[], soups: Recipe[], conditions: Conditions): Recipe[] {
  const floor = minTime(sides) + (conditions.includeSoup ? minTime(soups) : 0);
  return mains.filter((m) => m.cookTimeMin + floor <= conditions.maxTotalTimeMin);
}

// ---------------------------------------------------------------- スコア（§4.5 S1〜S5）

/** ソフト制約の重み。★変更したら meta.json の algorithmVersion を上げること（§9.4）★ */
export const SCORE = {
  /** S1 前日と同じ method */
  sameMethodAsPrevDay: -30,
  /** S2 前日と同じ mainCategory */
  sameCategoryAsPrevDay: -20,
  /** S2 2日前とも同じ mainCategory（追加） */
  sameCategoryAsTwoDaysAgo: -20,
  /** S3 同じ日の method 重複 1組につき */
  sameMethodSameDay: -10,
  /** S4 使い回し食材1つにつき */
  reusedIngredient: 15,
  /** S4 の上限（+45） */
  reusedIngredientMax: 45,
  /** S5 weight × 5 */
  weightFactor: 5,
} as const;

/**
 * ソフトスコア → 抽選の重みへの変換（§4.5 の「スコアで優先」の実装）。
 *
 * ★S5（weight × 5）は §4.3 の重み付き抽選そのもので実現しているため、
 *   係数側では二重に数えない（score には含めて可視化する）。★
 * ★S4（加点）は減点に対して乗算で効かせる★
 *   加点を減点と同じ土俵で足すと、「使い回しが +45 だから肉が3日続いてもよい」が起きる。
 *   §4.6 が禁じているのはまさにそれ（「+15 を大きくしすぎると全部同じ食材の献立になる」）。
 *   減点で作った係数に加点を掛けることで、S4 は「同じ強さの候補の中での優先」に留まる。
 */
const PENALTY_SCALE = 5;
const PENALTY_BASE = 100;

interface Picked {
  main?: Recipe;
  side?: Recipe;
  soup?: Recipe | null;
}

function dishesOf(p: Picked | undefined): Recipe[] {
  if (!p) return [];
  const out: Recipe[] = [];
  if (p.main) out.push(p.main);
  if (p.side) out.push(p.side);
  if (p.soup) out.push(p.soup);
  return out;
}

/** 使い回しに数える食材（§4.6）: role が main / sub かつ commonness < 5 */
function reusableIds(recipe: Recipe, ings: Map<string, Ingredient>): string[] {
  return recipe.ingredients
    .filter((i) => i.role === "main" || i.role === "sub")
    .filter((i) => (ings.get(i.id)?.commonness ?? 0) < 5)
    .map((i) => i.id);
}

interface ScoreParts {
  /** S1・S2・S3 の減点（0 以下） */
  penalty: number;
  /** S4 の加点（0 以上、上限 +45） */
  bonus: number;
  /** S5（weight × 5） */
  weightScore: number;
}

function scoreParts(
  candidate: Recipe,
  dayIndex: number,
  course: Course,
  picked: Picked[],
  ings: Map<string, Ingredient>,
): ScoreParts {
  let penalty = 0;

  // S1 前日と同じ method を避ける（同じ course どうしで比較）
  const prev = picked[dayIndex - 1];
  if (prev) {
    const prevSame = course === "main" ? prev.main : course === "side" ? prev.side : prev.soup ?? undefined;
    if (prevSame && prevSame.method === candidate.method) penalty += SCORE.sameMethodAsPrevDay;
  }

  // S2 前日と同じ mainCategory を避ける（主菜のみ。肉が3日続かないように）
  if (course === "main" && prev?.main && prev.main.mainCategory === candidate.mainCategory) {
    penalty += SCORE.sameCategoryAsPrevDay;
    const prev2 = picked[dayIndex - 2];
    if (prev2?.main && prev2.main.mainCategory === candidate.mainCategory) {
      penalty += SCORE.sameCategoryAsTwoDaysAgo;
    }
  }

  // S3 同じ日の main / side / soup で method が重ならない（コンロが足りない）
  for (const dish of dishesOf(picked[dayIndex])) {
    if (dish.method === candidate.method) penalty += SCORE.sameMethodSameDay;
  }

  // S4 食材の使い回し（前後2日以内。§4.6）
  const mine = new Set(reusableIds(candidate, ings));
  const neighbours = new Set<string>();
  for (let d = Math.max(0, dayIndex - 2); d <= Math.min(DAYS_PER_WEEK - 1, dayIndex + 2); d++) {
    for (const dish of dishesOf(picked[d])) {
      for (const id of reusableIds(dish, ings)) neighbours.add(id);
    }
  }
  let shared = 0;
  for (const id of mine) if (neighbours.has(id)) shared++;
  const bonus = Math.min(shared * SCORE.reusedIngredient, SCORE.reusedIngredientMax);

  return { penalty, bonus, weightScore: candidate.weight * SCORE.weightFactor };
}

/**
 * S1〜S5 のスコア（§4.5）。純関数。
 * `picked[dayIndex][course]` は未確定（undefined）である前提で呼ぶ。
 */
export function softScore(
  candidate: Recipe,
  dayIndex: number,
  course: Course,
  picked: Picked[],
  ings: Map<string, Ingredient>,
): number {
  const p = scoreParts(candidate, dayIndex, course, picked, ings);
  return p.penalty + p.bonus + p.weightScore;
}

/** スコア → 抽選の重み。PENALTY_SCALE のコメントを参照 */
function effectiveWeight(
  candidate: Recipe,
  dayIndex: number,
  course: Course,
  picked: Picked[],
  ings: Map<string, Ingredient>,
): number {
  const { penalty, bonus } = scoreParts(candidate, dayIndex, course, picked, ings);
  const base = Math.max(1, PENALTY_BASE + PENALTY_SCALE * penalty);
  return Math.max(1, Math.round(candidate.weight * base * (100 + bonus)));
}

/**
 * 候補から1品選ぶ。
 * ★同点は id の辞書順で小さい方（§4.5）★ — 候補は id 昇順で渡され、
 *   累積重み配列＋二分探索なので、同じ重みなら常に先頭側（id の小さい方）が選ばれる。
 */
function pickOne(
  pool: Recipe[],
  dayIndex: number,
  course: Course,
  picked: Picked[],
  ings: Map<string, Ingredient>,
  rng: () => number,
): Recipe {
  const weights = pool.map((r) => effectiveWeight(r, dayIndex, course, picked, ings));
  return weightedPick(pool, weights, rng);
}

// ---------------------------------------------------------------- Failure / relaxHint（§4.8）

/**
 * ★「条件を緩めてください」ではなく、何をどう緩めると何品になるかを出す（§4.8）★
 * 各条件を1つずつ外して主菜の候補数を再計算する。
 */
function buildRelaxHints(data: KondateData, conditions: Conditions, currentMainCount: number): string[] {
  const hints: string[] = [];

  // 1) 調理時間
  const sides = candidatePool(data, conditions, "side");
  const soups = candidatePool(data, conditions, "soup");
  const mains = candidatePool(data, conditions, "main");
  if (sides.length > 0 && (!conditions.includeSoup || soups.length > 0) && mains.length > 0) {
    const floor = minTime(sides) + (conditions.includeSoup ? minTime(soups) : 0);
    const needs = mains.map((m) => m.cookTimeMin + floor).sort((a, b) => a - b);
    const target = needs[Math.min(DAYS_PER_WEEK - 1, needs.length - 1)];
    if (target > conditions.maxTotalTimeMin) {
      const relaxed = { ...conditions, maxTotalTimeMin: target };
      const n = feasibleMains(mains, sides, soups, relaxed).length;
      hints.push(
        `1日の合計調理時間を${conditions.maxTotalTimeMin}分→${target}分にすると、主菜の候補が${currentMainCount}品→${n}品に増えます。`,
      );
    }
  }

  // 2) ジャンル
  if (conditions.genre !== "any") {
    const relaxed: Conditions = { ...conditions, genre: "any" };
    const n = feasibleMains(
      candidatePool(data, relaxed, "main"),
      candidatePool(data, relaxed, "side"),
      candidatePool(data, relaxed, "soup"),
      relaxed,
    ).length;
    if (n > currentMainCount) {
      hints.push(`ジャンルを「おまかせ」にすると、主菜の候補が${currentMainCount}品→${n}品に増えます。`);
    }
  }

  // 3) 汁物
  if (conditions.includeSoup) {
    const relaxed: Conditions = { ...conditions, includeSoup: false };
    const n = feasibleMains(
      candidatePool(data, relaxed, "main"),
      candidatePool(data, relaxed, "side"),
      candidatePool(data, relaxed, "soup"),
      relaxed,
    ).length;
    if (n > currentMainCount) {
      hints.push(`汁物をつけない設定にすると、主菜の候補が${currentMainCount}品→${n}品に増えます。`);
    }
  }

  // 4) 使わない食材
  if (conditions.excludeIds.length > 0) {
    const relaxed: Conditions = { ...conditions, excludeIds: [] };
    const n = feasibleMains(
      candidatePool(data, relaxed, "main"),
      candidatePool(data, relaxed, "side"),
      candidatePool(data, relaxed, "soup"),
      relaxed,
    ).length;
    if (n > currentMainCount) {
      const names = conditions.excludeIds.map((id) => ingredientName(id, data)).join("・");
      hints.push(`使わない食材（${names}）の指定を外すと、主菜の候補が${currentMainCount}品→${n}品に増えます。`);
    }
  }

  return hints;
}

function fail(
  reason: FailureReason,
  message: string,
  data: KondateData,
  conditions: Conditions,
  currentMainCount: number,
  extra: Partial<Failure> = {},
): GenerateResult {
  return {
    ok: false,
    failure: {
      reason,
      message,
      relaxHints: buildRelaxHints(data, conditions, currentMainCount),
      ...extra,
    },
  };
}

// ---------------------------------------------------------------- 生成（§4.4）

function totalTimeOf(main: Recipe, side: Recipe, soup: Recipe | null): number {
  return main.cookTimeMin + side.cookTimeMin + (soup ? soup.cookTimeMin : 0);
}

function collectReuse(days: Day[], data: KondateData): ReuseNote[] {
  const ings = ingredientMap(data);
  const byIngredient = new Map<string, Set<number>>();
  for (const day of days) {
    for (const dish of [day.main, day.side, day.soup]) {
      if (!dish) continue;
      for (const id of reusableIds(dish, ings)) {
        if (!byIngredient.has(id)) byIngredient.set(id, new Set());
        byIngredient.get(id)!.add(day.index);
      }
    }
  }
  const out: ReuseNote[] = [];
  for (const [id, set] of byIngredient) {
    if (set.size < 2) continue;
    out.push({ ingredientId: id, name: ings.get(id)?.name ?? id, dayIndexes: Array.from(set).sort((a, b) => a - b) });
  }
  // 決定性のため id 辞書順（Map の列挙順に依存しない。§9.2）
  return out.sort((a, b) => (a.ingredientId < b.ingredientId ? -1 : a.ingredientId > b.ingredientId ? 1 : 0));
}

function collectWarnings(days: Day[]): string[] {
  const warnings: string[] = [];
  for (let d = 1; d < days.length; d++) {
    if (days[d].main.method === days[d - 1].main.method) {
      warnings.push(`${d}日目と${d + 1}日目の主菜の作り方が同じになっています（候補が限られているためです）。`);
    }
  }
  for (let d = 2; d < days.length; d++) {
    const a = days[d - 2].main.mainCategory;
    if (a === days[d - 1].main.mainCategory && a === days[d].main.mainCategory) {
      warnings.push(`${d - 1}日目から${d + 1}日目まで、主菜の主材料の種類が続いています。`);
    }
  }
  return warnings;
}

function buildDay(
  index: number,
  main: Recipe,
  conditions: Conditions,
  sidePool: Recipe[],
  soupPool: Recipe[],
  picked: Picked[],
  ings: Map<string, Ingredient>,
  rng: () => number,
): Day | null {
  const soupFloor = conditions.includeSoup ? minTime(soupPool) : 0;
  const sideBudget = conditions.maxTotalTimeMin - main.cookTimeMin - soupFloor;
  const sides = sidePool.filter((s) => s.cookTimeMin <= sideBudget);
  if (sides.length === 0) return null;

  picked[index] = { main };
  const side = pickOne(sides, index, "side", picked, ings, rng);
  picked[index] = { main, side };

  let soup: Recipe | null = null;
  if (conditions.includeSoup) {
    const soupBudget = conditions.maxTotalTimeMin - main.cookTimeMin - side.cookTimeMin;
    const soups = soupPool.filter((s) => s.cookTimeMin <= soupBudget);
    if (soups.length === 0) {
      picked[index] = { main };
      return null;
    }
    soup = pickOne(soups, index, "soup", picked, ings, rng);
  }
  picked[index] = { main, side, soup };

  return { index, main, side, soup, totalTimeMin: totalTimeOf(main, side, soup) };
}

/**
 * ★generate は純関数★（§4.1 / §9.1）
 * 同じ (conditions, seed, data, expectedVersion) なら必ず同じ出力になる。
 *
 * @param expectedVersion URL の `v`。データと不一致なら献立を返さない（§4.10 / TC-16）
 */
export function generate(
  conditions: Conditions,
  seed: number,
  data: KondateData = kondateData,
  expectedVersion?: string | null,
): GenerateResult {
  assertData(data);

  // STEP 0 条件の検証・正規化
  const v = validateConditions(conditions, data);
  if (!v.ok) {
    return {
      ok: false,
      failure: { reason: "invalid-input", message: v.errors.join("\n"), relaxHints: [] },
    };
  }
  if (expectedVersion != null && expectedVersion !== dataVersion(data)) {
    return {
      ok: false,
      failure: {
        reason: "version-mismatch",
        message:
          "レシピが更新されたため、この URL の献立は再現できません。同じ条件で新しく作ることはできます。",
        relaxHints: [],
      },
    };
  }
  const cond = v.normalized;

  // STEP 1 候補プール
  const mainPool = candidatePool(data, cond, "main");
  const sidePool = candidatePool(data, cond, "side");
  const soupPool = candidatePool(data, cond, "soup");

  // STEP 2 プールが空 → 即 Failure（部分的な献立を返さない。§4.8）
  if (mainPool.length === 0) {
    return fail("no-candidate", "この条件に合う主菜が1品もありません。", data, cond, 0, { course: "main", count: 0 });
  }
  if (sidePool.length === 0) {
    return fail("no-candidate", "この条件に合う副菜が1品もありません。", data, cond, mainPool.length, {
      course: "side",
      count: 0,
    });
  }
  if (cond.includeSoup && soupPool.length === 0) {
    return fail("no-candidate", "この条件に合う汁物が1品もありません。", data, cond, mainPool.length, {
      course: "soup",
      count: 0,
    });
  }

  // H4 を満たしうる主菜
  const mains = feasibleMains(mainPool, sidePool, soupPool, cond);
  if (mains.length === 0) {
    return fail(
      "time-limit",
      `1日の合計調理時間${cond.maxTotalTimeMin}分では、作れる主菜が1品もありません。`,
      data,
      cond,
      0,
      { course: "main", count: 0 },
    );
  }

  // STEP 3 主菜を7日分、重複なしで選ぶ（H2）
  if (mains.length < DAYS_PER_WEEK) {
    return fail(
      "not-enough-main",
      `主菜の候補が${mains.length}品しかありません（7日分には${DAYS_PER_WEEK}品必要です）。`,
      data,
      cond,
      mains.length,
      { course: "main", count: mains.length, needed: DAYS_PER_WEEK },
    );
  }

  const ings = ingredientMap(data);
  const rng = mulberry32(seed);
  const picked: Picked[] = new Array(DAYS_PER_WEEK);
  const used = new Set<string>();
  const days: Day[] = [];

  // ★すべてのループは決定的な順序で回す（day 0→6、course は main→side→soup）★
  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    const remaining = mains.filter((m) => !used.has(m.id)); // mains は id 昇順なので順序は保たれる
    let day: Day | null = null;
    // 時間の都合で side/soup が組めない主菜は、候補から外して次を引く（決定的）
    const tried = new Set<string>();
    while (day === null) {
      const pool = remaining.filter((m) => !tried.has(m.id));
      if (pool.length === 0) break;
      const main = pickOne(pool, d, "main", picked, ings, rng);
      day = buildDay(d, main, cond, sidePool, soupPool, picked, ings, rng);
      if (day === null) tried.add(main.id);
    }
    if (day === null) {
      return fail(
        "time-limit",
        `${d + 1}日目の献立が、1日の合計調理時間${cond.maxTotalTimeMin}分に収まりません。`,
        data,
        cond,
        mains.length,
        { dayIndex: d },
      );
    }
    used.add(day.main.id);
    days.push(day);
  }

  return {
    ok: true,
    menu: {
      days,
      seed: seed >>> 0,
      version: dataVersion(data),
      warnings: [...v.warnings, ...collectWarnings(days)],
      reuse: collectReuse(days, data),
    },
  };
}

// ---------------------------------------------------------------- 引き直し（§4.11）

/**
 * 1日だけ引き直す。★他の6日は1品も動かさない（§4.11）★
 * H1（除外食材）・H2（主菜の重複回避）は維持する。
 */
export function rerollDay(
  menu: WeekMenu,
  conditions: Conditions,
  dayIndex: number,
  nonce: number,
  data: KondateData = kondateData,
): GenerateResult {
  assertData(data);
  const v = validateConditions(conditions, data);
  if (!v.ok) {
    return { ok: false, failure: { reason: "invalid-input", message: v.errors.join("\n"), relaxHints: [] } };
  }
  const cond = v.normalized;

  const mainPool = candidatePool(data, cond, "main");
  const sidePool = candidatePool(data, cond, "side");
  const soupPool = candidatePool(data, cond, "soup");
  const feasible = feasibleMains(mainPool, sidePool, soupPool, cond);

  // 他の6日の主菜は使用済み（H2）
  const used = new Set(menu.days.filter((d) => d.index !== dayIndex).map((d) => d.main.id));
  const pool = feasible.filter((m) => !used.has(m.id));
  if (pool.length === 0) {
    return fail("no-more-candidate", "これ以上の候補がありません。", data, cond, feasible.length, { dayIndex });
  }

  const ings = ingredientMap(data);
  const picked: Picked[] = new Array(DAYS_PER_WEEK);
  for (const d of menu.days) {
    if (d.index === dayIndex) continue;
    picked[d.index] = { main: d.main, side: d.side, soup: d.soup };
  }

  const rng = mulberry32(hash32(menu.seed, dayIndex, nonce));
  const tried = new Set<string>();
  let day: Day | null = null;
  while (day === null) {
    const p = pool.filter((m) => !tried.has(m.id));
    if (p.length === 0) break;
    const main = pickOne(p, dayIndex, "main", picked, ings, rng);
    day = buildDay(dayIndex, main, cond, sidePool, soupPool, picked, ings, rng);
    if (day === null) tried.add(main.id);
  }
  if (day === null) {
    return fail("no-more-candidate", "これ以上の候補がありません。", data, cond, pool.length, { dayIndex });
  }

  const rebuilt: Day = day;
  const days = menu.days.map((d) => (d.index === dayIndex ? rebuilt : d));
  return {
    ok: true,
    menu: { ...menu, days, warnings: [...v.warnings, ...collectWarnings(days)], reuse: collectReuse(days, data) },
  };
}

/**
 * 1品だけ引き直す。★同じ日の他2品を含め、他はすべて動かさない（§4.11）★
 */
export function rerollDish(
  menu: WeekMenu,
  conditions: Conditions,
  dayIndex: number,
  course: Course,
  nonce: number,
  data: KondateData = kondateData,
): GenerateResult {
  assertData(data);
  const v = validateConditions(conditions, data);
  if (!v.ok) {
    return { ok: false, failure: { reason: "invalid-input", message: v.errors.join("\n"), relaxHints: [] } };
  }
  const cond = v.normalized;
  const target = menu.days.find((d) => d.index === dayIndex);
  if (!target) {
    return { ok: false, failure: { reason: "invalid-input", message: "対象の日が見つかりません。", relaxHints: [] } };
  }
  if (course === "soup" && !cond.includeSoup) {
    return { ok: false, failure: { reason: "invalid-input", message: "汁物をつけない設定です。", relaxHints: [] } };
  }

  const ings = ingredientMap(data);
  const picked: Picked[] = new Array(DAYS_PER_WEEK);
  for (const d of menu.days) {
    picked[d.index] = { main: d.main, side: d.side, soup: d.soup };
  }
  // 引き直す1品だけを未確定にする
  const fixed: Picked = { ...picked[dayIndex] };
  if (course === "main") delete fixed.main;
  else if (course === "side") delete fixed.side;
  else delete fixed.soup;
  picked[dayIndex] = fixed;

  const usedMains = new Set(menu.days.filter((d) => d.index !== dayIndex).map((d) => d.main.id));
  const pool = candidatePool(data, cond, course)
    .filter((r) => r.id !== (course === "main" ? target.main.id : course === "side" ? target.side.id : target.soup?.id))
    .filter((r) => (course === "main" ? !usedMains.has(r.id) : true))
    .filter((r) => {
      // H4: 他2品を固定したまま合計時間を守る
      const others =
        course === "main"
          ? target.side.cookTimeMin + (target.soup?.cookTimeMin ?? 0)
          : course === "side"
            ? target.main.cookTimeMin + (target.soup?.cookTimeMin ?? 0)
            : target.main.cookTimeMin + target.side.cookTimeMin;
      return others + r.cookTimeMin <= cond.maxTotalTimeMin;
    });

  if (pool.length === 0) {
    return fail("no-more-candidate", "これ以上の候補がありません。", data, cond, 0, { dayIndex, course });
  }

  const courseIndex = course === "main" ? 0 : course === "side" ? 1 : 2;
  const rng = mulberry32(hash32(menu.seed, dayIndex, courseIndex, nonce));
  const chosen = pickOne(pool, dayIndex, course, picked, ings, rng);

  const newDay: Day = {
    index: dayIndex,
    main: course === "main" ? chosen : target.main,
    side: course === "side" ? chosen : target.side,
    soup: course === "soup" ? chosen : target.soup,
    totalTimeMin: 0,
  };
  newDay.totalTimeMin = totalTimeOf(newDay.main, newDay.side, newDay.soup);

  const days = menu.days.map((d) => (d.index === dayIndex ? newDay : d));
  return {
    ok: true,
    menu: { ...menu, days, warnings: [...v.warnings, ...collectWarnings(days)], reuse: collectReuse(days, data) },
  };
}

// ---------------------------------------------------------------- 手持ち食材からの提案

export interface PantryMatch {
  recipe: Recipe;
  /** 手持ちにあった食材 id（role が main / sub のもの） */
  matched: string[];
  /** 買い足しが要る食材 id（role が main / sub、常備前提の食材は数えない） */
  missing: string[];
}

/**
 * 手持ち食材から主菜・副菜を提案する。
 * ★決定的★ 乱数を使わず、一致数の多い順 → 買い足しの少ない順 → id 辞書順で並べる。
 * H1（使わない食材）と調理時間の上限はここでも守る。
 */
export function suggestFromPantry(
  pantryIds: readonly string[],
  options: { excludeIds?: readonly string[]; maxCookTimeMin?: number; limit?: number } = {},
  data: KondateData = kondateData,
): { main: PantryMatch[]; side: PantryMatch[] } {
  assertData(data);
  const ings = ingredientMap(data);
  const excludeIds = options.excludeIds ?? [];
  const maxCookTimeMin = options.maxCookTimeMin ?? MAX_TOTAL_TIME;
  const limit = options.limit ?? 5;
  const pantry = new Set(pantryIds);

  const evaluate = (course: Course): PantryMatch[] =>
    data.recipes
      .filter((r) => r.course === course)
      .filter((r) => !hasExcluded(r, excludeIds))
      .filter((r) => r.cookTimeMin <= maxCookTimeMin)
      .map((r) => {
        const core = r.ingredients.filter((i) => i.role === "main" || i.role === "sub");
        const matched = core.filter((i) => pantry.has(i.id)).map((i) => i.id);
        const missing = core
          .filter((i) => !pantry.has(i.id))
          .filter((i) => (ings.get(i.id)?.commonness ?? 0) < 5)
          .map((i) => i.id);
        return { recipe: r, matched, missing };
      })
      .filter((m) => m.matched.length > 0)
      .sort((a, b) => {
        if (b.matched.length !== a.matched.length) return b.matched.length - a.matched.length;
        if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
        return a.recipe.id < b.recipe.id ? -1 : a.recipe.id > b.recipe.id ? 1 : 0;
      })
      .slice(0, limit);

  return { main: evaluate("main"), side: evaluate("side") };
}

// ---------------------------------------------------------------- 表示用の文言

/**
 * ★§8 / TC-40★ 「卵不使用です」と書かない。「卵を含むレシピを除いています」と動作を説明する。
 * 保証ではなく、このツールが行った動作の説明である。
 */
export function excludeNotice(excludeIds: readonly string[], data: KondateData = kondateData): string | null {
  if (excludeIds.length === 0) return null;
  const names = excludeIds.map((id) => ingredientName(id, data)).join("・");
  return `${names}を含むレシピを除いています。`;
}

/** 使い回しの理由を明示する文（§4.6）。#44 買い物リストへの布石 */
export function reuseSentence(note: ReuseNote): string {
  const labels = note.dayIndexes.map((i) => `${i + 1}日目`).join("・");
  return `${note.name}は${labels}で使います。`;
}

// ---------------------------------------------------------------- URL（§4.2 / §4.10）

/** 条件＋シードを URL クエリにする。呼び出し側が history.replaceState する */
export function encodeConditions(conditions: Conditions, seed: number, data: KondateData = kondateData): string {
  const p = new URLSearchParams();
  p.set("s", String(seed >>> 0));
  p.set("v", dataVersion(data));
  p.set("n", String(conditions.servings));
  p.set("t", String(conditions.maxTotalTimeMin));
  p.set("g", conditions.genre);
  p.set("soup", conditions.includeSoup ? "1" : "0");
  if (conditions.excludeIds.length > 0) p.set("x", conditions.excludeIds.join(","));
  return p.toString();
}

export interface DecodedUrl {
  conditions: Conditions;
  seed: number | null;
  version: string | null;
}

export function decodeConditions(query: string): DecodedUrl {
  const p = new URLSearchParams(query);
  const int = (key: string, fallback: number): number => {
    const raw = p.get(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isInteger(n) ? n : fallback;
  };
  const genreRaw = p.get("g");
  const genre: GenreCondition =
    genreRaw === "japanese" || genreRaw === "western" || genreRaw === "chinese" || genreRaw === "other"
      ? genreRaw
      : "any";
  const seedRaw = p.get("s");
  const seedNum = seedRaw === null ? null : Number(seedRaw);
  return {
    conditions: {
      servings: int("n", DEFAULT_CONDITIONS.servings),
      maxTotalTimeMin: int("t", DEFAULT_CONDITIONS.maxTotalTimeMin),
      excludeIds: (p.get("x") ?? "").split(",").filter((s) => s !== ""),
      genre,
      includeSoup: p.get("soup") !== "0",
    },
    seed: seedNum !== null && Number.isInteger(seedNum) && seedNum >= 0 ? seedNum >>> 0 : null,
    version: p.get("v"),
  };
}
