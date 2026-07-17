/*
 * 授乳・ミルク量の目安（Q3-12）— 計算ロジック本体。
 * 仕様: specs/b-tools/24-feeding-amount-guide.md
 *
 * データ（月齢帯ごとの参照表・新生児の体重換算係数・固定文言）は
 * data/tables/junyu-milk-ryo.json を単一の情報源(SSOT)とし、本ファイルには数値をハードコードしない。
 *
 * 母乳のみの場合は ml 換算値を意図的に表示しない（母乳は哺乳量を正確に測定できないため。
 * 仕様書 §3「栄養方法による出力分岐」）。UI側は showMlValues を見て表示を切り替える。
 */
import table from "@/data/tables/junyu-milk-ryo.json";

export type FeedingType = "milkOnly" | "breastOnly" | "mixed";

export interface MlRange {
  min: number;
  max: number;
  /** 単一の目標値がある場合（新生児の1日量など）。範囲のみの場合は undefined */
  target?: number;
}

export interface JunyuMilkRyoNote {
  tone: "info" | "caution";
  text: string;
}

export interface JunyuMilkRyoInput {
  /** 0〜11の整数。12以上は対象外（outOfRange）として扱う */
  ageMonths: number;
  weightKg: number;
  feedingType: FeedingType;
}

export interface JunyuMilkRyoSuccess {
  ok: true;
  ageMonths: number;
  feedingType: FeedingType;
  /** 該当する月齢帯（またはは新生児区分）のラベル */
  rowLabel: string;
  /** 母乳のみの場合は false（ml目標値を表示しない） */
  showMlValues: boolean;
  /** 1回量目安。min===maxのときは「◯◯ml前後」として単一値表示する（perFeedApproxを参照） */
  perFeedMl: MlRange;
  perFeedApprox: boolean;
  /** 1日量目安。離乳食が主体になる月齢帯（6〜11か月）では算出せず null */
  dailyMl: MlRange | null;
  timesPerDayLabel: string;
  notes: JunyuMilkRyoNote[];
}

export interface JunyuMilkRyoValidationError {
  ok: false;
  kind: "validationError";
  field: "weight" | "age";
  message: string;
}

export interface JunyuMilkRyoOutOfRange {
  ok: false;
  kind: "outOfRange";
  message: string;
}

export type JunyuMilkRyoResult =
  | JunyuMilkRyoSuccess
  | JunyuMilkRyoValidationError
  | JunyuMilkRyoOutOfRange;

const WEIGHT_RANGE = table.weightValidRangeKg;
const NEWBORN = table.newborn;
const BY_AGE_MONTH = table.byAgeMonth;
const DISCLAIMERS = table.disclaimers;

/** 常時表示する個人差の注記（YMYL配慮事項） */
export const JUNYU_MILK_RYO_GENERAL_NOTE = DISCLAIMERS.general;
/** 母乳のみの場合に常時表示する「正確に測れない」旨の注記 */
export const JUNYU_MILK_RYO_BREASTFEEDING_MEASUREMENT_NOTE = DISCLAIMERS.breastfeedingMeasurement;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcNewborn(weightKg: number): {
  perFeedMl: MlRange;
  dailyMl: MlRange;
  timesPerDayLabel: string;
  rowLabel: string;
  notes: JunyuMilkRyoNote[];
} {
  const dailyTarget = round2(weightKg * NEWBORN.mlPerKgPerDay);
  const dailyMin = round2(weightKg * NEWBORN.mlPerKgPerDayRange.min);
  const dailyMax = round2(weightKg * NEWBORN.mlPerKgPerDayRange.max);
  const perFeed = round2(dailyTarget / NEWBORN.timesPerDay);

  const notes: JunyuMilkRyoNote[] = [];
  if (weightKg < NEWBORN.lowBirthWeightThresholdKg) {
    notes.push({ tone: "caution", text: DISCLAIMERS.lowBirthWeight });
  }
  if (weightKg < NEWBORN.referenceWeightRangeKg.min || weightKg > NEWBORN.referenceWeightRangeKg.max) {
    notes.push({ tone: "caution", text: DISCLAIMERS.unusualWeight });
  }

  return {
    perFeedMl: { min: perFeed, max: perFeed },
    dailyMl: { min: dailyMin, max: dailyMax, target: dailyTarget },
    timesPerDayLabel: `${NEWBORN.timesPerDay}回`,
    rowLabel: NEWBORN.label,
    notes,
  };
}

/**
 * 授乳・ミルク量の目安を計算する純関数。
 * 入力バリデーション（体重レンジ・月齢の整数チェック・対象月齢超過）も本関数内で行う。
 */
export function calcJunyuMilkRyo(input: JunyuMilkRyoInput): JunyuMilkRyoResult {
  const { ageMonths, weightKg, feedingType } = input;

  if (!Number.isFinite(weightKg) || weightKg < WEIGHT_RANGE.min || weightKg > WEIGHT_RANGE.max) {
    return {
      ok: false,
      kind: "validationError",
      field: "weight",
      message: `体重は${WEIGHT_RANGE.min.toFixed(1)}〜${WEIGHT_RANGE.max.toFixed(1)}kgの範囲で入力してください`,
    };
  }

  if (!Number.isInteger(ageMonths) || ageMonths < 0) {
    return {
      ok: false,
      kind: "validationError",
      field: "age",
      message: "月齢は0以上の整数で入力してください",
    };
  }

  if (ageMonths >= 12) {
    return { ok: false, kind: "outOfRange", message: DISCLAIMERS.outOfRange };
  }

  let perFeedMl: MlRange;
  let dailyMl: MlRange | null;
  let timesPerDayLabel: string;
  let rowLabel: string;
  const notes: JunyuMilkRyoNote[] = [];

  if (ageMonths === 0) {
    const newborn = calcNewborn(weightKg);
    perFeedMl = newborn.perFeedMl;
    dailyMl = newborn.dailyMl;
    timesPerDayLabel = newborn.timesPerDayLabel;
    rowLabel = newborn.rowLabel;
    notes.push(...newborn.notes);
  } else {
    const row = BY_AGE_MONTH.find((r) => (r.monthsCovered as number[]).includes(ageMonths));
    if (!row) {
      return {
        ok: false,
        kind: "validationError",
        field: "age",
        message: "月齢は0〜11の整数で入力してください",
      };
    }
    perFeedMl = { ...row.perFeedMl };
    dailyMl = row.dailyMl ? { ...row.dailyMl } : null;
    timesPerDayLabel = row.timesPerDayLabel;
    rowLabel = row.label;
    if (row.note) notes.push({ tone: "info", text: row.note });
  }

  if (feedingType === "breastOnly") {
    notes.push({ tone: "info", text: DISCLAIMERS.breastfeedingGuidance });
    notes.push({ tone: "info", text: DISCLAIMERS.breastfeedingMeasurement });
  } else if (feedingType === "mixed") {
    notes.push({ tone: "info", text: DISCLAIMERS.mixedFeedingAdjustment });
  }

  return {
    ok: true,
    ageMonths,
    feedingType,
    rowLabel,
    showMlValues: feedingType !== "breastOnly",
    perFeedMl,
    perFeedApprox: perFeedMl.min === perFeedMl.max,
    dailyMl,
    timesPerDayLabel,
    notes,
  };
}
