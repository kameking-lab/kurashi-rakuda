/*
 * レシピ人数スケール換算（P2-T22）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t22-recipe-ninzuu-kansan.md
 * RecipeNinzuuKansan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他のB級ツールと同じ構成。
 * components/tools/impl/ChomiryoKanzan.calc.ts を参考にUIパターンのみ流用し、
 * 比重データ〈data/tables/chomiryo-hijuu.json〉は使わない純粋な算術ツール）。
 * 制度・統計データへの依存はなく、単純な比例計算（倍率 = 目標人数 ÷ 元の人数）のみを行う。
 */

export interface Ingredient {
  /** 材料名（例: "米"） */
  name: string;
  /** 分量（数値のみ。単位は unit で別管理） */
  amount: number;
  /** 単位（自由入力。例: "g", "大さじ", "個"）。単位間の相互換算は行わない */
  unit: string;
}

export interface ScaledIngredient extends Ingredient {
  /** 倍率適用後・丸め処理前の分量 */
  rawScaledAmount: number;
  /** 丸め処理後の表示用分量 */
  scaledAmount: number;
  /** 丸めによって最小値に引き上げられた場合 true */
  clampedToMin: boolean;
}

export type ScaleRecipeResult =
  | {
      ok: true;
      ratio: number;
      items: ScaledIngredient[];
    }
  | { ok: false; error: string };

/** 個数系単位（整数刻みに丸める） */
export const COUNT_UNITS = [
  "個", "本", "枚", "玉", "片", "束", "丁", "尾", "切れ", "房", "株", "缶", "袋", "パック", "粒", "羽",
];

/** 計量スプーン・カップ系単位（0.5刻みに丸める） */
export const SPOON_UNITS = ["大さじ", "小さじ", "カップ"];

export type UnitCategory = "count" | "spoon" | "weight_volume";

/**
 * 単位文字列から丸めカテゴリを判定する。
 * 完全一致ではなく部分一致（例: "大さじ1"のような表記ゆれにも耐える）で判定し、
 * 該当しない単位（g・ml・kg・空文字・未知語すべて）は既定値の weight_volume に落とす。
 */
export function classifyUnit(unit: string): UnitCategory {
  const u = (unit ?? "").trim();
  if (COUNT_UNITS.some((c) => u.includes(c))) return "count";
  if (SPOON_UNITS.some((s) => u.includes(s))) return "spoon";
  return "weight_volume";
}

/**
 * 丸め幅を適用したうえで、値が0にならないよう最小値を保証する。
 * 戻り値は { value, clamped }（clamped=trueなら最小値への引き上げが発生したことを示す）。
 */
export function roundAmount(value: number, unit: string): { value: number; clamped: boolean } {
  const category = classifyUnit(unit);
  let step: number;
  if (category === "count") step = 1;
  else if (category === "spoon") step = 0.5;
  else step = 0.1;

  let rounded = Math.round(value / step) * step;
  // 浮動小数点誤差の丸め残り（例: 0.1刻みで 2.0999999999999996 になる）を軽減する
  rounded = Math.round(rounded * 1000) / 1000;

  let clamped = false;
  if (rounded <= 0 && value > 0) {
    rounded = step;
    clamped = true;
  }
  return { value: rounded, clamped };
}

/**
 * レシピの元の人数・目標人数・材料一覧から、スケール後の各材料の分量を計算する。
 * 倍率 ratio = toNinzuu / fromNinzuu を全材料に一律で適用する単純な比例計算のみを行う。
 */
export function scaleRecipe(
  fromNinzuu: number,
  toNinzuu: number,
  ingredients: Ingredient[],
): ScaleRecipeResult {
  if (!Number.isFinite(fromNinzuu)) {
    return { ok: false, error: "元の人数を入力してください。" };
  }
  if (fromNinzuu <= 0) {
    return { ok: false, error: "元の人数は0より大きい数値で入力してください。" };
  }
  if (!Number.isFinite(toNinzuu)) {
    return { ok: false, error: "目標の人数を入力してください。" };
  }
  if (toNinzuu <= 0) {
    return { ok: false, error: "目標の人数は0より大きい数値で入力してください。" };
  }
  if (ingredients.length === 0) {
    return { ok: false, error: "材料を1つ以上入力してください。" };
  }

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const rowNo = i + 1;
    if (!ing.name || ing.name.trim() === "") {
      return { ok: false, error: `${rowNo}行目の材料名を入力してください。` };
    }
    if (!Number.isFinite(ing.amount) || ing.amount <= 0) {
      return { ok: false, error: `${rowNo}行目の分量を正しく入力してください。` };
    }
  }

  const ratio = toNinzuu / fromNinzuu;

  const items: ScaledIngredient[] = ingredients.map((ing) => {
    const rawScaledAmount = ing.amount * ratio;
    const { value, clamped } = roundAmount(rawScaledAmount, ing.unit);
    return {
      ...ing,
      rawScaledAmount,
      scaledAmount: value,
      clampedToMin: clamped,
    };
  });

  return { ok: true, ratio, items };
}

/** 表示用フォーマット（末尾の不要な小数を落とす。例: 2.0 → "2", 2.5 → "2.5"） */
export function fmtAmount(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

/** 倍率の表示用フォーマット（例: 1.5 → "1.5倍"） */
export function fmtRatio(ratio: number): string {
  return `${fmtAmount(ratio)}倍`;
}
