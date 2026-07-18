import { describe, expect, it } from "vitest";
import seido from "@/data/seido/kaigo-kyugyou-kyufukin.json";
import {
  BENEFIT_RATE,
  calcKaigoKyugyou,
  cappedDailyWage,
  cappedMonthlyWage,
  MAX_DAYS,
  MONTHLY_MAX,
  MONTHLY_MIN,
  periodBenefit,
  splitPeriods,
  WAGE_MONTHLY_MAX,
  WAGE_MONTHLY_MIN,
} from "@/components/tools/impl/KaigoKyugyouKyufukin.calc";

/** 仕様書 specs/s-tools/09-kaigo-kyugyou-kyufukin.md のテストケース表を反映 */

describe("KaigoKyugyouKyufukin.calc — 賃金クランプと支給率", () => {
  it("#1 支給率はJSON由来の0.67", () => {
    expect(BENEFIT_RATE).toBe(seido.data.shikyuGaku.rate.value);
    expect(BENEFIT_RATE).toBe(0.67);
  });

  it("#2 賃金月額は上限532,200円でクランプ", () => {
    expect(cappedMonthlyWage(600000)).toBe(WAGE_MONTHLY_MAX);
    expect(cappedMonthlyWage(600000)).toBe(532200);
  });

  it("#3 賃金月額は下限90,420円でクランプ", () => {
    expect(cappedMonthlyWage(50000)).toBe(WAGE_MONTHLY_MIN);
    expect(cappedMonthlyWage(50000)).toBe(90420);
  });

  it("#4 賃金日額＝賃金月額÷30", () => {
    expect(cappedDailyWage(300000)).toBe(10000);
    expect(cappedDailyWage(600000)).toBe(17740); // 532200/30
  });

  it("#5 上限賃金・30日期間の給付＝支給上限額356,574円（JSON monthlyMax と一致）", () => {
    const p = periodBenefit(cappedDailyWage(600000), 30, 0);
    expect(p.benefit).toBe(MONTHLY_MAX);
    expect(p.benefit).toBe(356574);
  });

  it("#6 下限賃金・30日期間の給付＝支給下限額60,581円（JSON monthlyMin と一致）", () => {
    const p = periodBenefit(cappedDailyWage(50000), 30, 0);
    expect(p.benefit).toBe(MONTHLY_MIN);
    expect(p.benefit).toBe(60581);
  });
});

describe("KaigoKyugyouKyufukin.calc — 支給単位期間の分割", () => {
  it("#7 93日は[30,30,30,3]に分割される", () => {
    expect(splitPeriods(93)).toEqual([30, 30, 30, 3]);
  });

  it("#8 30日は[30]、45日は[30,15]", () => {
    expect(splitPeriods(30)).toEqual([30]);
    expect(splitPeriods(45)).toEqual([30, 15]);
  });

  it("#9 分割された日数の合計は元の日数に等しい", () => {
    for (const d of [1, 15, 30, 31, 60, 90, 93]) {
      expect(splitPeriods(d).reduce((s, x) => s + x, 0)).toBe(d);
    }
  });
});

describe("KaigoKyugyouKyufukin.calc — 給付総額", () => {
  it("#10 月額30万円・93日・無給 → 総額623,100円（201,000×3＋20,100）", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 93 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.periods.map((p) => p.benefit)).toEqual([201000, 201000, 201000, 20100]);
    expect(r.totalBenefit).toBe(623100);
  });

  it("#11 月額30万円・30日・無給 → 201,000円", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalBenefit).toBe(201000);
  });

  it("#12 93日を超える入力は93日に切り詰める（cappedToMaxDays）", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 120 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cappedToMaxDays).toBe(true);
    expect(r.effectiveLeaveDays).toBe(MAX_DAYS);
    expect(r.effectiveLeaveDays).toBe(93);
  });

  it("#13 93日ちょうどは切り詰めない", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 93 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cappedToMaxDays).toBe(false);
  });
});

describe("KaigoKyugyouKyufukin.calc — 80%調整（休業中の賃金支払）", () => {
  it("#14 賃金が賃金日額×支給日数の13%以下 → 減額なし", () => {
    const p = periodBenefit(10000, 30, 30000); // ratio 0.1
    expect(p.reduced).toBe(false);
    expect(p.benefit).toBe(201000);
  });

  it("#15 賃金が13%超〜80%未満 → 80%相当額との差額に減額", () => {
    const p = periodBenefit(10000, 30, 150000); // ratio 0.5
    expect(p.reduced).toBe(true);
    expect(p.benefit).toBe(90000); // 300000×0.8 − 150000
  });

  it("#16 賃金が80%以上 → 不支給（0円）", () => {
    const p = periodBenefit(10000, 30, 240000); // ratio 0.8
    expect(p.reduced).toBe(true);
    expect(p.benefit).toBe(0);
  });

  it("#17 無給前提の総額（totalBenefitUnpaid）は賃金支払があっても不変", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 30, wagePaidPerPeriod: 150000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalBenefit).toBe(90000);
    expect(r.totalBenefitUnpaid).toBe(201000);
  });
});

describe("KaigoKyugyouKyufukin.calc — 支給対象外・バリデーション", () => {
  it("#18 離職予定者は支給対象外の理由が付く", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 30, resigningAfterLeave: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ineligibleReasons.length).toBeGreaterThan(0);
    expect(r.ineligibleReasons[0]).toContain("離職");
  });

  it("#19 対象家族外は支給対象外の理由が付く", () => {
    const r = calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 30, familyInScope: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ineligibleReasons.some((x) => x.includes("対象家族"))).toBe(true);
  });

  it("#20 対象家族内・離職予定なしは支給対象外の理由なし", () => {
    const r = calcKaigoKyugyou({
      monthlyWage: 300000,
      leaveDays: 30,
      familyInScope: true,
      resigningAfterLeave: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ineligibleReasons).toHaveLength(0);
  });

  it("#21 賃金0以下はエラー", () => {
    expect(calcKaigoKyugyou({ monthlyWage: 0, leaveDays: 30 }).ok).toBe(false);
  });

  it("#22 日数0以下はエラー", () => {
    expect(calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 0 }).ok).toBe(false);
  });

  it("#23 休業中賃金がマイナスはエラー", () => {
    expect(
      calcKaigoKyugyou({ monthlyWage: 300000, leaveDays: 30, wagePaidPerPeriod: -1 }).ok,
    ).toBe(false);
  });
});

describe("KaigoKyugyouKyufukin.calc — ハードコード禁止（金額はJSON由来）", () => {
  it("#24 上限額・下限額はdata/seido/kaigo-kyugyou-kyufukin.jsonと一致", () => {
    expect(MONTHLY_MAX).toBe(seido.data.shikyuGaku.monthlyMax.value);
    expect(MONTHLY_MIN).toBe(seido.data.shikyuGaku.monthlyMin.value);
    expect(WAGE_MONTHLY_MAX).toBe(seido.data.shikyuGaku.wageMonthlyMax.value);
    expect(MAX_DAYS).toBe(seido.data.leaveLimits.maxDays.value);
  });
});
