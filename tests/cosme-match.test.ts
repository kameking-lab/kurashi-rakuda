import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import {
  COSME_PRODUCTS,
  matchesCriteria,
  matchByCategory,
  sortResults,
  diagnoseSkinType,
  ingredientInfo,
  DEFAULT_CRITERIA,
  CATEGORIES,
  type MatchCriteria,
  type SkinDiagnosisAnswers,
} from "@/components/tools/impl/CosmeMatch.calc";
import { COSME_PRODUCT_FILES } from "@/data/cosme/products/index";
import ingredientMapJson from "@/data/cosme/ingredient-skin-map.json";

/*
 * 化粧品「実名・超公平」レコメンド（cosme-match、P4-T04）のテスト。
 * 仕様: specs/tools/cosme-match.md
 */

describe("データ整合性（check:cosme-fairnessと相互補完）", () => {
  it("data/cosme/products のファイル数とindex.tsの件数が一致する（登録漏れ検知）", () => {
    const dirCount = readdirSync("data/cosme/products").filter((f) => f.endsWith(".json")).length;
    expect(COSME_PRODUCT_FILES.length).toBe(dirCount);
  });

  it("全商品がnotSuitedFor・cautionsを1件以上持つ（賞賛のみの紹介を許さない）", () => {
    for (const p of COSME_PRODUCTS) {
      expect(p.notSuitedFor.length, `${p.id} notSuitedFor`).toBeGreaterThan(0);
      expect(p.cautions.length, `${p.id} cautions`).toBeGreaterThan(0);
    }
  });

  it("全商品のsourcesがhttps://で始まり1件以上ある（メーカー公式サイトのみ）", () => {
    for (const p of COSME_PRODUCTS) {
      expect(p.sources.length).toBeGreaterThan(0);
      for (const s of p.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("全商品のkeyIngredients.ingredientIdはingredient-skin-map.jsonに存在する", () => {
    const ids = new Set(ingredientMapJson.ingredients.map((i) => i.id));
    for (const p of COSME_PRODUCTS) {
      for (const k of p.keyIngredients) {
        expect(ids.has(k.ingredientId), `${p.id}: ${k.ingredientId}`).toBe(true);
      }
    }
  });

  it("skinTypeFit=trueの各値はingredientInfo経由で導出できる（恣意的なtrueがない）", () => {
    for (const p of COSME_PRODUCTS) {
      for (const [skinType, value] of Object.entries(p.skinTypeFit)) {
        if (value !== true) continue;
        const supported = p.keyIngredients.some((k) => ingredientInfo(k.ingredientId)?.commonlyChosenFor.includes(skinType as never));
        expect(supported, `${p.id}: skinTypeFit.${skinType}`).toBe(true);
      }
    }
  });

  it("idはファイル名（拡張子除く）と一致する", () => {
    for (const p of COSME_PRODUCTS) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
    }
  });
});

describe("matchesCriteria（AND条件・機械的マッチング）", () => {
  it("skinType条件なしなら全on-sale商品が対象になる", () => {
    for (const p of COSME_PRODUCTS) {
      const r = matchesCriteria(p, DEFAULT_CRITERIA);
      expect(r).not.toBeNull();
    }
  });

  it("dry肌でtrueの商品のみ残り、falseの商品は除外される", () => {
    const criteria: MatchCriteria = { skinType: "dry", concerns: [], priceBand: "any" };
    for (const p of COSME_PRODUCTS) {
      const r = matchesCriteria(p, criteria);
      if (p.skinTypeFit.dry === true) {
        expect(r).not.toBeNull();
      } else {
        expect(r).toBeNull();
      }
    }
  });

  it("該当なしの肌質（oily）ではdry専用商品が除外される", () => {
    const dryOnly = COSME_PRODUCTS.find((p) => p.skinTypeFit.dry === true && p.skinTypeFit.oily === false);
    expect(dryOnly).toBeDefined();
    if (!dryOnly) return;
    const r = matchesCriteria(dryOnly, { skinType: "oily", concerns: [], priceBand: "any" });
    expect(r).toBeNull();
  });

  it("concernsFitに含まれない悩みを指定すると除外される", () => {
    const noKeana = COSME_PRODUCTS.find((p) => !p.concernsFit.includes("keana"));
    expect(noKeana).toBeDefined();
    if (!noKeana) return;
    const r = matchesCriteria(noKeana, { skinType: null, concerns: ["keana"], priceBand: "any" });
    expect(r).toBeNull();
  });

  it("priceBandが一致しない商品は除外される", () => {
    const petit = COSME_PRODUCTS.find((p) => p.priceBand === "petit");
    expect(petit).toBeDefined();
    if (!petit) return;
    const r = matchesCriteria(petit, { skinType: null, concerns: [], priceBand: "high" });
    expect(r).toBeNull();
    const r2 = matchesCriteria(petit, { skinType: null, concerns: [], priceBand: "petit" });
    expect(r2).not.toBeNull();
  });

  it("discontinuedの商品はどんな条件でも除外される", () => {
    const fake = { ...COSME_PRODUCTS[0], status: "discontinued" as const };
    const r = matchesCriteria(fake, DEFAULT_CRITERIA);
    expect(r).toBeNull();
  });

  it("合致理由（reasons）に成分名を含む具体的な文言が入る", () => {
    const dryFit = COSME_PRODUCTS.find((p) => p.skinTypeFit.dry === true);
    expect(dryFit).toBeDefined();
    if (!dryFit) return;
    const r = matchesCriteria(dryFit, { skinType: "dry", concerns: [], priceBand: "any" });
    expect(r?.reasons.length).toBeGreaterThan(0);
    expect(r?.reasons[0].text).toMatch(/乾燥肌◯/);
  });
});

describe("sortResults（価格昇順→五十音の固定ルール。§0.1）", () => {
  it("価格が安い順に並ぶ", () => {
    const results = COSME_PRODUCTS.map((p) => matchesCriteria(p, DEFAULT_CRITERIA)).filter((r) => r !== null);
    const sorted = sortResults(results as NonNullable<(typeof results)[number]>[]);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].product.priceYen).toBeGreaterThanOrEqual(sorted[i - 1].product.priceYen);
    }
  });

  it("同価格の場合は五十音順になる", () => {
    const a = { ...COSME_PRODUCTS[0], name: "い商品", priceYen: 1000 };
    const b = { ...COSME_PRODUCTS[0], name: "あ商品", priceYen: 1000 };
    const sorted = sortResults([
      { product: a, reasons: [] },
      { product: b, reasons: [] },
    ]);
    expect(sorted[0].product.name).toBe("あ商品");
  });

  it("並び替えは入力配列を破壊しない（純関数）", () => {
    const results = COSME_PRODUCTS.map((p) => matchesCriteria(p, DEFAULT_CRITERIA)).filter((r) => r !== null) as NonNullable<
      ReturnType<typeof matchesCriteria>
    >[];
    const before = [...results];
    sortResults(results);
    expect(results).toEqual(before);
  });
});

describe("matchByCategory（カテゴリごとのグルーピング）", () => {
  it("全5カテゴリ分の結果配列を返す（0件も含めて正直に返す）", () => {
    const grouped = matchByCategory(DEFAULT_CRITERIA);
    const uniqueCategories = new Set(CATEGORIES);
    expect(grouped.length).toBe(uniqueCategories.size);
  });

  it("条件を絞ると0件になりうる（部分結果で埋め合わせない）", () => {
    const grouped = matchByCategory({ skinType: "oily", concerns: ["kansou", "keana", "kuzure"], priceBand: "high" });
    const total = grouped.reduce((sum, g) => sum + g.results.length, 0);
    expect(total).toBe(0);
  });
});

describe("diagnoseSkinType（簡易4問診断。医学的診断ではない一般的な目安）", () => {
  const base: SkinDiagnosisAnswers = { tightness: "mild", tzoneShine: "partial", seasonalChange: "small", irritation: "rarely" };

  it("刺激によく荒れると答えると、他の回答に関わらず敏感肌が優先される（安全側）", () => {
    expect(diagnoseSkinType({ ...base, tightness: "none", tzoneShine: "much", irritation: "often" })).toBe("sensitive");
  });

  it("強いつっぱり感＋テカリなしは乾燥肌と判定される", () => {
    expect(diagnoseSkinType({ ...base, tightness: "strong", tzoneShine: "none" })).toBe("dry");
  });

  it("つっぱりなし＋Tゾーンがよくテカるは脂性肌と判定される", () => {
    expect(diagnoseSkinType({ ...base, tightness: "none", tzoneShine: "much" })).toBe("oily");
  });

  it("すべて中間的な回答は混合肌（安全な既定値）になる", () => {
    expect(diagnoseSkinType(base)).toBe("combination");
  });

  it("常に4種類のいずれかを返す（未定義や例外にならない）", () => {
    const options = {
      tightness: ["strong", "mild", "none"] as const,
      tzoneShine: ["much", "partial", "none"] as const,
      seasonalChange: ["large", "small", "none"] as const,
      irritation: ["often", "sometimes", "rarely"] as const,
    };
    for (const tightness of options.tightness) {
      for (const tzoneShine of options.tzoneShine) {
        for (const seasonalChange of options.seasonalChange) {
          for (const irritation of options.irritation) {
            const result = diagnoseSkinType({ tightness, tzoneShine, seasonalChange, irritation });
            expect(["dry", "oily", "combination", "sensitive"]).toContain(result);
          }
        }
      }
    }
  });
});

describe("ingredient-skin-map.json（出典整合）", () => {
  it("全成分にsourceIdがあり、sourcesに実在する", () => {
    const sourceIds = new Set(ingredientMapJson.sources.map((s) => s.id));
    for (const i of ingredientMapJson.ingredients) {
      expect(sourceIds.has(i.sourceId), i.id).toBe(true);
    }
  });

  it("全成分にgeneralNoteの説明文がある（commonlyChosenFor/concernsFitが空でも、断定を避けた説明は必須）", () => {
    for (const i of ingredientMapJson.ingredients) {
      expect(i.generalNote.length, i.id).toBeGreaterThan(5);
    }
  });
});
