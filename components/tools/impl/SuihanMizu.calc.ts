/*
 * 炊飯の水の量・合数⇄g換算（Q3-15）— 計算ロジック（純関数）。
 * 仕様: specs/b-tools/39-rice-cooking-water-ratio.md
 *
 * 「お米○合」「お米○g」「計量カップ○ml」のいずれかの入力を、米の重量(g)・
 * 体積(ml)・必要な水の量に相互換算する。水の量は米の種類（白米/無洗米/玄米/もち米）
 * で加水量の考え方（重量ベース/体積ベース）が異なるため、種類別に別ロジックを持つ。
 * 断定的な「これが絶対に正解」という表現は避け、炊飯器の内釜の目盛りが
 * 最も正確である旨を必ず案内する（YMYL区分は低。仕様書「YMYL配慮事項」参照）。
 */

/** 1合の体積(ml)。日本の伝統的な体積単位「合」の定義 */
export const ML_PER_GO = 180;
/** 1合の精白米重量(g)目安。精米の密度は水よりやや高く、180mlあたり概ね150g程度 */
export const G_PER_GO = 150;

/** 家庭用炊飯器で一般的な上限（1升＝10合）。これを超える量は分割炊飯を案内する */
export const LARGE_AMOUNT_GO_THRESHOLD = 10;
/** これ以下は計量誤差が大きくなりやすい極小量とみなし、キッチンスケールでの計量を案内する */
export const SMALL_AMOUNT_GO_THRESHOLD = 0.3;

export type SuihanInputMode = "go" | "g" | "ml";
export type RiceType = "白米" | "無洗米" | "玄米" | "もち米";

export const INPUT_MODE_LABELS: Record<SuihanInputMode, string> = {
  go: "合数",
  g: "米の重量(g)",
  ml: "計量カップ(ml)",
};

export const RICE_TYPES: RiceType[] = ["白米", "無洗米", "玄米", "もち米"];

/** 入力モードごとのバリデーション上限（仕様書「入力仕様」の value 欄） */
export const VALUE_MAX: Record<SuihanInputMode, number> = {
  go: 20,
  g: 3000,
  ml: 3600,
};

export interface SuihanMizuInput {
  inputMode: SuihanInputMode;
  /** 入力値。未入力は null */
  value: number | null;
  riceType: RiceType;
}

export interface HakumaiWater {
  kind: "白米";
  /** 方式1: 重量ベース（米の重量×1.2） */
  weightMethodMl: number;
  /** 方式2: 合数簡易法（合数×200ml） */
  simpleMethodMl: number;
}

export interface MusenmaiWater {
  kind: "無洗米";
  minMl: number;
  maxMl: number;
}

export interface GenmaiWater {
  kind: "玄米";
  ml: number;
}

export interface MochigomeWater {
  kind: "もち米";
  ml: number;
}

export type SuihanWater = HakumaiWater | MusenmaiWater | GenmaiWater | MochigomeWater;

export interface SuihanMizuResult {
  ok: true;
  /** 合数（小数第2位まで） */
  go: number;
  /** 米の重量目安(g) */
  riceG: number;
  /** 米の体積(ml) */
  riceMl: number;
  riceType: RiceType;
  water: SuihanWater;
  /** 家庭用炊飯器の一般的な上限（1升＝10合）を超える大量炊飯かどうか */
  largeAmountNotice: boolean;
  /** 計量誤差が大きくなりやすい極小量（0.3合以下）かどうか */
  smallAmountNotice: boolean;
}

export interface SuihanMizuError {
  ok: false;
  message: string;
}

/** 炊飯器の目盛りに関する固定注記（仕様書「出力仕様」） */
export const RICE_COOKER_SCALE_NOTICE =
  "お使いの炊飯器の内釜に目盛り線がある場合は、そちらに従うのが最も正確です。";

/** 出典・前提条件の固定注記（仕様書「出力仕様」） */
export const BASIS_NOTICE =
  "1合=180ml、精白米1合≈150gという一般的な計量の目安に基づく参考値です。米の産地・精米からの経過日数・お好みの硬さによって最適な水加減は変わります。";

/** 米の種類ごとの調理メモ（仕様書「出力仕様」） */
export const RICE_TYPE_NOTES: Record<RiceType, string> = {
  白米: "重量ベース目安と合数簡易法目安には約10%の差がありますが、どちらも実務でよく使われる目安で、どちらか一方が誤りというわけではありません。",
  無洗米:
    "ぬかを洗い流す工程がない分、通常の白米より水がやや多めに必要とされます。無洗米専用の計量カップが付属している場合は、そちらの目盛りを優先してください。",
  玄米: "表皮が硬く吸水に時間がかかるため、浸水時間（30分〜一晩）を必ず取ることをおすすめします。浸水なしで炊くと芯が残りやすくなります。",
  もち米:
    "炊飯器で「もち米ご飯」として炊く場合の目安です。赤飯・おこわのように蒸して調理する場合は必要な水分量が大きく異なるため、本ツールの対象外です。",
};

function round0(value: number): number {
  return Math.round(value);
}

/**
 * 入力バリデーション。問題なければ null、エラーならメッセージを返す。
 */
export function validateSuihanMizuInput(input: SuihanMizuInput): string | null {
  if (input.value === null || Number.isNaN(input.value)) {
    return "0より大きい数値を入力してください";
  }
  if (input.value <= 0) {
    return "0より大きい数値を入力してください";
  }
  const max = VALUE_MAX[input.inputMode];
  if (input.value > max) {
    return `${INPUT_MODE_LABELS[input.inputMode]}は${max}までの数値で入力してください。家庭用炊飯器の最大容量を超える可能性があります。分けて炊くことをおすすめします。`;
  }
  return null;
}

/** 入力モードに応じて合数へ正規化する */
function normalizeToGo(value: number, inputMode: SuihanInputMode): number {
  switch (inputMode) {
    case "go":
      return value;
    case "g":
      return value / G_PER_GO;
    case "ml":
      return value / ML_PER_GO;
  }
}

/** 合数から米の重量(g)・体積(ml)を計算する */
function calcRiceWeightAndVolume(go: number): { riceG: number; riceMl: number } {
  return {
    riceG: round0(go * G_PER_GO),
    riceMl: round0(go * ML_PER_GO),
  };
}

/** 米の種類ごとに必要な水の量を計算する */
function calcWater(go: number, riceG: number, riceType: RiceType): SuihanWater {
  switch (riceType) {
    case "白米":
      return {
        kind: "白米",
        weightMethodMl: round0(riceG * 1.2),
        simpleMethodMl: round0(go * 200),
      };
    case "無洗米": {
      const base = go * 200;
      return {
        kind: "無洗米",
        minMl: round0(base + go * 15),
        maxMl: round0(base + go * 30),
      };
    }
    case "玄米":
      return { kind: "玄米", ml: round0(go * ML_PER_GO * 1.5) };
    case "もち米":
      return { kind: "もち米", ml: round0(go * ML_PER_GO * 1.0) };
  }
}

/**
 * 合数・g・ml のいずれかの入力から、米の重量・体積・必要な水の量を計算する。
 * 米の種類（白米/無洗米/玄米/もち米）で加水量の算出方法が異なる。
 */
export function calcSuihanMizu(
  input: SuihanMizuInput,
): SuihanMizuResult | SuihanMizuError {
  const message = validateSuihanMizuInput(input);
  if (message) {
    return { ok: false, message };
  }

  const value = input.value as number;
  const go = normalizeToGo(value, input.inputMode);
  const { riceG, riceMl } = calcRiceWeightAndVolume(go);
  const water = calcWater(go, riceG, input.riceType);

  return {
    ok: true,
    go: Math.round(go * 100) / 100,
    riceG,
    riceMl,
    riceType: input.riceType,
    water,
    largeAmountNotice: go > LARGE_AMOUNT_GO_THRESHOLD,
    smallAmountNotice: go <= SMALL_AMOUNT_GO_THRESHOLD,
  };
}
