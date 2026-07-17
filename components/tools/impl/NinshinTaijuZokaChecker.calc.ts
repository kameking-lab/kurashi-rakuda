/**
 * 妊娠中の体重増加チェッカー（P2-T15）— 純粋な計算ロジック。
 * 仕様: specs/b-tools/p2-t15-ninshin-taiju-zoka-checker.md
 *
 * 妊娠前の身長・体重から妊娠前BMIを計算し、こども家庭庁「妊娠前からはじめる妊産婦のための
 * 食生活指針 解説要領」表8（日本肥満学会の肥満度分類に準じた4区分）の体重増加指導の目安と
 * 照合したうえで、現在の体重との差分（現在の増加量）を比較する。
 *
 * ★数値はすべて data/tables/tekisei-taijuu-kijun.json の pregnancyWeightGain から読む
 *   （直書き禁止）。境界値（18.5・25.0・30.0等）もこのファイルに直書きせず、
 *   JSON の bmiFrom/bmiTo をそのまま使う。★
 * ★肥満2度以上（BMI30.0以上）は表8で「個別対応」とされ、数値レンジが存在しない。
 *   本ツールは自動計算した目安・比較結果を一切出さず、必ず主治医への相談に誘導する。★
 * ★多胎（双子等）の目安値は一次情報に存在しない（applicability.multipleGestation = null）。
 *   本ツールに多胎の入力欄は設けず、単胎（一人）向けの数値であることを常時明示する。★
 */
import tekiseiData from "@/data/tables/tekisei-taijuu-kijun.json";

// ---------------------------------------------------------------- 入力の許容範囲
// 一次情報上の基準値ではなく、明らかな誤入力（単位間違い・桁間違い）を防ぐための
// 実装上のガード（specs 参照）。
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 200;
export const MIN_PRE_WEIGHT_KG = 20;
export const MAX_PRE_WEIGHT_KG = 200;
export const MIN_CURRENT_WEIGHT_KG = 20;
export const MAX_CURRENT_WEIGHT_KG = 250;

/** 表8の脚注1（増加量を厳格に指導する根拠は必ずしも十分ではない）。結果画面に常時表示する */
export const GAIN_GUIDANCE_FOOTNOTE = tekiseiData.pregnancyWeightGain.footnotes[0];

/** 医師が指導を行うときの目安であり、個人差を考慮した指導が必要、という原文の注意書き */
export const PREGNANCY_GAIN_CAUTION = tekiseiData.pregnancyWeightGain.cautionQuote;

/** 増加不足・過剰それぞれのリスクに関する原文（個々の利用者への断定ではなく一般論として提示する） */
export const PREGNANCY_GAIN_RATIONALE = tekiseiData.pregnancyWeightGain.rationaleQuote;

/** この表が単胎（おなかの赤ちゃんが一人）の場合の数値であることの注記。多胎は非対応 */
export const APPLICABILITY_NOTE = tekiseiData.pregnancyWeightGain.applicability.note;

// ---------------------------------------------------------------- 体重増加指導の目安（表8）

export interface PregnancyWeightGainCategory {
  code: string;
  label: string;
  bmiFrom: number | null;
  bmiTo: number | null;
  bmiRangeLabel: string;
  gainFromKg: number | null;
  gainToKg: number | null;
  gainLabel: string;
  /** NORMAL区分のみ: 低体重に近い場合は上限側(13kg)を参考にする旨の注記 */
  note: string | null;
}

const PREGNANCY_CATEGORIES: PregnancyWeightGainCategory[] =
  tekiseiData.pregnancyWeightGain.categories.map((c) => ({
    code: c.code,
    label: c.label,
    bmiFrom: c.bmiFrom,
    bmiTo: c.bmiTo,
    bmiRangeLabel: c.bmiRangeLabel,
    gainFromKg: c.gainFromKg,
    gainToKg: c.gainToKg,
    gainLabel: c.gainLabel,
    note: "note" in c ? (c.note as string) : null,
  }));

/**
 * 妊娠前BMIから表8の区分を判定する。半開区間 [bmiFrom, bmiTo) で判定するため、
 * 境界値ちょうど（18.5・25.0・30.0）は上位側の区分になる。
 * bmiFrom が null の区分は下限なし、bmiTo が null の区分は上限なしとして扱う。
 *
 * ★浮動小数点対策★ 体重÷身長²の除算は、数学的に境界値ちょうど（例:
 * 47.36÷1.6²=18.5）でも、IEEE754の丸め誤差で18.499999999999996のような値に
 * なることがある。実際の値の意味のある精度（小数第9位程度）を超える誤差は
 * 意図しない区分への転落を招くため、比較前にごく小さい誤差を丸めて吸収する。
 */
export function judgePregnancyWeightGainCategory(bmi: number): PregnancyWeightGainCategory {
  const roundedBmi = Math.round(bmi * 1e9) / 1e9;
  for (const cat of PREGNANCY_CATEGORIES) {
    const from = cat.bmiFrom ?? -Infinity;
    const to = cat.bmiTo ?? Infinity;
    if (roundedBmi >= from && roundedBmi < to) {
      return cat;
    }
  }
  // 理論上到達しない（区分が全域をカバーしているため）が、型のために保険を用意する
  return PREGNANCY_CATEGORIES[PREGNANCY_CATEGORIES.length - 1];
}

// ---------------------------------------------------------------- 入力バリデーション・計算本体

export interface NinshinTaijuZokaInput {
  /** 妊娠前の身長(cm) */
  heightCm: number;
  /** 妊娠前の体重(kg) */
  preWeightKg: number;
  /** 現在の体重(kg) */
  currentWeightKg: number;
}

export function validateInput(input: NinshinTaijuZokaInput): string | null {
  const { heightCm, preWeightKg, currentWeightKg } = input;

  if (!Number.isFinite(heightCm)) {
    return "妊娠前の身長を入力してください。";
  }
  if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
    return `身長は${MIN_HEIGHT_CM}〜${MAX_HEIGHT_CM}cmの範囲で入力してください。`;
  }

  if (!Number.isFinite(preWeightKg)) {
    return "妊娠前の体重を入力してください。";
  }
  if (preWeightKg < MIN_PRE_WEIGHT_KG || preWeightKg > MAX_PRE_WEIGHT_KG) {
    return `妊娠前の体重は${MIN_PRE_WEIGHT_KG}〜${MAX_PRE_WEIGHT_KG}kgの範囲で入力してください。`;
  }

  if (!Number.isFinite(currentWeightKg)) {
    return "現在の体重を入力してください。";
  }
  if (currentWeightKg < MIN_CURRENT_WEIGHT_KG || currentWeightKg > MAX_CURRENT_WEIGHT_KG) {
    return `現在の体重は${MIN_CURRENT_WEIGHT_KG}〜${MAX_CURRENT_WEIGHT_KG}kgの範囲で入力してください。`;
  }

  return null;
}

/** 妊娠前BMI = 妊娠前の体重(kg) ÷ 妊娠前の身長(m)の2乗（データの bmiFormula・pregnancyWeightGain.bmiBasis） */
export function calcPrePregnancyBmi(heightCm: number, preWeightKg: number): number {
  const heightM = heightCm / 100;
  return preWeightKg / (heightM * heightM);
}

export type GainComparisonPosition = "belowTarget" | "withinTarget" | "aboveTarget";

export function judgeGainComparison(
  currentGainKg: number,
  category: PregnancyWeightGainCategory,
): GainComparisonPosition | null {
  if (category.gainFromKg === null || category.gainToKg === null) {
    // 肥満2度以上（個別対応）は数値目安が存在しないため比較しない
    return null;
  }
  if (currentGainKg < category.gainFromKg) return "belowTarget";
  if (currentGainKg > category.gainToKg) return "aboveTarget";
  return "withinTarget";
}

export interface NinshinTaijuZokaResult {
  /** 妊娠前BMI */
  bmi: number;
  /** 表8の区分（低体重／普通体重／肥満1度／肥満2度以上） */
  category: PregnancyWeightGainCategory;
  /** 現在の増加量(kg) = 現在の体重 − 妊娠前の体重（マイナスもありうる） */
  currentGainKg: number;
  /** 肥満2度以上（個別対応・数値目安なし）のとき true */
  isIndividualCase: boolean;
  /** 個別対応でない場合のみ、目安との比較結果 */
  comparison: GainComparisonPosition | null;
}

export type NinshinTaijuZokaCalcResult =
  | { ok: true; result: NinshinTaijuZokaResult }
  | { ok: false; error: string };

/**
 * 妊娠中の体重増加チェッカーの計算のオーケストレーター。
 * バリデーション → 妊娠前BMI算出 → 表8の区分判定 → 現在の増加量との比較、の順。
 */
export function calcNinshinTaijuZoka(input: NinshinTaijuZokaInput): NinshinTaijuZokaCalcResult {
  const error = validateInput(input);
  if (error) {
    return { ok: false, error };
  }

  const { heightCm, preWeightKg, currentWeightKg } = input;
  const bmi = calcPrePregnancyBmi(heightCm, preWeightKg);
  const category = judgePregnancyWeightGainCategory(bmi);
  const currentGainKg = currentWeightKg - preWeightKg;
  const isIndividualCase = category.gainFromKg === null || category.gainToKg === null;
  const comparison = isIndividualCase ? null : judgeGainComparison(currentGainKg, category);

  return {
    ok: true,
    result: {
      bmi,
      category,
      currentGainKg,
      isIndividualCase,
      comparison,
    },
  };
}

export function fmtBmi(bmi: number): string {
  return bmi.toFixed(1);
}

export function fmtKg(kg: number): string {
  return kg.toFixed(1);
}

/** 現在の増加量の符号つき表示（マイナスも「−◯kg」ではなくそのまま数値として扱う） */
export function fmtGainKg(kg: number): string {
  const sign = kg > 0 ? "+" : "";
  return `${sign}${kg.toFixed(1)}`;
}
