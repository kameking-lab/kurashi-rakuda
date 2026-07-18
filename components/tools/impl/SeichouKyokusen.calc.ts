/*
 * 成長曲線プロット（パーセンタイル）（P2-T12）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/19-seichou-kyokusen.md
 *
 * データ: data/tables/seichou-hatsuiku-percentile.json
 *   厚生労働省「令和5年乳幼児身体発育調査」のパーセンタイル値（e-Stat 統計表を機械転記）。
 *
 * ★YMYL方針★
 *   医学的な正常/異常の判定は一切しない。実測値が7つのパーセンタイル値のどこに位置するか
 *   （何パーセンタイル〜何パーセンタイルの間か）を客観的に示すのみ。3パーセンタイル未満・
 *   97パーセンタイル以上でも「異常」とは表示せず、「気になる場合は健診・小児科で相談」に留める。
 */
import data from "@/data/tables/seichou-hatsuiku-percentile.json";

export const SEICHOU_EDITION = data.edition;
export const SEICHOU_SURVEY_YEAR = data.surveyYear;
/** パーセンタイルの並び（3,10,25,50,75,90,97） */
export const PERCENTILES: number[] = data.percentiles;

export type Measure = "weight" | "height" | "head";
export type Sex = "male" | "female";

export interface Band {
  key: string;
  label: string;
  ageMonthsMin: number;
  ageMonthsMax: number;
  male: number[];
  female: number[];
}

interface MeasureData {
  label: string;
  unit: string;
  sourceId: string;
  bands: Band[];
}

const MEASURES = data.measures as unknown as Record<Measure, MeasureData>;

export const MEASURE_KEYS: Measure[] = ["weight", "height", "head"];

export function measureLabel(m: Measure): string {
  return MEASURES[m].label;
}
export function measureUnit(m: Measure): string {
  return MEASURES[m].unit;
}
export function bandsOf(m: Measure): Band[] {
  return MEASURES[m].bands;
}
export function findBand(m: Measure, key: string): Band | undefined {
  return MEASURES[m].bands.find((b) => b.key === key);
}

/** 実測値の位置区分 */
export type Zone = "below" | "between" | "above";

export interface Position {
  zone: Zone;
  /** between のとき: 下側・上側のパーセンタイル（例 50 と 75）。below/above では null */
  lowerPercentile: number | null;
  upperPercentile: number | null;
  /** 表示用ラベル（例「50〜75パーセンタイルの間」「3パーセンタイル未満」） */
  label: string;
  /** 中央値（50パーセンタイル）との差（実測−中央値） */
  diffFromMedian: number;
}

/** 実測値を7つのパーセンタイル値と照合して位置を返す */
export function classifyPosition(value: number, values: number[]): Position {
  const median = values[PERCENTILES.indexOf(50)];
  const diffFromMedian = Math.round((value - median) * 100) / 100;

  if (value < values[0]) {
    return {
      zone: "below",
      lowerPercentile: null,
      upperPercentile: PERCENTILES[0],
      label: `${PERCENTILES[0]}パーセンタイル未満`,
      diffFromMedian,
    };
  }
  const last = values.length - 1;
  if (value >= values[last]) {
    return {
      zone: "above",
      lowerPercentile: PERCENTILES[last],
      upperPercentile: null,
      label: `${PERCENTILES[last]}パーセンタイル以上`,
      diffFromMedian,
    };
  }
  for (let i = 0; i < last; i++) {
    if (value >= values[i] && value < values[i + 1]) {
      return {
        zone: "between",
        lowerPercentile: PERCENTILES[i],
        upperPercentile: PERCENTILES[i + 1],
        label: `${PERCENTILES[i]}〜${PERCENTILES[i + 1]}パーセンタイルの間`,
        diffFromMedian,
      };
    }
  }
  // 到達しない（単調性が保証されている）が型のため
  return {
    zone: "between",
    lowerPercentile: PERCENTILES[0],
    upperPercentile: PERCENTILES[last],
    label: "範囲内",
    diffFromMedian,
  };
}

export interface SeichouInput {
  measure: Measure;
  sex: Sex;
  bandKey: string;
  value: number;
}

export interface SeichouResult {
  ok: true;
  measure: Measure;
  measureLabel: string;
  unit: string;
  band: Band;
  /** 選んだ性別・バンドの7パーセンタイル値 */
  values: number[];
  median: number;
  position: Position;
  /** プロット用: 実測値の水平位置（0〜1、p3を0・p97を1として線形。範囲外はクランプ） */
  plotRatio: number;
  /** プロット用: 各パーセンタイル目盛の位置（0〜1） */
  markerRatios: number[];
}

export type SeichouCalcResult = SeichouResult | { ok: false; error: string };

export function calcSeichou(input: SeichouInput): SeichouCalcResult {
  if (!MEASURE_KEYS.includes(input.measure)) {
    return { ok: false, error: "測定項目の指定が正しくありません。" };
  }
  const band = findBand(input.measure, input.bandKey);
  if (!band) {
    return { ok: false, error: "月齢・年齢区分の指定が正しくありません。" };
  }
  if (input.sex !== "male" && input.sex !== "female") {
    return { ok: false, error: "性別の指定が正しくありません。" };
  }
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return { ok: false, error: "実測値を入力してください。" };
  }

  const values = input.sex === "male" ? band.male : band.female;
  const median = values[PERCENTILES.indexOf(50)];
  const position = classifyPosition(input.value, values);

  const min = values[0];
  const max = values[values.length - 1];
  const span = max - min;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const plotRatio = span > 0 ? clamp((input.value - min) / span) : 0.5;
  const markerRatios = values.map((v) => (span > 0 ? (v - min) / span : 0.5));

  return {
    ok: true,
    measure: input.measure,
    measureLabel: MEASURES[input.measure].label,
    unit: MEASURES[input.measure].unit,
    band,
    values,
    median,
    position,
    plotRatio,
    markerRatios,
  };
}

export function fmtValue(n: number, unit: string): string {
  const s = unit === "kg" ? n.toFixed(2) : n.toFixed(1);
  return `${s}${unit}`;
}
