import { describe, it, expect } from "vitest";
import {
  calculate,
  computeMonthlyIncome,
  validate,
  resolveWeeklyHours,
  MONTHLY_DEPENDENT_GUIDE,
  type PartShiftShunyuuInput,
  type IncomeSourceInput,
} from "@/components/tools/impl/PartShiftShunyuuKeisan.calc";

/**
 * specs/b-tools/p2-t27-part-shift-shunyuu-keisan.md §テストケース表 を実装。
 *
 * ★このツールの計算ロジックは壁の金額・判定式を一切再実装していない★
 * ここで検証するのは (1) 時給・シフトから月収・年収を換算する式、
 * (2) fuyo-kabe.ts（Q3-18で検収済み）への委譲が正しく行われること、
 * (3) 通勤手当の有無によって106万円の壁と130万円の壁が異なる収入で
 * 判定されること（このツール固有の価値）、の3点。
 */

const baseInput: PartShiftShunyuuInput = {
  income: { mode: "shift", hourlyWage: 1250, daysPerWeek: 5, hoursPerDay: 4 },
  commuteAllowanceMonthly: 0,
  age: 30,
  target: "spouse",
  isStudent: false,
  employerSize: "51plus",
  overTwoMonths: true,
  supporterSalary: 6_000_000,
  sameHousehold: true,
  baseMonth: "2026-06",
};
const inp = (o: Partial<PartShiftShunyuuInput>): PartShiftShunyuuInput => ({ ...baseInput, ...o });

describe("月収→年収換算（TC1〜TC4）", () => {
  it("TC1: 時給1,250円・週5日・1日4時間 → 年収1,300,000円（週52週換算）", () => {
    const income: IncomeSourceInput = { mode: "shift", hourlyWage: 1250, daysPerWeek: 5, hoursPerDay: 4 };
    const m = computeMonthlyIncome(income, 0);
    expect(Math.round(m.baseMonthly * 12)).toBe(1_300_000);
    expect(m.weeklyHours).toBe(20);
  });

  it("TC2: 時給1,000円・週3日・1日3時間 → 年収468,000円", () => {
    const income: IncomeSourceInput = { mode: "shift", hourlyWage: 1000, daysPerWeek: 3, hoursPerDay: 3 };
    const m = computeMonthlyIncome(income, 0);
    expect(Math.round(m.baseMonthly * 12)).toBe(468_000);
  });

  it("TC3: monthlyDirectモード・月収108,000円 → 年収1,296,000円", () => {
    const income: IncomeSourceInput = {
      mode: "monthlyDirect",
      monthlyIncome: 108_000,
      weeklyHoursForMonthlyMode: 20,
    };
    const m = computeMonthlyIncome(income, 0);
    expect(Math.round(m.baseMonthly * 12)).toBe(1_296_000);
  });

  it("TC4: 通勤手当月10,000円を加えると年収換算で+120,000円（annualTotalのみ増加）", () => {
    const income: IncomeSourceInput = { mode: "shift", hourlyWage: 1250, daysPerWeek: 5, hoursPerDay: 4 };
    const withoutCommute = computeMonthlyIncome(income, 0);
    const withCommute = computeMonthlyIncome(income, 10_000);
    expect(Math.round(withoutCommute.baseMonthly * 12)).toBe(1_300_000);
    expect(Math.round(withCommute.baseMonthly * 12)).toBe(1_300_000); // 通勤手当は所定内賃金に影響しない
    expect(Math.round(withCommute.totalMonthly * 12)).toBe(1_420_000);
  });
});

describe("fuyo-kabe.ts への委譲と通勤手当による106万/130万の分離判定（TC5〜TC6）", () => {
  it("TC5: 通勤手当込みで年収が130万円以上になると、106万円の壁は所定内賃金基準・130万円の壁は総収入基準で別々に判定される", () => {
    const r = calculate(
      inp({
        income: { mode: "shift", hourlyWage: 1250, daysPerWeek: 5, hoursPerDay: 4 }, // annualBase=1,300,000
        commuteAllowanceMonthly: 10_000, // annualTotal=1,420,000
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.annualBase).toBe(1_300_000);
    expect(r.result.annualTotal).toBe(1_420_000);
    // 130万円の壁（被扶養者認定）は通勤手当込みの総収入で判定 → 1,420,000は130万円以上のため扶養から外れる
    expect(r.result.dependent.isDependent).toBe(false);
    expect(r.result.dependent.threshold).toBe(1_300_000);
  });

  it("TC6: 通勤手当なしのとき、annualBase===annualTotalとなり整合する（130万円ちょうどは扶養から外れる）", () => {
    const r = calculate(
      inp({
        income: { mode: "shift", hourlyWage: 1250, daysPerWeek: 5, hoursPerDay: 4 },
        commuteAllowanceMonthly: 0,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.annualBase).toBe(r.result.annualTotal);
    expect(r.result.annualBase).toBe(1_300_000);
    // 130万円「未満」が要件のため、ちょうど130万円は扶養から外れる
    expect(r.result.dependent.isDependent).toBe(false);
  });

  it("扶養に十分収まる年収（週3日×3時間×時給1,000円=468,000円）は130万円の壁で safe と判定される", () => {
    const r = calculate(
      inp({
        income: { mode: "shift", hourlyWage: 1000, daysPerWeek: 3, hoursPerDay: 3 },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dependent.isDependent).toBe(true);
    const dependentWall = r.result.walls.find((w) => w.name === "扶養から外れる年収");
    expect(dependentWall?.status).toBe("safe");
  });
});

describe("入力エラー処理（TC7〜TC13, TC16）", () => {
  it("TC7: 時給0円はエラー", () => {
    expect(validate(inp({ income: { mode: "shift", hourlyWage: 0, daysPerWeek: 5, hoursPerDay: 4 } }))).toMatch(
      "時給",
    );
  });

  it("TC8: 時給が負数はエラー", () => {
    expect(
      validate(inp({ income: { mode: "shift", hourlyWage: -500, daysPerWeek: 5, hoursPerDay: 4 } })),
    ).toMatch("時給");
  });

  it("TC9: 週の勤務日数8日はエラー", () => {
    expect(
      validate(inp({ income: { mode: "shift", hourlyWage: 1200, daysPerWeek: 8, hoursPerDay: 4 } })),
    ).toMatch("週の勤務日数");
  });

  it("TC10: 1日の勤務時間25時間はエラー", () => {
    expect(
      validate(inp({ income: { mode: "shift", hourlyWage: 1200, daysPerWeek: 5, hoursPerDay: 25 } })),
    ).toMatch("1日の勤務時間");
  });

  it("TC11: monthlyDirectモードで月収が負数はエラー", () => {
    expect(
      validate(
        inp({ income: { mode: "monthlyDirect", monthlyIncome: -1, weeklyHoursForMonthlyMode: 20 } }),
      ),
    ).toMatch("月収");
  });

  it("TC12: monthlyDirectモードで月収が非現実的に大きいとエラー", () => {
    expect(
      validate(
        inp({
          income: { mode: "monthlyDirect", monthlyIncome: 20_000_000, weeklyHoursForMonthlyMode: 20 },
        }),
      ),
    ).toMatch("現実的な範囲");
  });

  it("TC13: 年齢0歳・150歳はエラー", () => {
    expect(validate(inp({ age: 0 }))).toMatch("年齢");
    expect(validate(inp({ age: 150 }))).toMatch("年齢");
  });

  it("TC16: monthlyDirectモードで週の所定労働時間が負数はエラー", () => {
    expect(
      validate(
        inp({
          income: { mode: "monthlyDirect", monthlyIncome: 100_000, weeklyHoursForMonthlyMode: -1 },
        }),
      ),
    ).toMatch("週の所定労働時間");
  });

  it("有効な入力はエラーなし（null）", () => {
    expect(validate(baseInput)).toBeNull();
  });
});

describe("fuyo-kabe.tsへの委譲: 賃金要件撤廃（2026年10月）の分岐（TC14〜TC15）", () => {
  it("TC14: baseMonth=2026-06（撤廃前）は賃金要件が有効", () => {
    const r = calculate(inp({ baseMonth: "2026-06" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.shaho.wageRequirementActive).toBe(true);
  });

  it("TC15: baseMonth=2026-11（撤廃後）は賃金要件が無効", () => {
    const r = calculate(inp({ baseMonth: "2026-11" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.shaho.wageRequirementActive).toBe(false);
  });
});

describe("月次目安（108,333円）との整合性（TC17）", () => {
  it("TC17: 月次目安は年収130万円÷12と一致する", () => {
    expect(MONTHLY_DEPENDENT_GUIDE).toBe(108_333);
    expect(Math.floor(1_300_000 / 12)).toBe(MONTHLY_DEPENDENT_GUIDE);
  });

  it("月収がちょうど月次目安のとき monthlyDependentRemaining はほぼ0", () => {
    const r = calculate(
      inp({
        income: { mode: "monthlyDirect", monthlyIncome: MONTHLY_DEPENDENT_GUIDE, weeklyHoursForMonthlyMode: 20 },
        commuteAllowanceMonthly: 0,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.abs(r.result.monthlyDependentRemaining)).toBeLessThan(1);
  });

  it("月次目安を超えると monthlyDependentRemaining が負になる", () => {
    const r = calculate(
      inp({
        income: {
          mode: "monthlyDirect",
          monthlyIncome: MONTHLY_DEPENDENT_GUIDE + 10_000,
          weeklyHoursForMonthlyMode: 20,
        },
        commuteAllowanceMonthly: 0,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.monthlyDependentRemaining).toBeLessThan(0);
  });
});

describe("週の所定労働時間の解決（resolveWeeklyHours）", () => {
  it("shiftモードは 1日の時間×週の日数 から自動算出する", () => {
    expect(resolveWeeklyHours({ mode: "shift", hourlyWage: 1200, daysPerWeek: 4, hoursPerDay: 5 })).toBe(20);
  });

  it("monthlyDirectモードは入力値をそのまま使う", () => {
    expect(resolveWeeklyHours({ mode: "monthlyDirect", monthlyIncome: 100_000, weeklyHoursForMonthlyMode: 25 })).toBe(
      25,
    );
  });
});
