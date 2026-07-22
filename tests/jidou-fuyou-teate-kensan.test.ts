import { describe, expect, it } from "vitest";
import {
  applicableIncomeYear,
  calcJidouFuyouTeate,
  estimateRecipientIncomeFromSalary,
  salaryIncomeForYear,
} from "@/components/tools/impl/JidouFuyouTeate.calc";

describe("児童扶養手当 年収→所得換算の検算", () => {
  it("11月の切替前後で参照する所得年を変える", () => {
    expect(applicableIncomeYear(new Date(2026, 9, 31))).toBe(2024);
    expect(applicableIncomeYear(new Date(2026, 10, 1))).toBe(2025);
  });

  it("令和6年分と令和7年分の最低保障額差を反映する", () => {
    expect(salaryIncomeForYear(1_600_000, 2024)).toBe(1_050_000);
    expect(salaryIncomeForYear(1_600_000, 2025)).toBe(950_000);
    expect(estimateRecipientIncomeFromSalary(1_600_000, 2024)?.recipientIncome).toBe(870_000);
    expect(estimateRecipientIncomeFromSalary(1_600_000, 2025)?.recipientIncome).toBe(770_000);
  });

  it("診断アンカー: 年収160万円→所得77万円→全部支給", () => {
    const estimate = estimateRecipientIncomeFromSalary(1_600_000, 2025)!;
    const result = calcJidouFuyouTeate({
      childrenCount: 1,
      dependentsCount: 1,
      recipientIncome: estimate.recipientIncome,
    });
    expect(result.ok && result.status).toBe("full");
    expect(result.ok && result.totalMonthly).toBe(48_050);
  });

  it("診断アンカー: 年収250万円・児童2人・扶養2人→月額58,160円", () => {
    const estimate = estimateRecipientIncomeFromSalary(2_500_000, 2025)!;
    expect(estimate.recipientIncome).toBe(1_490_000);
    const result = calcJidouFuyouTeate({
      childrenCount: 2,
      dependentsCount: 2,
      recipientIncome: estimate.recipientIncome,
    });
    expect(result.ok && result.status).toBe("partial");
    expect(result.ok && result.totalMonthly).toBe(58_160);
  });

  it.each([0, 1, 2, 3])("扶養%d人の全部支給限度ちょうどと±1円", (dependentsCount) => {
    const baseline = calcJidouFuyouTeate({ childrenCount: 1, dependentsCount, recipientIncome: 0 });
    if (!baseline.ok) throw new Error("限度額を取得できません");
    const limit = baseline.limits.fullPayment;
    expect(calcJidouFuyouTeate({ childrenCount: 1, dependentsCount, recipientIncome: limit - 1 })).toMatchObject({ ok: true, status: "full" });
    expect(calcJidouFuyouTeate({ childrenCount: 1, dependentsCount, recipientIncome: limit })).toMatchObject({ ok: true, status: "partial" });
    expect(calcJidouFuyouTeate({ childrenCount: 1, dependentsCount, recipientIncome: limit + 1 })).toMatchObject({ ok: true, status: "partial" });
  });

  it("一部支給限度ちょうどで支給停止", () => {
    const baseline = calcJidouFuyouTeate({ childrenCount: 1, dependentsCount: 2, recipientIncome: 0 });
    if (!baseline.ok) throw new Error("限度額を取得できません");
    expect(calcJidouFuyouTeate({ childrenCount: 1, dependentsCount: 2, recipientIncome: baseline.limits.partialPayment - 1 })).toMatchObject({ ok: true, status: "partial" });
    expect(calcJidouFuyouTeate({ childrenCount: 1, dependentsCount: 2, recipientIncome: baseline.limits.partialPayment })).toMatchObject({ ok: true, status: "fullStop" });
  });
});
