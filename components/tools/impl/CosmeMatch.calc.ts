/*
 * 化粧品「実名・超公平」レコメンド（cosme-match、P4-T04）— 計算ロジック（純関数）。
 * 仕様: specs/tools/cosme-match.md
 *
 * ★公平性は「約束」ではなく「仕組み」で担保する（§0）★
 *   結果は「肌質×悩み×価格帯」のマトリクスに合致する商品の機械的列挙（AND条件）。
 *   並び順は価格昇順→五十音の固定ルールで、編集部イチオシ・PR枠は存在しない。
 *   0件のときは正直に0件を返す（部分的に緩めて埋め合わせない）。
 * ★成分×肌質の適合はすべて data/cosme/ingredient-skin-map.json 経由でのみ主張する（§2）★
 *   商品データのskinTypeFit/concernsFitは.github/scripts/check-cosme-fairness.mjsが
 *   ingredient-skin-mapとの整合を機械照合するため、本ファイルでは商品データのfit値をそのまま信頼してよい。
 */
import { COSME_PRODUCT_FILES } from "@/data/cosme/products/index";
import ingredientMapJson from "@/data/cosme/ingredient-skin-map.json";

export type SkinType = "dry" | "oily" | "combination" | "sensitive";
export type Concern = "kansou" | "keana" | "kuzure";
export type PriceBand = "petit" | "middle" | "high";
export type PriceBandFilter = PriceBand | "any";
export type ProductCategory = "kesho-mizu" | "nyueki" | "cream" | "senganryo" | "hiyakedome";
export type ProductStatus = "on-sale" | "renewal-pending" | "discontinued";

export const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "sensitive"];
export const CONCERNS: Concern[] = ["kansou", "keana", "kuzure"];
export const PRICE_BANDS: PriceBand[] = ["petit", "middle", "high"];
export const CATEGORIES: ProductCategory[] = ["senganryo", "kesho-mizu", "nyueki", "cream", "hiyakedome"];

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: "乾燥",
  oily: "脂性",
  combination: "混合",
  sensitive: "敏感",
};
export const CONCERN_LABELS: Record<Concern, string> = {
  kansou: "乾燥",
  keana: "毛穴",
  kuzure: "崩れ",
};
export const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  petit: "プチプラ（〜2,000円）",
  middle: "ミドル（〜5,000円）",
  high: "デパコス（5,000円〜）",
};
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  senganryo: "洗顔料",
  "kesho-mizu": "化粧水",
  nyueki: "乳液/クリーム",
  cream: "乳液/クリーム",
  hiyakedome: "日焼け止め",
};

export interface KeyIngredient {
  name: string;
  ingredientId: string;
  role: string;
  sourceNote: string;
}

export interface CosmeSource {
  label: string;
  url: string;
}

export interface CosmeProduct {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  priceYen: number;
  volume: string;
  priceBand: PriceBand;
  availability: string[];
  keyIngredients: KeyIngredient[];
  skinTypeFit: Record<SkinType, boolean | null>;
  concernsFit: Concern[];
  notSuitedFor: string[];
  cautions: string[];
  sources: CosmeSource[];
  checkedAt: string;
  nextCheckDue: string;
  status: ProductStatus;
}

export const COSME_PRODUCTS: CosmeProduct[] = COSME_PRODUCT_FILES as unknown as CosmeProduct[];

interface IngredientMapEntry {
  id: string;
  name: string;
  role: string;
  commonlyChosenFor: SkinType[];
  concernsFit: Concern[];
  generalNote: string;
  sourceId: string;
  checkedAt: string;
}

const INGREDIENT_MAP: IngredientMapEntry[] = ingredientMapJson.ingredients as unknown as IngredientMapEntry[];
const ingredientById = new Map(INGREDIENT_MAP.map((i) => [i.id, i]));

export function ingredientInfo(id: string): IngredientMapEntry | undefined {
  return ingredientById.get(id);
}

// ---------------------------------------------------------------- マッチング（§4.4）

export interface MatchCriteria {
  /** null = 肌質を絞り込まない（全件対象） */
  skinType: SkinType | null;
  /** 選択した悩み（複数可・AND条件） */
  concerns: Concern[];
  priceBand: PriceBandFilter;
}

export const DEFAULT_CRITERIA: MatchCriteria = { skinType: null, concerns: [], priceBand: "any" };

export interface MatchedReason {
  key: string;
  text: string;
}

export interface MatchResult {
  product: CosmeProduct;
  reasons: MatchedReason[];
}

/**
 * 商品が基準に合致するかを判定する。★AND条件★（肌質×悩み×価格帯のすべてを満たす商品のみ）。
 * 合致理由（reasons）はキー成分名を添えて具体的に示す（§4.4の表示例「セラミド配合」に対応）。
 * status が discontinued の商品は候補から除く（データは履歴として残るが結果には出さない。§3）。
 */
export function matchesCriteria(product: CosmeProduct, criteria: MatchCriteria): MatchResult | null {
  if (product.status === "discontinued") return null;
  const reasons: MatchedReason[] = [];

  if (criteria.skinType) {
    if (product.skinTypeFit[criteria.skinType] !== true) return null;
    const supporting = product.keyIngredients.filter((k) => {
      const info = ingredientById.get(k.ingredientId);
      return info?.commonlyChosenFor.includes(criteria.skinType as SkinType);
    });
    const names = supporting.map((k) => k.name).join("・") || "配合成分";
    reasons.push({
      key: `skin-${criteria.skinType}`,
      text: `${SKIN_TYPE_LABELS[criteria.skinType]}肌◯（${names}配合）`,
    });
  }

  for (const concern of criteria.concerns) {
    if (!product.concernsFit.includes(concern)) return null;
    const supporting = product.keyIngredients.filter((k) => {
      const info = ingredientById.get(k.ingredientId);
      return info?.concernsFit.includes(concern);
    });
    const names = supporting.map((k) => k.name).join("・") || "配合成分";
    reasons.push({ key: `concern-${concern}`, text: `${CONCERN_LABELS[concern]}対策◯（${names}配合）` });
  }

  if (criteria.priceBand !== "any") {
    if (product.priceBand !== criteria.priceBand) return null;
    reasons.push({ key: "price", text: `価格帯◯（${PRICE_BAND_LABELS[product.priceBand]}）` });
  }

  return { product, reasons };
}

/**
 * ★並び順は価格昇順→五十音の固定ルール（§0.1）。編集部イチオシ・PR枠は存在しない★
 */
export function sortResults(results: MatchResult[]): MatchResult[] {
  return [...results].sort((a, b) => {
    if (a.product.priceYen !== b.product.priceYen) return a.product.priceYen - b.product.priceYen;
    return a.product.name.localeCompare(b.product.name, "ja");
  });
}

export interface CategoryMatch {
  category: ProductCategory;
  results: MatchResult[];
}

/** カテゴリごとにグルーピングして結果を返す（洗顔料・化粧水・乳液/クリーム・日焼け止めの4区分） */
export function matchByCategory(
  criteria: MatchCriteria,
  products: CosmeProduct[] = COSME_PRODUCTS,
): CategoryMatch[] {
  const uniqueCategories = Array.from(new Set(CATEGORIES));
  return uniqueCategories.map((category) => {
    const inCategory = products.filter((p) => p.category === category);
    const matched = inCategory
      .map((p) => matchesCriteria(p, criteria))
      .filter((r): r is MatchResult => r !== null);
    return { category, results: sortResults(matched) };
  });
}

// ---------------------------------------------------------------- 肌質かんたん診断（§4.1）

/**
 * 「わからない」を選んだ人向けの簡易4問診断。
 * ★これは医学的な診断ではない一般的な目安（つっぱり感・皮脂量・季節差・刺激への反応というよく使われる
 *   4指標に基づく編集部独自のセルフチェック）であり、皮膚科の診断に代わるものではない★
 *   （specs/tools/cosme-match.md §1「敏感肌選択時は常時注意」を踏まえ、刺激に弱いと答えた場合は
 *   安全側に倒して敏感肌と判定する）。
 */
export interface SkinDiagnosisAnswers {
  /** 洗顔後のつっぱり感 */
  tightness: "strong" | "mild" | "none";
  /** Tゾーンのテカリ */
  tzoneShine: "much" | "partial" | "none";
  /** 季節による肌の変化 */
  seasonalChange: "large" | "small" | "none";
  /** 新しい化粧品での刺激・かぶれやすさ */
  irritation: "often" | "sometimes" | "rarely";
}

export function diagnoseSkinType(answers: SkinDiagnosisAnswers): SkinType {
  // 刺激に弱いと答えた場合は安全側（敏感肌）を優先する
  if (answers.irritation === "often") return "sensitive";

  let dry = 0;
  let oily = 0;
  let combination = 0;

  if (answers.tightness === "strong") dry += 2;
  else if (answers.tightness === "mild") dry += 1;
  else oily += 1;

  if (answers.tzoneShine === "much") oily += 2;
  else if (answers.tzoneShine === "partial") combination += 1;
  else dry += 1;

  if (answers.seasonalChange === "large") combination += 1;

  if (answers.irritation === "sometimes") combination += 1;

  const max = Math.max(dry, oily, combination);
  if (max === 0) return "combination";
  if (dry === max && dry > oily && dry > combination) return "dry";
  if (oily === max && oily > dry && oily > combination) return "oily";
  return "combination";
}
