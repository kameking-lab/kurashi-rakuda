import { describe, expect, it } from "vitest";
import { fmt, INGREDIENTS, toMl } from "@/components/tools/impl/ChomiryoKanzan.calc";

/*
 * 調味料換算（Q3-14）— toMl（単位→ml換算）・fmt（表示用丸め）・INGREDIENTS（比重データ）のテスト。
 * BACKLOG.md 記載の「ユニットテスト → 検収」を満たすため、既存ロジック（変更なし）を対象に、
 * 単位換算（大さじ／小さじ／g／ml）・比重の異なる調味料・境界値（0・負値）を検証する。
 * ロジック本体は ChomiryoKanzan.tsx から ChomiryoKanzan.calc.ts に分離した（他のB級ツールと
 * 同じ構成。tsconfig の jsx:"preserve" により、JSXを含む .tsx を直接vitestでimportすると
 * import解析エラーになるため、既存パターン（*.calc.ts）に倣った）。
 */

describe("toMl — 単位からmlへの換算", () => {
  it("大さじ1（水, gPerTbsp:15）→ 15ml", () => {
    expect(toMl(1, "大さじ", 15)).toBe(15);
  });

  it("大さじ2（しょうゆ, gPerTbsp:18）→ 30ml（大さじ換算は比重に依存しない）", () => {
    expect(toMl(2, "大さじ", 18)).toBe(30);
  });

  it("小さじ1（水, gPerTbsp:15）→ 5ml", () => {
    expect(toMl(1, "小さじ", 15)).toBe(5);
  });

  it("小さじ3（塩, gPerTbsp:18）→ 15ml", () => {
    expect(toMl(3, "小さじ", 18)).toBe(15);
  });

  it("ml指定はそのまま返る（そのまま透過）", () => {
    expect(toMl(100, "ml", 18)).toBe(100);
  });

  it("g→ml（水, gPerTbsp:15）: 15g → 15ml（大さじ1杯=15g=15ml）", () => {
    expect(toMl(15, "g", 15)).toBe(15);
  });

  it("g→ml（しょうゆ, gPerTbsp:18）: 18g → 15ml（大さじ1杯=18g=15ml）", () => {
    expect(toMl(18, "g", 18)).toBe(15);
  });

  it("g→ml（砂糖・上白糖, gPerTbsp:9）: 9g → 15ml（比重が軽い調味料の換算）", () => {
    expect(toMl(9, "g", 9)).toBe(15);
  });

  it("g→ml（はちみつ, gPerTbsp:21）: 21g → 15ml（比重が重い調味料の換算）", () => {
    expect(toMl(21, "g", 21)).toBeCloseTo(15);
  });

  it("g→ml（サラダ油, gPerTbsp:12）: 24g → 30ml", () => {
    expect(toMl(24, "g", 12)).toBe(30);
  });

  it("0を渡すとどの単位でも0mlになる", () => {
    expect(toMl(0, "大さじ", 15)).toBe(0);
    expect(toMl(0, "小さじ", 18)).toBe(0);
    expect(toMl(0, "ml", 9)).toBe(0);
    expect(toMl(0, "g", 21)).toBe(0);
  });

  it("負の値も計算式どおりに符号を保って返す（バリデーションはUI側の責務）", () => {
    expect(toMl(-1, "大さじ", 15)).toBe(-15);
    expect(toMl(-9, "g", 9)).toBe(-15);
  });

  it("小数の量も正しく換算する（小さじ0.5）", () => {
    expect(toMl(0.5, "小さじ", 15)).toBeCloseTo(2.5);
  });

  it("大きな量でも比例して換算する（大さじ100）", () => {
    expect(toMl(100, "大さじ", 15)).toBe(1500);
  });

  it("みそ（gPerTbsp:18）と料理酒（gPerTbsp:15）でg→ml換算結果が異なる", () => {
    const misoMl = toMl(18, "g", 18); // 大さじ1杯分のみそ
    const sakeMl = toMl(18, "g", 15); // みそと同じ18gの料理酒
    expect(misoMl).toBe(15);
    expect(sakeMl).toBeCloseTo(18);
    expect(misoMl).not.toBe(sakeMl);
  });
});

describe("fmt — 表示用の丸め・桁区切り", () => {
  it("小数第1位に丸める", () => {
    expect(fmt(3.14159)).toBe("3.1");
  });

  it("整数はそのまま（末尾の.0は付かない）", () => {
    expect(fmt(15)).toBe("15");
  });

  it("0はそのまま0", () => {
    expect(fmt(0)).toBe("0");
  });

  it("負の値も丸めて符号を保持する", () => {
    expect(fmt(-2.46)).toBe("-2.5");
  });

  it("1000以上は3桁区切りのカンマが入る（ja-JP表記）", () => {
    expect(fmt(1234.5)).toBe("1,234.5");
  });
});

describe("INGREDIENTS — 比重データ", () => {
  it("18種の調味料が定義されている", () => {
    expect(INGREDIENTS.length).toBe(18);
  });

  it("水は大さじ1=15g（基準）", () => {
    expect(INGREDIENTS.find((i) => i.name === "水")?.gPerTbsp).toBe(15);
  });

  it("しょうゆ・みりん・みそは大さじ1=18g", () => {
    expect(INGREDIENTS.find((i) => i.name === "しょうゆ")?.gPerTbsp).toBe(18);
    expect(INGREDIENTS.find((i) => i.name === "みりん")?.gPerTbsp).toBe(18);
    expect(INGREDIENTS.find((i) => i.name === "みそ")?.gPerTbsp).toBe(18);
  });

  it("砂糖（上白糖）は大さじ1=9g（水より軽い）", () => {
    expect(INGREDIENTS.find((i) => i.name === "砂糖（上白糖）")?.gPerTbsp).toBe(9);
  });

  it("全項目のgPerTbspが正の数である", () => {
    for (const item of INGREDIENTS) {
      expect(item.gPerTbsp).toBeGreaterThan(0);
    }
  });
});
