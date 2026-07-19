import { describe, expect, it } from "vitest";
import {
  calcDenkidai,
  fmtYen,
  DEFAULT_TANKA_YEN_PER_KWH,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  TANKA_SOURCE,
} from "@/components/tools/impl/KadenDenkidaiKeisan.calc";

/*
 * 家電別電気代計算（P4-T01）のテスト。
 * 単価データは data/tables/kaden-denkidai-tanka.json（家電公取協 目安単価31円/kWh）を正とする。
 */

describe("calcDenkidai", () => {
  it("#1 基本式: 1000W・1時間・31円/kWh → 31円/日", () => {
    const r = calcDenkidai(1000, 1, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dailyKwh).toBeCloseTo(1, 10);
    expect(r.dailyYenRaw).toBeCloseTo(31, 10);
    expect(r.dailyYen).toBe(31);
  });

  it("#2 500W・2時間・31円/kWh → 31円/日", () => {
    const r = calcDenkidai(500, 2, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dailyKwh).toBeCloseTo(1, 10);
    expect(r.dailyYen).toBe(31);
  });

  it("#3 月換算はDAYS_PER_MONTH(30日)倍になる", () => {
    const r = calcDenkidai(1000, 1, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.monthlyYen).toBe(Math.round(r.dailyYenRaw * DAYS_PER_MONTH));
    expect(r.monthlyYen).toBe(930);
  });

  it("#4 年換算はDAYS_PER_YEAR(365日)倍になる", () => {
    const r = calcDenkidai(1000, 1, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.yearlyYen).toBe(Math.round(r.dailyYenRaw * DAYS_PER_YEAR));
    expect(r.yearlyYen).toBe(11315);
  });

  it("#5 W数が小数でも計算できる（ドライヤー1200.5Wなど）", () => {
    const r = calcDenkidai(1200.5, 0.25, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dailyKwh).toBeCloseTo((1200.5 / 1000) * 0.25, 10);
  });

  it("#6 使用時間が小数（0.5時間=30分）でも計算できる", () => {
    const r = calcDenkidai(600, 0.5, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dailyKwh).toBeCloseTo(0.3, 10);
  });

  it("#7 使用時間ちょうど24時間は許可される（冷蔵庫など常時稼働）", () => {
    const r = calcDenkidai(150, 24, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hoursPerDay).toBe(24);
  });

  it("#8 使用時間が24時間を超えるとエラー", () => {
    const r = calcDenkidai(150, 24.5, 31);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("24時間以内");
  });

  it("#9 W数が0はエラー", () => {
    const r = calcDenkidai(0, 1, 31);
    expect(r.ok).toBe(false);
  });

  it("#10 W数が負数はエラー", () => {
    const r = calcDenkidai(-100, 1, 31);
    expect(r.ok).toBe(false);
  });

  it("#11 使用時間が0はエラー", () => {
    const r = calcDenkidai(1000, 0, 31);
    expect(r.ok).toBe(false);
  });

  it("#12 使用時間が負数はエラー", () => {
    const r = calcDenkidai(1000, -1, 31);
    expect(r.ok).toBe(false);
  });

  it("#13 単価が0はエラー", () => {
    const r = calcDenkidai(1000, 1, 0);
    expect(r.ok).toBe(false);
  });

  it("#14 単価が負数はエラー", () => {
    const r = calcDenkidai(1000, 1, -31);
    expect(r.ok).toBe(false);
  });

  it("#15 NaN（空欄由来）はエラーで、無言失敗にならない", () => {
    const r = calcDenkidai(NaN, 1, 31);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBeTruthy();
  });

  it("#16 Infinityはエラーになる", () => {
    const r = calcDenkidai(Infinity, 1, 31);
    expect(r.ok).toBe(false);
  });

  it("#17 単価を書き換えても比例して結果が変わる（利用者の実際の単価に対応）", () => {
    const base = calcDenkidai(1000, 1, 31);
    const changed = calcDenkidai(1000, 1, 40);
    expect(base.ok && changed.ok).toBe(true);
    if (!base.ok || !changed.ok) return;
    expect(changed.dailyYenRaw).toBeCloseTo(base.dailyYenRaw * (40 / 31), 6);
  });

  it("#18 DEFAULT_TANKA_YEN_PER_KWHはdata/tables/kaden-denkidai-tanka.jsonの31円と一致する", () => {
    expect(DEFAULT_TANKA_YEN_PER_KWH).toBe(31);
  });

  it("#19 TANKA_SOURCEに出典organization・URLが含まれる（出典3点セット表示用）", () => {
    expect(TANKA_SOURCE.org).toContain("家電公取協");
    expect(TANKA_SOURCE.sourceUrl).toMatch(/^https:\/\//);
    expect(TANKA_SOURCE.tankaYenPerKwh).toBe(31);
  });

  it("#20 極小のW数（待機電力0.1W）でも計算できる", () => {
    const r = calcDenkidai(0.1, 24, 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dailyYen).toBe(Math.round((0.1 / 1000) * 24 * 31));
  });
});

describe("fmtYen", () => {
  it("#21 3桁区切りのカンマを入れる", () => {
    expect(fmtYen(11315)).toBe("11,315");
  });

  it("#22 小数は四捨五入する", () => {
    expect(fmtYen(930.6)).toBe("931");
    expect(fmtYen(930.4)).toBe("930");
  });

  it("#23 0円も正しく表示する", () => {
    expect(fmtYen(0)).toBe("0");
  });
});
