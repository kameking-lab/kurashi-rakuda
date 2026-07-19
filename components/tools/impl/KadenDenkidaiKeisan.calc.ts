/*
 * 家電別電気代計算（P4-T01）の計算ロジック（純関数）。
 * 仕様: BACKLOG.md P4-T01。
 * KadenDenkidaiKeisan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（components/tools/impl/ShokuhiMeyasu.calc.ts を参考）。
 *
 * 目安単価（円/kWh）のSSOTは data/tables/kaden-denkidai-tanka.json（家電公取協公表値）。
 * 家電ごとのW数は機器により大きく異なる（同じ「エアコン」でも畳数・機種で数倍差が出る）ため、
 * 固定の「主要家電参考値表」は作らず、利用者が本体の定格表示・取扱説明書のW数を入力する方式にする
 * （推測値で埋めない原則。BACKLOG.md 冒頭の運用方針に整合）。
 */
import tankaData from "@/data/tables/kaden-denkidai-tanka.json";

export const DEFAULT_TANKA_YEN_PER_KWH: number = tankaData.tanka_yen_per_kwh;

export const TANKA_SOURCE = {
  org: tankaData.org,
  tankaYenPerKwh: tankaData.tanka_yen_per_kwh,
  revisedOnWareki: tankaData.revised_on_wareki,
  basis: tankaData.basis,
  sourceUrl: tankaData.source_url,
  lastVerified: tankaData.last_verified,
};

/** 1か月・1年の目安計算に使う日数（目安として一般的な換算に使う値。実際の日数とは誤差が出うる） */
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = 365;

export type DenkidaiResult =
  | {
      ok: true;
      wattageW: number;
      hoursPerDay: number;
      unitPriceYenPerKwh: number;
      /** 1日あたりの電力量（kWh） */
      dailyKwh: number;
      /** 1回（1日分）の電気代（円）。四捨五入前 */
      dailyYenRaw: number;
      dailyYen: number;
      monthlyYen: number;
      yearlyYen: number;
    }
  | { ok: false; error: string };

/**
 * 電気代(円) = 消費電力(W) ÷ 1000 × 使用時間(h) × 目安単価(円/kWh) の基本式で計算する。
 * 0以下・非数値（NaN・Infinityを含む）はエラーとして扱う。使用時間は1日24時間を超えられない。
 */
export function calcDenkidai(
  wattageW: number,
  hoursPerDay: number,
  unitPriceYenPerKwh: number
): DenkidaiResult {
  if (!Number.isFinite(wattageW)) {
    return { ok: false, error: "消費電力（W）を数値で入力してください。" };
  }
  if (wattageW <= 0) {
    return { ok: false, error: "消費電力（W）は0より大きい数値で入力してください。" };
  }
  if (!Number.isFinite(hoursPerDay)) {
    return { ok: false, error: "1日の使用時間を数値で入力してください。" };
  }
  if (hoursPerDay <= 0) {
    return { ok: false, error: "1日の使用時間は0より大きい数値で入力してください。" };
  }
  if (hoursPerDay > 24) {
    return { ok: false, error: "1日の使用時間は24時間以内で入力してください。" };
  }
  if (!Number.isFinite(unitPriceYenPerKwh)) {
    return { ok: false, error: "電気料金の単価（円/kWh）を数値で入力してください。" };
  }
  if (unitPriceYenPerKwh <= 0) {
    return { ok: false, error: "電気料金の単価（円/kWh）は0より大きい数値で入力してください。" };
  }

  const dailyKwh = (wattageW / 1000) * hoursPerDay;
  const dailyYenRaw = dailyKwh * unitPriceYenPerKwh;

  return {
    ok: true,
    wattageW,
    hoursPerDay,
    unitPriceYenPerKwh,
    dailyKwh,
    dailyYenRaw,
    dailyYen: Math.round(dailyYenRaw),
    monthlyYen: Math.round(dailyYenRaw * DAYS_PER_MONTH),
    yearlyYen: Math.round(dailyYenRaw * DAYS_PER_YEAR),
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
