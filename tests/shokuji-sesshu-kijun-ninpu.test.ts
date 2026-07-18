import { describe, expect, it } from "vitest";
import seido from "@/data/seido/shokuji-sesshu-kijun-ninpu.json";
import {
  folicAcidInfo,
  nutrientRows,
  shouldEmphasizeFolicSupplement,
  STATE_LABELS,
  type State,
} from "@/components/tools/impl/ShokujiSesshuKijunNinpu.calc";

/** 仕様書 specs/s-tools/13-shokuji-sesshu-kijun-ninpu.md のテストケース表を反映 */

const find = (state: State, key: string) => nutrientRows(state).find((r) => r.key === key);

describe("ShokujiSesshuKijunNinpu.calc — エネルギー付加量", () => {
  it("#1 初期50・中期250・後期450・授乳350（JSON由来）", () => {
    expect(find("early", "energy")?.addition).toBe(50);
    expect(find("middle", "energy")?.addition).toBe(250);
    expect(find("late", "energy")?.addition).toBe(450);
    expect(find("lactation", "energy")?.addition).toBe(350);
    expect(find("late", "energy")?.addition).toBe(seido.data.pregnancyAdditions.energy.late.value);
  });
});

describe("ShokujiSesshuKijunNinpu.calc — 鉄の付加量", () => {
  it("#2 初期は推奨量+2.5mg", () => {
    expect(find("early", "iron")?.addition).toBe(2.5);
  });
  it("#3 中期・後期は推奨量+8.5mg（同値）", () => {
    expect(find("middle", "iron")?.addition).toBe(8.5);
    expect(find("late", "iron")?.addition).toBe(8.5);
  });
  it("#4 授乳中は推奨量+2.0mg", () => {
    expect(find("lactation", "iron")?.addition).toBe(2.0);
  });
});

describe("ShokujiSesshuKijunNinpu.calc — 葉酸の付加量", () => {
  it("#5 初期は食事性葉酸の付加量0（サプリ別途）", () => {
    const row = find("early", "folate");
    expect(row?.addition).toBe(0);
    expect(row?.note).toContain("サプリ");
  });
  it("#6 中期・後期は推奨量+240µg", () => {
    expect(find("middle", "folate")?.addition).toBe(240);
    expect(find("late", "folate")?.addition).toBe(240);
  });
  it("#7 授乳中は推奨量+100µg", () => {
    expect(find("lactation", "folate")?.addition).toBe(100);
  });
});

describe("ShokujiSesshuKijunNinpu.calc — たんぱく質の付加量", () => {
  it("#8 初期0・中期5・後期25・授乳20（推奨量ベース）", () => {
    expect(find("early", "protein")?.addition).toBe(0);
    expect(find("middle", "protein")?.addition).toBe(5);
    expect(find("late", "protein")?.addition).toBe(25);
    expect(find("lactation", "protein")?.addition).toBe(20);
  });
});

describe("ShokujiSesshuKijunNinpu.calc — カルシウム・食塩", () => {
  it("#9 カルシウムは全状態で付加量0", () => {
    for (const s of ["early", "middle", "late", "lactation"] as State[]) {
      expect(find(s, "calcium")?.addition).toBe(0);
    }
  });
  it("#10 食塩相当量の目標量は文字列（6.5g未満/日）", () => {
    expect(String(find("early", "salt")?.addition)).toContain("6.5");
  });
});

describe("ShokujiSesshuKijunNinpu.calc — 葉酸サプリの推奨", () => {
  it("#11 サプリ葉酸400µg・耐容上限900µg（18〜29歳女性）はJSON由来", () => {
    const fa = folicAcidInfo();
    expect(fa.dailyAmount).toBe(400);
    expect(fa.dailyAmount).toBe(seido.data.folicAcidSupplement.dailyAmount.value);
    expect(fa.upperLimitFemale18to29).toBe(900);
    expect(fa.purpose).toContain("神経管閉鎖障害");
  });
  it("#12 妊娠初期はサプリ葉酸を特に強調する", () => {
    expect(shouldEmphasizeFolicSupplement("early")).toBe(true);
    expect(shouldEmphasizeFolicSupplement("middle")).toBe(false);
    expect(shouldEmphasizeFolicSupplement("lactation")).toBe(false);
  });
});

describe("ShokujiSesshuKijunNinpu.calc — 構造", () => {
  it("#13 各状態は7つの栄養素行を返す", () => {
    for (const s of ["early", "middle", "late", "lactation"] as State[]) {
      expect(nutrientRows(s)).toHaveLength(7);
    }
  });
  it("#14 状態ラベルは4区分そろっている", () => {
    expect(Object.keys(STATE_LABELS)).toHaveLength(4);
    expect(STATE_LABELS.early).toContain("初期");
    expect(STATE_LABELS.lactation).toBe("授乳中");
  });
  it("#15 ビタミンCの付加量は妊娠10mg・授乳45mg", () => {
    expect(find("early", "vitaminC")?.addition).toBe(10);
    expect(find("lactation", "vitaminC")?.addition).toBe(45);
  });
  it("#16 カフェインの行は存在しない（データにないため扱わない）", () => {
    for (const s of ["early", "middle", "late", "lactation"] as State[]) {
      expect(nutrientRows(s).some((r) => r.key === "caffeine")).toBe(false);
    }
  });
});
