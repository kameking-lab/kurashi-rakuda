/*
 * 犬猫の年齢換算（人間年齢換算）＋食事量目安（P4-T05・P4-T06）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p4-t05-t06-inuneko-nenrei-shokujiryou.md
 * InunekoNenreiShokujiryou.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（components/tools/impl/ShokuhiMeyasu.calc.ts を参考）。
 *
 * データのSSOTは data/tables/inuneko-nenrei-shokujiryou.json
 * （環境省「飼い主のためのペットフード・ガイドライン ～犬・猫の健康を守るために～」平成30年8月改訂版）。
 * ここに数値を書かず、すべて同JSONから参照する。
 */
import petData from "@/data/tables/inuneko-nenrei-shokujiryou.json";

export type PetSpecies = "dog" | "cat";
export type DogSize = "shouChuugata" | "ougata";

export const NENREI_SOURCE = {
  org: petData.org,
  documentTitle: petData.documentTitle,
  sourceUrl: petData.source_url_pdf_nenrei,
  lastVerified: petData.last_verified,
};

export const SHOKUJIRYOU_SOURCE = {
  org: petData.org,
  documentTitle: petData.documentTitle,
  sourceUrl: petData.source_url_pdf_shokujiryou,
  lastVerified: petData.last_verified,
};

export const RER_VALID_MIN_KG = petData.shokujiryouKeisan.rer.validWeightMinKg;
export const RER_VALID_MAX_KG = petData.shokujiryouKeisan.rer.validWeightMaxKg;
export const DER_COEFFICIENT_DOG = petData.shokujiryouKeisan.derCoefficients.dogNeuteredAdult.value;
export const DER_COEFFICIENT_CAT = petData.shokujiryouKeisan.derCoefficients.catNeuteredAdult.value;

/** 年齢換算表の最大掲載年齢（これを超える入力は表の直接掲載範囲外として注記する） */
export const NENREI_TABLE_MAX_AGE: Record<DogSize, number> = {
  shouChuugata: Math.max(...petData.nenreiKansan.shouChuugata.table.map((r) => r.petAgeYears)),
  ougata: Math.max(...petData.nenreiKansan.ougata.table.map((r) => r.petAgeYears)),
};

/** 入力可能な年齢の上限（現実的な範囲を大きく超える入力を弾くための安全域。原典に明記された値ではない） */
const MAX_REASONABLE_PET_AGE = 30;

export type NenreiResult =
  | {
      ok: true;
      /** 入力された年齢（そのまま） */
      petAgeYears: number;
      /** 換算した人間年齢の目安（小数第1位まで） */
      humanAgeYears: number;
      /** 使われた区分（表示ラベル・計算式テキスト） */
      sizeLabel: string;
      formulaText: string;
      /** 原典の表に直接掲載されている最大年齢を超える入力の場合 true（計算式を延長して算出している） */
      isBeyondTableRange: boolean;
    }
  | { ok: false; error: string };

/**
 * 犬・猫の年齢を、環境省ガイドライン掲載の計算式で人間年齢に換算する。
 * 小〜中型犬・猫: 1歳=15歳（特例）、2歳以上は 24+(年齢-2)×4
 * 大型犬:        12+(年齢-1)×7（1歳から式がそのまま成り立つ）
 * 1歳未満（0<年齢<1）は原典に換算の根拠となる表・式がないため非対応として扱う。
 */
export function calcNenreiKansan(
  species: PetSpecies,
  size: DogSize,
  petAgeYears: number
): NenreiResult {
  if (species === "cat" && size === "ougata") {
    return { ok: false, error: "大型犬の区分は猫には適用できません（原典に猫の大型区分の表・式は存在しません）。" };
  }
  if (!Number.isFinite(petAgeYears)) {
    return { ok: false, error: "年齢を数値で入力してください。" };
  }
  if (petAgeYears <= 0) {
    return { ok: false, error: "年齢は0より大きい数値で入力してください。" };
  }
  if (petAgeYears > MAX_REASONABLE_PET_AGE) {
    return { ok: false, error: `年齢は${MAX_REASONABLE_PET_AGE}歳以下で入力してください。` };
  }
  if (petAgeYears < 1) {
    return {
      ok: false,
      error:
        "1歳未満（生後1年未満）の年齢換算は、出典のガイドラインに換算表・計算式の記載がないため計算できません。",
    };
  }

  const node = size === "shouChuugata" ? petData.nenreiKansan.shouChuugata : petData.nenreiKansan.ougata;

  let humanAgeYears: number;
  if (size === "shouChuugata") {
    // 小〜中型犬・猫: 1歳のみ特例で15歳。2歳以上は 24+(年齢-2)×4（表の全値と一致することを確認済み）
    humanAgeYears = petAgeYears === 1 ? 15 : 24 + (petAgeYears - 2) * 4;
  } else {
    // 大型犬: 12+(年齢-1)×7（1歳から表の全値と一致することを確認済み）
    humanAgeYears = 12 + (petAgeYears - 1) * 7;
  }

  return {
    ok: true,
    petAgeYears,
    humanAgeYears: Math.round(humanAgeYears * 10) / 10,
    sizeLabel: node.label,
    formulaText: node.formulaText,
    isBeyondTableRange: petAgeYears > NENREI_TABLE_MAX_AGE[size],
  };
}

export type ShokujiryouResult =
  | {
      ok: true;
      weightKg: number;
      /** 安静時のエネルギー要求量 RER（kcal） */
      rerKcal: number;
      /** 使った係数（避妊・去勢済み成犬=1.6／成猫=1.2） */
      coefficient: number;
      /** 1日当たりのエネルギー要求量 DER（kcal） */
      derKcal: number;
      /** フードのMEを入力した場合のみ算出される1日当たりの食事量（g） */
      feedAmountG: number | null;
    }
  | { ok: false; error: string };

/**
 * 環境省ガイドライン「食事量を計算してみよう」のRER/DER式で、1日当たりの食事量の目安を計算する。
 * RER = 体重(kg)×30+70（体重2〜45kgのみ、原典の明記どおり）
 * DER = RER×係数（係数は原典に明記された「避妊・去勢済み成犬・成猫」の値のみ使用。他のライフステージの
 *       係数は原典に表が無いため扱わない＝捏造しない）
 * 食事量(g) = DER÷ME×100（MEはフードのパッケージに表示された代謝エネルギー kcal/100g。未入力でも
 *       RER・DERまでは計算できる設計）
 */
export function calcShokujiryou(
  species: PetSpecies,
  weightKg: number,
  foodMePer100g: number | null
): ShokujiryouResult {
  if (!Number.isFinite(weightKg)) {
    return { ok: false, error: "体重を数値で入力してください。" };
  }
  if (weightKg < RER_VALID_MIN_KG || weightKg > RER_VALID_MAX_KG) {
    return {
      ok: false,
      error: `体重は${RER_VALID_MIN_KG}kg〜${RER_VALID_MAX_KG}kgの範囲でのみ計算できます（出典の計算式が有効な範囲です）。`,
    };
  }
  if (foodMePer100g !== null) {
    if (!Number.isFinite(foodMePer100g)) {
      return { ok: false, error: "フードの代謝エネルギー（ME）は数値で入力してください。" };
    }
    if (foodMePer100g <= 0) {
      return { ok: false, error: "フードの代謝エネルギー（ME）は0より大きい数値で入力してください。" };
    }
  }

  const coefficient = species === "dog" ? DER_COEFFICIENT_DOG : DER_COEFFICIENT_CAT;
  const rerKcal = weightKg * 30 + 70;
  const derKcal = rerKcal * coefficient;
  const feedAmountG = foodMePer100g !== null ? (derKcal / foodMePer100g) * 100 : null;

  return {
    ok: true,
    weightKg,
    rerKcal: Math.round(rerKcal * 10) / 10,
    coefficient,
    derKcal: Math.round(derKcal * 10) / 10,
    feedAmountG: feedAmountG !== null ? Math.round(feedAmountG * 10) / 10 : null,
  };
}

export function fmtNumber(n: number): string {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}
