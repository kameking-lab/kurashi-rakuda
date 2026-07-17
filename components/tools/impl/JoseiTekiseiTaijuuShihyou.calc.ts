/**
 * 女性の適正体重・体型指標（P2-T30）— 純粋な計算ロジック。
 * 仕様: specs/b-tools/p2-t30-josei-tekisei-taijuu-shihyou.md
 *
 * 身長・体重からBMIを計算し、日本肥満学会の肥満度分類（低体重〜肥満4度）に照合する。
 * 年齢を入力した場合のみ、厚生労働省「日本人の食事摂取基準（2025年版）」の
 * 「目標とするBMIの範囲」（年齢別）とも比較する。
 *
 * ★数値はすべて data/tables/tekisei-taijuu-kijun.json から読む（直書き禁止）。★
 * ★境界値（18.5・25.0・30.0・35.0・40.0等）もこのファイルに直書きせず、
 *   JSON の bmiFrom/bmiTo/ageFrom/ageTo をそのまま使う。★
 * ★P2-T15（妊娠中の体重増加チェッカー）は別ツールのため、妊娠中の体重増加の目安は
 *   参考情報として1件返すのみで、増加ペース等の専用計算は行わない。★
 */
import tekiseiData from "@/data/tables/tekisei-taijuu-kijun.json";

// ---------------------------------------------------------------- 入力の許容範囲
// 一次情報上の基準値ではなく、明らかな誤入力（単位間違い・桁間違い）を防ぐための
// 実装上のガード（specs 参照）。
export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 250;
export const MIN_WEIGHT_KG = 10;
export const MAX_WEIGHT_KG = 300;
export const MIN_AGE_YEARS = 0;
export const MAX_AGE_YEARS = 120;

/** データの disclaimer をそのまま表示用に公開する */
export const TEKISEI_TAIJUU_DISCLAIMER = tekiseiData.disclaimer;

/** 標準体重の計算基準となるBMI（22）。「理想」として断定表示しないこと（データnote参照） */
export const IDEAL_BMI_22 = tekiseiData.bmiAndMortality.idealBmi22.value;

// ---------------------------------------------------------------- 肥満度分類

export interface ObesityCategory {
  code: string;
  label: string;
  bmiFrom: number | null;
  bmiTo: number | null;
  rangeLabel: string;
}

const OBESITY_CATEGORIES: ObesityCategory[] = tekiseiData.obesityClassification.categories.map(
  (c) => ({
    code: c.code,
    label: c.label,
    bmiFrom: c.bmiFrom,
    bmiTo: c.bmiTo,
    rangeLabel: c.rangeLabel,
  }),
);

/**
 * BMIから肥満度分類を判定する。半開区間 [bmiFrom, bmiTo) で判定するため、
 * 境界値ちょうど（18.5・25.0・30.0・35.0・40.0）は上位側の区分になる。
 * bmiFrom が null の区分は下限なし、bmiTo が null の区分は上限なしとして扱う。
 */
export function judgeObesityCategory(bmi: number): ObesityCategory {
  for (const cat of OBESITY_CATEGORIES) {
    const from = cat.bmiFrom ?? -Infinity;
    const to = cat.bmiTo ?? Infinity;
    if (bmi >= from && bmi < to) {
      return cat;
    }
  }
  // 理論上到達しない（区分が全域をカバーしているため）が、型のために保険を用意する
  return OBESITY_CATEGORIES[OBESITY_CATEGORIES.length - 1];
}

// ---------------------------------------------------------------- 目標とするBMIの範囲

export interface TargetBmiRange {
  ageFrom: number;
  ageTo: number | null;
  ageLabel: string;
  bmiFrom: number;
  bmiTo: number;
  rangeLabel: string;
}

const TARGET_BMI_RANGES: TargetBmiRange[] = tekiseiData.targetBmiRange.ranges.map((r) => ({
  ageFrom: r.ageFrom,
  ageTo: r.ageTo,
  ageLabel: r.ageLabel,
  bmiFrom: r.bmiFrom,
  bmiTo: r.bmiTo,
  rangeLabel: r.rangeLabel,
}));

/** 年齢（18歳以上）に該当する「目標とするBMIの範囲」の区分を返す。該当なしは null */
export function findTargetBmiRange(age: number): TargetBmiRange | null {
  return (
    TARGET_BMI_RANGES.find((r) => age >= r.ageFrom && (r.ageTo === null || age <= r.ageTo)) ?? null
  );
}

export type TargetRangePosition = "belowRange" | "withinRange" | "aboveRange";

export function judgeTargetRangePosition(bmi: number, range: TargetBmiRange): TargetRangePosition {
  if (bmi < range.bmiFrom) return "belowRange";
  if (bmi > range.bmiTo) return "aboveRange";
  return "withinRange";
}

// ---------------------------------------------------------------- 妊娠中の体重増加の目安（参考情報）

/** 本ツールの肥満度分類コード → 表8（妊娠中の体重増加指導の目安）の区分コード */
function toPregnancyCode(obesityCode: string): string {
  if (obesityCode === "OBESE_2" || obesityCode === "OBESE_3" || obesityCode === "OBESE_4") {
    return "OBESE_2_PLUS";
  }
  return obesityCode;
}

export interface PregnancyWeightGainRef {
  label: string;
  gainLabel: string;
  cautionQuote: string;
}

/**
 * 現在の肥満度分類に対応する、妊娠中の体重増加指導の目安（表8）を参考情報として返す。
 * ★専用計算（妊娠週数からの逆算等）は行わない。P2-T15の範囲。★
 */
export function findPregnancyWeightGainRef(obesityCode: string): PregnancyWeightGainRef | null {
  const pregnancyCode = toPregnancyCode(obesityCode);
  const cat = tekiseiData.pregnancyWeightGain.categories.find((c) => c.code === pregnancyCode);
  if (!cat) return null;
  return {
    label: cat.label,
    gainLabel: cat.gainLabel,
    cautionQuote: tekiseiData.pregnancyWeightGain.cautionQuote,
  };
}

// ---------------------------------------------------------------- 入力バリデーション・計算本体

export interface JoseiTekiseiTaijuuInput {
  heightCm: number;
  weightKg: number;
  /** 任意。未入力は undefined */
  ageYears?: number;
}

export function validateInput(input: JoseiTekiseiTaijuuInput): string | null {
  const { heightCm, weightKg, ageYears } = input;

  if (!Number.isFinite(heightCm)) {
    return "身長を入力してください。";
  }
  if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
    return `身長は${MIN_HEIGHT_CM}〜${MAX_HEIGHT_CM}cmの範囲で入力してください。`;
  }

  if (!Number.isFinite(weightKg)) {
    return "体重を入力してください。";
  }
  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return `体重は${MIN_WEIGHT_KG}〜${MAX_WEIGHT_KG}kgの範囲で入力してください。`;
  }

  if (ageYears !== undefined) {
    if (!Number.isFinite(ageYears) || !Number.isInteger(ageYears)) {
      return "年齢は整数で入力してください。";
    }
    if (ageYears < MIN_AGE_YEARS || ageYears > MAX_AGE_YEARS) {
      return `年齢は${MIN_AGE_YEARS}〜${MAX_AGE_YEARS}歳の範囲で入力してください。`;
    }
  }

  return null;
}

/** BMI = 体重(kg) ÷ 身長(m)の2乗（データの bmiFormula） */
export function calcBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** 標準体重(kg) = 身長(m)の2乗 × 22（BMI22基準。「標準体重の計算基準」であり個人の理想値ではない） */
export function calcStandardWeightKg(heightCm: number): number {
  const heightM = heightCm / 100;
  return heightM * heightM * IDEAL_BMI_22;
}

export interface JoseiTekiseiTaijuuResult {
  bmi: number;
  standardWeightKg: number;
  obesityCategory: ObesityCategory;
  /** 年齢入力があり、かつ18歳以上のときのみ設定される */
  targetRange: {
    range: TargetBmiRange;
    position: TargetRangePosition;
  } | null;
  /** 年齢入力があったが18歳未満で目標BMI範囲の対象外だった場合に true */
  targetRangeNotApplicableUnder18: boolean;
  pregnancyWeightGainRef: PregnancyWeightGainRef;
}

export type JoseiTekiseiTaijuuCalcResult =
  | { ok: true; result: JoseiTekiseiTaijuuResult }
  | { ok: false; error: string };

/**
 * 女性の適正体重・体型指標の計算のオーケストレーター。
 * バリデーション → BMI算出 → 肥満度分類 → （年齢入力時のみ）目標BMI範囲との比較、の順。
 */
export function calcJoseiTekiseiTaijuu(
  input: JoseiTekiseiTaijuuInput,
): JoseiTekiseiTaijuuCalcResult {
  const error = validateInput(input);
  if (error) {
    return { ok: false, error };
  }

  const { heightCm, weightKg, ageYears } = input;
  const bmi = calcBmi(heightCm, weightKg);
  const obesityCategory = judgeObesityCategory(bmi);
  const standardWeightKg = calcStandardWeightKg(heightCm);
  const pregnancyWeightGainRef = findPregnancyWeightGainRef(obesityCategory.code);

  let targetRange: JoseiTekiseiTaijuuResult["targetRange"] = null;
  let targetRangeNotApplicableUnder18 = false;

  if (ageYears !== undefined) {
    if (ageYears < 18) {
      targetRangeNotApplicableUnder18 = true;
    } else {
      const range = findTargetBmiRange(ageYears);
      if (range) {
        targetRange = { range, position: judgeTargetRangePosition(bmi, range) };
      }
    }
  }

  return {
    ok: true,
    result: {
      bmi,
      standardWeightKg,
      obesityCategory,
      targetRange,
      targetRangeNotApplicableUnder18,
      // pregnancyWeightGainRef は分類コードから必ず見つかる（データの4区分が本ツールの6区分を
      // すべてカバーしているため）が、型のため null 許容にしてフォールバックしておく
      pregnancyWeightGainRef: pregnancyWeightGainRef ?? {
        label: "",
        gainLabel: "",
        cautionQuote: tekiseiData.pregnancyWeightGain.cautionQuote,
      },
    },
  };
}

export function fmtBmi(bmi: number): string {
  return bmi.toFixed(1);
}

export function fmtKg(kg: number): string {
  return kg.toFixed(1);
}
