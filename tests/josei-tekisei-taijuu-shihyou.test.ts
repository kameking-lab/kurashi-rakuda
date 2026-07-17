import { describe, expect, it } from "vitest";
import {
  calcBmi,
  calcJoseiTekiseiTaijuu,
  calcStandardWeightKg,
  findPregnancyWeightGainRef,
  findTargetBmiRange,
  fmtBmi,
  fmtKg,
  judgeObesityCategory,
  judgeTargetRangePosition,
  validateInput,
} from "@/components/tools/impl/JoseiTekiseiTaijuuShihyou.calc";

/*
 * 女性の適正体重・体型指標（P2-T30）のテスト。
 * データは data/tables/tekisei-taijuu-kijun.json を正とする
 * （厚生労働省 e-ヘルスネット・日本肥満学会「肥満度分類」・厚生労働省「日本人の食事摂取基準（2025年版）」・
 * こども家庭庁「妊産婦のための食生活指針 解説要領」表8）。
 * テストケース表は specs/b-tools/p2-t30-josei-tekisei-taijuu-shihyou.md と対応する。
 */

describe("calcBmi", () => {
  it("#1 身長160cm・体重47kgでBMI≈18.36（低体重の内側）", () => {
    expect(calcBmi(160, 47)).toBeCloseTo(18.36, 2);
  });

  it("身長170cm・体重60kgでBMI≈20.76", () => {
    expect(calcBmi(170, 60)).toBeCloseTo(20.7612, 4);
  });
});

describe("judgeObesityCategory 境界値", () => {
  it("#2 BMI=18.5ちょうどはNORMAL（低体重/普通体重の境界）", () => {
    expect(judgeObesityCategory(18.5).code).toBe("NORMAL");
  });

  it("BMI=18.49はUNDERWEIGHT", () => {
    expect(judgeObesityCategory(18.49).code).toBe("UNDERWEIGHT");
  });

  it("#3 BMI=25.0ちょうどはOBESE_1（普通体重/肥満1度の境界）", () => {
    expect(judgeObesityCategory(25.0).code).toBe("OBESE_1");
  });

  it("BMI=24.99はNORMAL", () => {
    expect(judgeObesityCategory(24.99).code).toBe("NORMAL");
  });

  it("#4 BMI=30.0ちょうどはOBESE_2（肥満1度/2度の境界）", () => {
    expect(judgeObesityCategory(30.0).code).toBe("OBESE_2");
  });

  it("#5 BMI=35.0ちょうどはOBESE_3（肥満2度/3度の境界）", () => {
    expect(judgeObesityCategory(35.0).code).toBe("OBESE_3");
  });

  it("#6 BMI=40.0ちょうどはOBESE_4（肥満3度/4度の境界）", () => {
    expect(judgeObesityCategory(40.0).code).toBe("OBESE_4");
  });

  it("BMI=39.99はOBESE_3", () => {
    expect(judgeObesityCategory(39.99).code).toBe("OBESE_3");
  });

  it("極端に高いBMI（例: 100）もOBESE_4のままクラッシュしない", () => {
    expect(judgeObesityCategory(100).code).toBe("OBESE_4");
  });

  it("極端に低いBMI（例: 5）もUNDERWEIGHTのままクラッシュしない", () => {
    expect(judgeObesityCategory(5).code).toBe("UNDERWEIGHT");
  });
});

describe("findTargetBmiRange / judgeTargetRangePosition 年齢区分の境界", () => {
  it("18歳は18〜49歳区分（18.5〜24.9）", () => {
    expect(findTargetBmiRange(18)?.ageLabel).toBe("18〜49歳");
  });

  it("49歳は18〜49歳区分のまま", () => {
    expect(findTargetBmiRange(49)?.ageLabel).toBe("18〜49歳");
  });

  it("#10 50歳は50〜64歳区分（20.0〜24.9）に切り替わる", () => {
    const r = findTargetBmiRange(50);
    expect(r?.ageLabel).toBe("50〜64歳");
    expect(r?.bmiFrom).toBe(20.0);
  });

  it("64歳は50〜64歳区分のまま", () => {
    expect(findTargetBmiRange(64)?.ageLabel).toBe("50〜64歳");
  });

  it("#11 65歳は65〜74歳区分（21.5〜24.9）に切り替わる", () => {
    const r = findTargetBmiRange(65);
    expect(r?.ageLabel).toBe("65〜74歳");
    expect(r?.bmiFrom).toBe(21.5);
  });

  it("74歳は65〜74歳区分のまま", () => {
    expect(findTargetBmiRange(74)?.ageLabel).toBe("65〜74歳");
  });

  it("#12 75歳は75歳以上区分（上限なし）に切り替わる", () => {
    const r = findTargetBmiRange(75);
    expect(r?.ageLabel).toBe("75歳以上");
    expect(r?.ageTo).toBeNull();
  });

  it("120歳のような高齢でも75歳以上区分でクラッシュしない", () => {
    expect(findTargetBmiRange(120)?.ageLabel).toBe("75歳以上");
  });

  it("#8 目標範囲の下限未満はbelowRange", () => {
    const r = findTargetBmiRange(30)!;
    expect(judgeTargetRangePosition(17.99, r)).toBe("belowRange");
  });

  it("#7 目標範囲内はwithinRange", () => {
    const r = findTargetBmiRange(30)!;
    expect(judgeTargetRangePosition(20.7612, r)).toBe("withinRange");
  });

  it("#9 目標範囲の上限超はaboveRange", () => {
    const r = findTargetBmiRange(30)!;
    expect(judgeTargetRangePosition(25.9516, r)).toBe("aboveRange");
  });

  it("範囲の下限ちょうどはwithinRange（境界を含む）", () => {
    const r = findTargetBmiRange(30)!;
    expect(judgeTargetRangePosition(18.5, r)).toBe("withinRange");
  });

  it("範囲の上限ちょうどはwithinRange（境界を含む）", () => {
    const r = findTargetBmiRange(30)!;
    expect(judgeTargetRangePosition(24.9, r)).toBe("withinRange");
  });
});

describe("calcStandardWeightKg", () => {
  it("身長160cmの標準体重の計算基準（BMI22）は22×1.6^2=56.32kg", () => {
    expect(calcStandardWeightKg(160)).toBeCloseTo(56.32, 2);
  });
});

describe("findPregnancyWeightGainRef マッピング", () => {
  it("UNDERWEIGHTはそのままUNDERWEIGHT区分の目安を返す", () => {
    const ref = findPregnancyWeightGainRef("UNDERWEIGHT");
    expect(ref?.gainLabel).toBe("12〜15kg");
  });

  it("NORMALはそのままNORMAL区分の目安を返す", () => {
    const ref = findPregnancyWeightGainRef("NORMAL");
    expect(ref?.gainLabel).toBe("10〜13kg");
  });

  it("OBESE_1はそのままOBESE_1区分の目安を返す", () => {
    const ref = findPregnancyWeightGainRef("OBESE_1");
    expect(ref?.gainLabel).toBe("7〜10kg");
  });

  it("OBESE_2はOBESE_2_PLUS区分（個別対応）にマッピングされる", () => {
    const ref = findPregnancyWeightGainRef("OBESE_2");
    expect(ref?.label).toBe("肥満（2度以上）");
  });

  it("OBESE_3・OBESE_4もOBESE_2_PLUS区分にマッピングされる", () => {
    expect(findPregnancyWeightGainRef("OBESE_3")?.label).toBe("肥満（2度以上）");
    expect(findPregnancyWeightGainRef("OBESE_4")?.label).toBe("肥満（2度以上）");
  });
});

describe("validateInput / calcJoseiTekiseiTaijuu 入力バリデーション", () => {
  it("#15 身長0はエラー", () => {
    expect(validateInput({ heightCm: 0, weightKg: 50 })).not.toBeNull();
  });

  it("#16 体重が負数はエラー", () => {
    expect(validateInput({ heightCm: 160, weightKg: -5 })).not.toBeNull();
  });

  it("#17 身長が上限(250cm)超はエラー", () => {
    expect(validateInput({ heightCm: 300, weightKg: 50 })).not.toBeNull();
  });

  it("#18 体重が上限(300kg)超はエラー", () => {
    expect(validateInput({ heightCm: 160, weightKg: 350 })).not.toBeNull();
  });

  it("#19 身長がNaN（非数値）はエラー", () => {
    expect(validateInput({ heightCm: NaN, weightKg: 50 })).not.toBeNull();
  });

  it("#20 年齢が負数はエラー", () => {
    expect(validateInput({ heightCm: 160, weightKg: 60, ageYears: -1 })).not.toBeNull();
  });

  it("#21 年齢が上限(120歳)超はエラー", () => {
    expect(validateInput({ heightCm: 160, weightKg: 60, ageYears: 150 })).not.toBeNull();
  });

  it("年齢が非整数はエラー", () => {
    expect(validateInput({ heightCm: 160, weightKg: 60, ageYears: 30.5 })).not.toBeNull();
  });

  it("身長・体重が範囲内・年齢未入力ならエラーなし", () => {
    expect(validateInput({ heightCm: 160, weightKg: 60 })).toBeNull();
  });

  it("calcJoseiTekiseiTaijuuは不正入力でok:falseを返す（NaN表示にならない）", () => {
    const r = calcJoseiTekiseiTaijuu({ heightCm: 0, weightKg: 50 });
    expect(r.ok).toBe(false);
  });
});

describe("calcJoseiTekiseiTaijuu 統合", () => {
  it("#7 年齢30歳・普通体重・目標範囲内", () => {
    const r = calcJoseiTekiseiTaijuu({ heightCm: 170, weightKg: 60, ageYears: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.obesityCategory.code).toBe("NORMAL");
    expect(r.result.targetRange?.position).toBe("withinRange");
    expect(r.result.targetRangeNotApplicableUnder18).toBe(false);
  });

  it("#13 年齢17歳（18歳未満）は目標BMI範囲を判定しない", () => {
    const r = calcJoseiTekiseiTaijuu({ heightCm: 160, weightKg: 60, ageYears: 17 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.targetRange).toBeNull();
    expect(r.result.targetRangeNotApplicableUnder18).toBe(true);
  });

  it("#14 年齢未入力なら目標範囲はnullで対象外フラグも立たない", () => {
    const r = calcJoseiTekiseiTaijuu({ heightCm: 160, weightKg: 60 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.targetRange).toBeNull();
    expect(r.result.targetRangeNotApplicableUnder18).toBe(false);
  });

  it("肥満2度以上のときは妊娠中の目安が「肥満（2度以上）」区分になる", () => {
    const r = calcJoseiTekiseiTaijuu({ heightCm: 160, weightKg: 80 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.obesityCategory.code).toBe("OBESE_2");
    expect(r.result.pregnancyWeightGainRef.label).toBe("肥満（2度以上）");
  });

  it("標準体重の計算基準がresultに含まれる", () => {
    const r = calcJoseiTekiseiTaijuu({ heightCm: 160, weightKg: 60 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.standardWeightKg).toBeCloseTo(56.32, 2);
  });
});

describe("fmtBmi / fmtKg", () => {
  it("BMIは小数第1位までの文字列にする", () => {
    expect(fmtBmi(18.359375)).toBe("18.4");
    expect(fmtBmi(25)).toBe("25.0");
  });

  it("kgは小数第1位までの文字列にする", () => {
    expect(fmtKg(56.32)).toBe("56.3");
  });
});
