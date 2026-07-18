import { describe, expect, it } from "vitest";
import {
  calcNinshinTaijuZoka,
  calcPrePregnancyBmi,
  fmtBmi,
  fmtGainKg,
  fmtKg,
  judgeGainComparison,
  judgePregnancyWeightGainCategory,
  validateInput,
} from "@/components/tools/impl/NinshinTaijuZokaChecker.calc";

/*
 * 妊娠中の体重増加チェッカー（P2-T15）のテスト。
 * データは data/tables/tekisei-taijuu-kijun.json の pregnancyWeightGain を正とする
 * （こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針 解説要領」表8）。
 * テストケース表は specs/b-tools/p2-t15-ninshin-taiju-zoka-checker.md と対応する。
 */

describe("calcPrePregnancyBmi", () => {
  it("#1 身長160cm・妊娠前体重45kgでBMI≈17.58（低体重の内側）", () => {
    expect(calcPrePregnancyBmi(160, 45)).toBeCloseTo(17.578, 2);
  });

  it("身長160cm・妊娠前体重60kgでBMI≈23.44", () => {
    expect(calcPrePregnancyBmi(160, 60)).toBeCloseTo(23.4375, 3);
  });
});

describe("judgePregnancyWeightGainCategory 境界値", () => {
  it("#2 BMI=18.5ちょうどはNORMAL（低体重/普通体重の境界）", () => {
    expect(judgePregnancyWeightGainCategory(18.5).code).toBe("NORMAL");
  });

  it("BMI=18.49はUNDERWEIGHT", () => {
    expect(judgePregnancyWeightGainCategory(18.49).code).toBe("UNDERWEIGHT");
  });

  it("#4 BMI=25.0ちょうどはOBESE_1（普通体重/肥満1度の境界）", () => {
    expect(judgePregnancyWeightGainCategory(25.0).code).toBe("OBESE_1");
  });

  it("BMI=24.99はNORMAL", () => {
    expect(judgePregnancyWeightGainCategory(24.99).code).toBe("NORMAL");
  });

  it("#6 BMI=30.0ちょうどはOBESE_2_PLUS（肥満1度/肥満2度以上の境界）", () => {
    expect(judgePregnancyWeightGainCategory(30.0).code).toBe("OBESE_2_PLUS");
  });

  it("BMI=29.99はOBESE_1", () => {
    expect(judgePregnancyWeightGainCategory(29.99).code).toBe("OBESE_1");
  });

  it("極端に高いBMI（例: 100）もOBESE_2_PLUSのままクラッシュしない", () => {
    expect(judgePregnancyWeightGainCategory(100).code).toBe("OBESE_2_PLUS");
  });

  it("極端に低いBMI（例: 5）もUNDERWEIGHTのままクラッシュしない", () => {
    expect(judgePregnancyWeightGainCategory(5).code).toBe("UNDERWEIGHT");
  });
});

describe("judgeGainComparison", () => {
  it("肥満2度以上（gainFromKg/gainToKgがnull）はnullを返す（自動計算しない）", () => {
    const cat = judgePregnancyWeightGainCategory(35.0);
    expect(judgeGainComparison(3, cat)).toBeNull();
  });

  it("数値レンジのある区分では範囲内でwithinTarget", () => {
    const cat = judgePregnancyWeightGainCategory(23.4375); // NORMAL 10~13kg
    expect(judgeGainComparison(11, cat)).toBe("withinTarget");
  });

  it("数値レンジのある区分では範囲未満でbelowTarget", () => {
    const cat = judgePregnancyWeightGainCategory(23.4375);
    expect(judgeGainComparison(5, cat)).toBe("belowTarget");
  });

  it("数値レンジのある区分では範囲超過でaboveTarget", () => {
    const cat = judgePregnancyWeightGainCategory(23.4375);
    expect(judgeGainComparison(20, cat)).toBe("aboveTarget");
  });
});

describe("calcNinshinTaijuZoka 正常系", () => {
  it("#1 160cm/45kg/55kg: UNDERWEIGHT・目安12〜15kg・増加量10kgは範囲より少ない", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 45, currentWeightKg: 55 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("UNDERWEIGHT");
    expect(r.result.category.gainLabel).toBe("12〜15kg");
    expect(r.result.currentGainKg).toBeCloseTo(10, 5);
    expect(r.result.isIndividualCase).toBe(false);
    expect(r.result.comparison).toBe("belowTarget");
  });

  it("#2 160cm/47.36kg/60kg: 境界ちょうどでNORMAL", () => {
    const r = calcNinshinTaijuZoka({
      heightCm: 160,
      preWeightKg: 47.36,
      currentWeightKg: 60,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("NORMAL");
  });

  it("#3 160cm/60kg/71kg: NORMAL・増加量11kgは範囲内", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 60, currentWeightKg: 71 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("NORMAL");
    expect(r.result.comparison).toBe("withinTarget");
    expect(r.result.category.note).not.toBeNull();
  });

  it("#4 160cm/64kg/71kg: 境界ちょうどでOBESE_1・目安7〜10kg", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 64, currentWeightKg: 71 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("OBESE_1");
    expect(r.result.category.gainLabel).toBe("7〜10kg");
  });

  it("#5 160cm/70kg/78kg: OBESE_1・増加量8kgは範囲内", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 70, currentWeightKg: 78 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("OBESE_1");
    expect(r.result.comparison).toBe("withinTarget");
  });

  it("#6 160cm/76.8kg/84kg: 境界ちょうどでOBESE_2_PLUS・個別対応（数値目安なし）", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 76.8, currentWeightKg: 84 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("OBESE_2_PLUS");
    expect(r.result.isIndividualCase).toBe(true);
    expect(r.result.comparison).toBeNull();
    expect(r.result.category.gainFromKg).toBeNull();
  });

  it("#7 160cm/90kg/93kg: OBESE_2_PLUSは増加量3kgのみ事実として算出し比較はしない", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 90, currentWeightKg: 93 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("OBESE_2_PLUS");
    expect(r.result.currentGainKg).toBeCloseTo(3, 5);
    expect(r.result.isIndividualCase).toBe(true);
    expect(r.result.comparison).toBeNull();
  });

  it("#8 160cm/45kg/58kg: UNDERWEIGHT・増加量13kgは範囲内", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 45, currentWeightKg: 58 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.comparison).toBe("withinTarget");
  });

  it("#9 160cm/45kg/62kg: UNDERWEIGHT・増加量17kgは範囲より多い", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 45, currentWeightKg: 62 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.comparison).toBe("aboveTarget");
  });

  it("#10 160cm/60kg/70kg: NORMAL区分は常にnote（上限13kg参考）を持つ", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 60, currentWeightKg: 70 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.category.code).toBe("NORMAL");
    expect(r.result.comparison).toBe("withinTarget");
    expect(typeof r.result.category.note).toBe("string");
  });

  it("#11 160cm/60kg/58kg: 現在の増加量がマイナスでもエラーにせず範囲より少ないと判定", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 60, currentWeightKg: 58 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.currentGainKg).toBeCloseTo(-2, 5);
    expect(r.result.comparison).toBe("belowTarget");
  });
});

describe("calcNinshinTaijuZoka 入力エラー", () => {
  it("#12 身長0は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 0, preWeightKg: 50, currentWeightKg: 55 });
    expect(r.ok).toBe(false);
  });

  it("#13 妊娠前体重が負数は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: -5, currentWeightKg: 55 });
    expect(r.ok).toBe(false);
  });

  it("#14 現在体重が負数は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 50, currentWeightKg: -5 });
    expect(r.ok).toBe(false);
  });

  it("#15 身長が上限(200)超は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 300, preWeightKg: 50, currentWeightKg: 55 });
    expect(r.ok).toBe(false);
  });

  it("#16 妊娠前体重が上限(200)超は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 250, currentWeightKg: 255 });
    expect(r.ok).toBe(false);
  });

  it("#17 現在体重が上限(250)超は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 50, currentWeightKg: 300 });
    expect(r.ok).toBe(false);
  });

  it("#18 身長が非数値（NaN）は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: NaN, preWeightKg: 50, currentWeightKg: 55 });
    expect(r.ok).toBe(false);
  });

  it("#19 妊娠前体重が0は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 0, currentWeightKg: 55 });
    expect(r.ok).toBe(false);
  });

  it("#20 現在体重が0は入力エラー", () => {
    const r = calcNinshinTaijuZoka({ heightCm: 160, preWeightKg: 50, currentWeightKg: 0 });
    expect(r.ok).toBe(false);
  });

  it("validateInputは単独でも同じエラーを返す", () => {
    expect(validateInput({ heightCm: 160, preWeightKg: 50, currentWeightKg: 55 })).toBeNull();
    expect(
      validateInput({ heightCm: 160, preWeightKg: 50, currentWeightKg: -1 }),
    ).not.toBeNull();
  });
});

describe("フォーマット関数", () => {
  it("fmtBmi は小数第1位まで", () => {
    expect(fmtBmi(23.4375)).toBe("23.4");
  });

  it("fmtKg は小数第1位まで", () => {
    expect(fmtKg(13)).toBe("13.0");
  });

  it("fmtGainKg はプラスの符号を付ける", () => {
    expect(fmtGainKg(10)).toBe("+10.0");
  });

  it("fmtGainKg はマイナスの値をそのまま表示する", () => {
    expect(fmtGainKg(-2)).toBe("-2.0");
  });

  it("fmtGainKg は0のとき符号を付けない", () => {
    expect(fmtGainKg(0)).toBe("0.0");
  });
});
