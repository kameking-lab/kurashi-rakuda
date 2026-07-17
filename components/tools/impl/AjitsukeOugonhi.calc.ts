/*
 * 味付け黄金比計算（P2-T21）の計算ロジック（純関数）。
 * 仕様書: specs/b-tools/p2-t21-ajitsuke-ougonhi.md
 * AjitsukeOugonhi.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（ChomiryoKanzan.calc.ts と同じ構成）。
 * 料理×調味料の配合比率データのSSOTは data/tables/ajitsuke-ougonhi.json（ここに数値を書かない）。
 * confirmed=true の5品目は農林水産省の記事に基づく比率、confirmed=false の3品目
 * （すき焼きの割り下・天つゆ・酢の物）は許可ドメイン内に一次情報が見つからなかったため
 * 「一般的に紹介されている目安（出典なし）」として扱う。UI側は confirmed=false の品目で
 * 断定的な表現をしないこと。
 */
import ougonhi from "@/data/tables/ajitsuke-ougonhi.json";

export const TBSP_ML = ougonhi.tan_i.oosaji_ml;
export const TSP_ML = ougonhi.tan_i.kosaji_ml;

export const CHOMIRYO_LABELS: Record<string, string> = ougonhi.chomiryo_labels;

export interface DishPart {
  key: string;
  part: number;
}

export interface Dish {
  key: string;
  name: string;
  confirmed: boolean;
  source_note: string;
  base_key: string;
  default_ml_per_nin: number;
  parts: DishPart[];
}

export const DISHES: Dish[] = ougonhi.dishes as Dish[];

export function getDish(dishKey: string): Dish | undefined {
  return DISHES.find((d) => d.key === dishKey);
}

export interface IngredientAmount {
  key: string;
  name: string;
  ml: number;
  tbsp: number;
  tsp: number;
}

export interface ScaleResult {
  dishKey: string;
  dishName: string;
  confirmed: boolean;
  sourceNote: string;
  baseKey: string;
  baseMl: number;
  ingredients: IngredientAmount[];
  totalMl: number;
}

export type ScaleOutcome = { ok: true; result: ScaleResult } | { ok: false; error: string };

/**
 * 「人数」から基準調味料（base_key）の目安量(ml)を求める。
 * default_ml_per_nin（1人あたりの目安量。出典なし・UX用の初期値）に人数を掛けるだけ。
 * servings は正の数であること（0・負値・非数はエラー）。
 */
export function baseMlFromServings(dishKey: string, servings: number): ScaleOutcome | number {
  const dish = getDish(dishKey);
  if (!dish) {
    return { ok: false, error: `未知の料理キーです: ${dishKey}` };
  }
  if (!Number.isFinite(servings) || servings <= 0) {
    return { ok: false, error: "人数は0より大きい数値を入力してください。" };
  }
  return dish.default_ml_per_nin * servings;
}

/**
 * 基準調味料の量(ml)から、比率に従って各調味料の量をスケール計算する。
 * baseMl が0以下・非数の場合はエラーを返す（分量0や極端な人数などのエッジケース対応）。
 */
export function scaleDish(dishKey: string, baseMl: number): ScaleOutcome {
  const dish = getDish(dishKey);
  if (!dish) {
    return { ok: false, error: `未知の料理キーです: ${dishKey}` };
  }
  if (!Number.isFinite(baseMl) || baseMl <= 0) {
    return { ok: false, error: "分量は0より大きい数値を入力してください。" };
  }
  const basePart = dish.parts.find((p) => p.key === dish.base_key);
  if (!basePart) {
    return { ok: false, error: `データ不整合: 基準調味料が見つかりません（${dish.base_key}）` };
  }

  const scaleFactor = baseMl / basePart.part;
  const ingredients: IngredientAmount[] = dish.parts.map((p) => {
    const ml = p.part * scaleFactor;
    return {
      key: p.key,
      name: CHOMIRYO_LABELS[p.key] ?? p.key,
      ml,
      tbsp: ml / TBSP_ML,
      tsp: ml / TSP_ML,
    };
  });
  const totalMl = ingredients.reduce((sum, i) => sum + i.ml, 0);

  return {
    ok: true,
    result: {
      dishKey: dish.key,
      dishName: dish.name,
      confirmed: dish.confirmed,
      sourceNote: dish.source_note,
      baseKey: dish.base_key,
      baseMl,
      ingredients,
      totalMl,
    },
  };
}

/**
 * 「人数」から直接スケール計算する便利関数。
 */
export function scaleDishByServings(dishKey: string, servings: number): ScaleOutcome {
  const baseMl = baseMlFromServings(dishKey, servings);
  if (typeof baseMl !== "number") {
    return baseMl;
  }
  return scaleDish(dishKey, baseMl);
}

export function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("ja-JP");
}

/**
 * 調味料の量を「大さじ・小さじ・ml」のうち、いちばん分かりやすい表現にまとめた文字列。
 * 大さじ1杯(15ml)以上なら大さじ表記、小さじ1杯(5ml)以上なら小さじ表記、それ未満はml表記。
 */
export function formatAmount(ml: number): string {
  if (ml >= TBSP_ML) {
    return `大さじ${fmt(ml / TBSP_ML)}`;
  }
  if (ml >= TSP_ML) {
    return `小さじ${fmt(ml / TSP_ML)}`;
  }
  return `${fmt(ml)}ml`;
}
