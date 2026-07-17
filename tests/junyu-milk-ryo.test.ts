import { describe, expect, it } from "vitest";
import { calcJunyuMilkRyo } from "@/components/tools/impl/JunyuMilkRyo.calc";

/** 仕様書 specs/b-tools/24-feeding-amount-guide.md の「テストケース（11件）」を反映 */

describe("JunyuMilkRyo.calc — 仕様書テストケース表（11件）", () => {
  it("#1 月齢0・体重3.0kg・ミルクのみ → 1日450ml前後（360〜480mlの目安幅）／8回／1回56.25ml前後", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 0, weightKg: 3.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.dailyMl).toEqual({ min: 360, max: 480, target: 450 });
    expect(result.timesPerDayLabel).toBe("8回");
    expect(result.perFeedMl).toEqual({ min: 56.25, max: 56.25 });
    expect(result.perFeedApprox).toBe(true);
    expect(result.showMlValues).toBe(true);
  });

  it("#2 月齢0・体重4.0kg・ミルクのみ → 1日600ml前後（480〜640mlの目安幅）／8回／1回75ml前後", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 0, weightKg: 4.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.dailyMl).toEqual({ min: 480, max: 640, target: 600 });
    expect(result.timesPerDayLabel).toBe("8回");
    expect(result.perFeedMl).toEqual({ min: 75, max: 75 });
  });

  it("#3 月齢0・体重3.5kg・母乳のみ → ml目標は非表示。欲しがるサインに応じた授乳の考え方を表示", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 0, weightKg: 3.5, feedingType: "breastOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.showMlValues).toBe(false);
    expect(result.timesPerDayLabel).toBe("8回");
    const texts = result.notes.map((n) => n.text);
    expect(texts.some((t) => t.includes("欲しがるサイン"))).toBe(true);
    expect(texts.some((t) => t.includes("正確に測れません"))).toBe(true);
  });

  it("#4 月齢1・体重5.0kg・ミルクのみ → 1回120〜160ml／6回／1日720〜960ml", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 1, weightKg: 5.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.perFeedMl).toEqual({ min: 120, max: 160 });
    expect(result.timesPerDayLabel).toBe("6回");
    expect(result.dailyMl).toEqual({ min: 720, max: 960 });
  });

  it("#5 月齢3・体重6.0kg・ミルクのみ → 1回160〜200ml／5〜6回／1日800〜1200ml", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 3, weightKg: 6.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.perFeedMl).toEqual({ min: 160, max: 200 });
    expect(result.timesPerDayLabel).toBe("5〜6回");
    expect(result.dailyMl).toEqual({ min: 800, max: 1200 });
  });

  it("#6 月齢5・体重7.0kg・混合 → 1回200〜220ml目安＋母乳分を差し引く注記＋離乳食開始前後の注記", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 5, weightKg: 7.0, feedingType: "mixed" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.perFeedMl).toEqual({ min: 200, max: 220 });
    expect(result.showMlValues).toBe(true);
    const texts = result.notes.map((n) => n.text);
    expect(texts.some((t) => t.includes("差し引いて"))).toBe(true);
    expect(texts.some((t) => t.includes("離乳食開始"))).toBe(true);
  });

  it("#7 月齢11・体重9.0kg・ミルクのみ → 1回200ml前後／2〜3回＋離乳食3回／離乳食が主体である旨の注記", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 11, weightKg: 9.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.perFeedMl).toEqual({ min: 200, max: 200 });
    expect(result.perFeedApprox).toBe(true);
    expect(result.timesPerDayLabel).toBe("2〜3回＋離乳食3回");
    expect(result.dailyMl).toBeNull();
    const texts = result.notes.map((n) => n.text);
    expect(texts.some((t) => t.includes("主体"))).toBe(true);
  });

  it("#8 月齢12・体重9.0kg・ミルクのみ → 数値計算なし。離乳食早見（#19）への案内表示", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 12, weightKg: 9.0, feedingType: "milkOnly" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected outOfRange result");
    expect(result.kind).toBe("outOfRange");
    expect(result.message).toContain("離乳食の量・固さ早見（#19）");
  });

  it("#9 月齢0・体重0.3kg（下限未満）・ミルクのみ → 入力エラー（体重は1.0〜20.0kgの範囲）", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 0, weightKg: 0.3, feedingType: "milkOnly" });
    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== "validationError") {
      throw new Error("expected validationError result");
    }
    expect(result.field).toBe("weight");
    expect(result.message).toBe("体重は1.0〜20.0kgの範囲で入力してください");
  });

  it("#10 月齢0・体重12.0kg（新生児として非現実的）・ミルクのみ → 計算は実行（1日1800ml前後）＋入力値確認の注意表示", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 0, weightKg: 12.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.dailyMl).toEqual({ min: 1440, max: 1920, target: 1800 });
    const texts = result.notes.map((n) => n.text);
    expect(texts.some((t) => t.includes("入力値をご確認ください"))).toBe(true);
    expect(texts.some((t) => t.includes("医師・助産師・保健師の指示を優先"))).toBe(false);
  });

  it("#11 月齢0・体重2.0kg（低出生体重児想定）・ミルクのみ → 1日300ml前後（240〜320mlの目安幅）＋医師等への相談の注記", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 0, weightKg: 2.0, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.dailyMl).toEqual({ min: 240, max: 320, target: 300 });
    const texts = result.notes.map((n) => n.text);
    expect(texts.some((t) => t.includes("医師・助産師・保健師の指示を優先"))).toBe(true);
    expect(texts.some((t) => t.includes("入力値をご確認ください"))).toBe(false);
  });
});

describe("JunyuMilkRyo.calc — 補助的なバリデーション・境界値", () => {
  it("体重が上限（20.0kg）は許容される", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 6, weightKg: 20.0, feedingType: "milkOnly" });
    expect(result.ok).toBe(true);
  });

  it("体重が上限超過（20.1kg）はエラー", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 6, weightKg: 20.1, feedingType: "milkOnly" });
    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== "validationError") {
      throw new Error("expected validationError result");
    }
    expect(result.field).toBe("weight");
  });

  it("月齢が負の整数はエラー", () => {
    const result = calcJunyuMilkRyo({ ageMonths: -1, weightKg: 5.0, feedingType: "milkOnly" });
    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== "validationError") {
      throw new Error("expected validationError result");
    }
    expect(result.field).toBe("age");
  });

  it("月齢が整数でない場合はエラー", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 1.5, weightKg: 5.0, feedingType: "milkOnly" });
    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== "validationError") {
      throw new Error("expected validationError result");
    }
    expect(result.field).toBe("age");
  });

  it("月齢6（離乳食開始の目安時期）は1日量を算出せず、注記に離乳食開始の案内を含む", () => {
    const result = calcJunyuMilkRyo({ ageMonths: 6, weightKg: 7.5, feedingType: "milkOnly" });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.dailyMl).toBeNull();
    expect(result.rowLabel).toBe("6〜7か月未満（離乳食開始の目安時期）");
    expect(result.notes.some((n) => n.text.includes("離乳食を開始する目安の時期"))).toBe(true);
  });

  it("月齢7・8はともに「7〜9か月未満」の行を参照する", () => {
    const result7 = calcJunyuMilkRyo({ ageMonths: 7, weightKg: 8.0, feedingType: "milkOnly" });
    const result8 = calcJunyuMilkRyo({ ageMonths: 8, weightKg: 8.0, feedingType: "milkOnly" });
    if (!result7.ok || !result8.ok) throw new Error("expected ok results");
    expect(result7.rowLabel).toBe("7〜9か月未満");
    expect(result8.rowLabel).toBe("7〜9か月未満");
  });
});
