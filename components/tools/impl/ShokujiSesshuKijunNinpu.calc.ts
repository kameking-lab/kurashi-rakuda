/*
 * 妊娠中・授乳中の栄養摂取の付加量 早見（P2-T10）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/13-shokuji-sesshu-kijun-ninpu.md
 *
 * SSOT: data/seido/shokuji-sesshu-kijun-ninpu.json（日本人の食事摂取基準2025年版）。
 * すべての付加量・推奨量は同JSONから import し、本ファイルにハードコードしない。
 *
 * ★このツールの前提★
 *  - 表示するのは「付加量」＝非妊娠時・非授乳時の同年齢区分の値に上乗せする量。
 *    付加量そのものが摂取目標ではない（notesForImplementation.additionIsOnTopOfBase）。
 *  - エネルギーの過不足はBMI・体重変化で評価する（推定エネルギー必要量は用いない）。
 *  - ★カフェインの摂取目安は本データセットに含まれないため、数値は一切示さない★
 *    （食事摂取基準はカフェインの基準を定めていない。捏造しない）。
 */
import seido from "@/data/seido/shokuji-sesshu-kijun-ninpu.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const shokujiSesshuDataset = seido as unknown as SeidoDataset;
export const SHOKUJI_SESSHU_DISCLAIMER = seido.disclaimer;

const P = seido.data.pregnancyAdditions;
const Lac = seido.data.lactationAdditions;
const FA = seido.data.folicAcidSupplement;

export type State = "early" | "middle" | "late" | "lactation";

export const STATE_LABELS: Record<State, string> = {
  early: seido.data.pregnancyPeriodDefinition.early.value,
  middle: seido.data.pregnancyPeriodDefinition.middle.value,
  late: seido.data.pregnancyPeriodDefinition.late.value,
  lactation: "授乳中",
};

export interface NutrientRow {
  key: string;
  label: string;
  /** 推奨量（またはエネルギー・目標量）の付加量 */
  addition: number | string;
  unit: string;
  /** 付加量が0のときの補足など */
  note?: string;
}

/** 状態別に、上乗せする付加量（推奨量ベース）の一覧を返す */
export function nutrientRows(state: State): NutrientRow[] {
  if (state === "lactation") {
    return [
      { key: "energy", label: "エネルギー", addition: Lac.energy.value, unit: Lac.energy.unit ?? "kcal/day" },
      { key: "protein", label: "たんぱく質", addition: Lac.proteinRecommended.value, unit: "g/day" },
      { key: "iron", label: "鉄", addition: Lac.ironRecommended.value, unit: "mg/day" },
      { key: "folate", label: "葉酸", addition: Lac.folateRecommended.value, unit: "µg/day" },
      { key: "vitaminC", label: "ビタミンC", addition: Lac.vitaminCRecommended.value, unit: "mg/day" },
      { key: "calcium", label: "カルシウム", addition: Lac.calcium.value, unit: "mg/day", note: "付加量なし（非授乳時と同じ推奨量）" },
      { key: "salt", label: "食塩相当量（目標量）", addition: Lac.salt.value, unit: "" },
    ];
  }

  const energy = state === "early" ? P.energy.early.value : state === "middle" ? P.energy.middle.value : P.energy.late.value;
  const protein =
    state === "early"
      ? P.protein.earlyRecommended.value
      : state === "middle"
        ? P.protein.middleRecommended.value
        : P.protein.lateRecommended.value;
  const iron =
    state === "early" ? P.iron.earlyRecommended.value : P.iron.middleLateRecommended.value;
  const folate =
    state === "early" ? P.folate.earlyRecommended.value : P.folate.middleLateRecommended.value;

  return [
    { key: "energy", label: "エネルギー", addition: energy, unit: "kcal/day" },
    { key: "protein", label: "たんぱく質", addition: protein, unit: "g/day", note: protein === 0 ? "初期は付加量なし" : undefined },
    { key: "iron", label: "鉄", addition: iron, unit: "mg/day" },
    { key: "folate", label: "葉酸", addition: folate, unit: "µg/day", note: folate === 0 ? "初期の食事性葉酸は付加量なし（別途サプリ400µgを推奨）" : undefined },
    { key: "vitaminC", label: "ビタミンC", addition: P.vitaminC.recommended.value, unit: "mg/day" },
    { key: "calcium", label: "カルシウム", addition: P.calcium.additionalAmount.value, unit: "mg/day", note: "付加量なし（非妊娠時と同じ推奨量）" },
    { key: "salt", label: "食塩相当量（目標量）", addition: P.salt.targetAmount.value, unit: "" },
  ];
}

export interface FolicAcidInfo {
  /** サプリ等からの葉酸推奨量 */
  dailyAmount: number;
  unit: string;
  targetPersons: string;
  purpose: string;
  upperLimitFemale18to29: number;
}

export function folicAcidInfo(): FolicAcidInfo {
  return {
    dailyAmount: FA.dailyAmount.value,
    unit: FA.dailyAmount.unit ?? "µg/day",
    targetPersons: FA.targetPersons.value,
    purpose: FA.purpose.value,
    upperLimitFemale18to29: FA.upperLimitFemale18to29.value,
  };
}

/** 神経管閉鎖障害リスク低減のためのサプリ葉酸を特に案内すべき状態か（計画中・初期） */
export function shouldEmphasizeFolicSupplement(state: State): boolean {
  return state === "early";
}
