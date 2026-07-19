import { describe, it, expect } from "vitest";
import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES } from "@/app/lib/tools/types";
import { normalizeText } from "@/lib/search/normalize";
import { searchTools, isWeakResult, WEAK_HIT_THRESHOLD } from "@/lib/search/searchTools";

/**
 * AI-1 あいまい検索（1段目・クライアント完結・AI不使用）のテスト。
 * specs/ai/01-fuzzy-search-client.md §4: かな・話し言葉クエリで期待ツールが上位に出ることを固定する。
 */
const live = tools.filter((t) => t.status === "live");
const catLabel = (c: string) => TOOL_CATEGORIES[c as keyof typeof TOOL_CATEGORIES] ?? c;
const topSlug = (q: string): string | null => {
  const hits = searchTools(q, live, catLabel);
  return hits.length ? hits[0].tool.slug : null;
};

describe("normalizeText: 正規化パイプライン", () => {
  it("カタカナ→ひらがな折りたたみ", () => {
    expect(normalizeText("ホイクリョウ")).toBe(normalizeText("ほいくりょう"));
  });
  it("全角英数→半角・小文字化（NFKC）", () => {
    expect(normalizeText("ＡＢＣ１２３")).toBe("abc123");
  });
  it("長音符・中点・空白・記号を除去", () => {
    expect(normalizeText("じたん・きゅうりょう （手取り）")).toBe("じたんきゅうりょう手取り");
    expect(normalizeText("ら ー めん")).toBe("らめん");
  });
});

describe("searchTools: かな・話し言葉クエリで期待ツールが上位に出る", () => {
  const cases: [string, string][] = [
    ["ほいくりょう", "hoikuryo"],
    ["保育園の料金", "hoikuryo"],
    ["保育園 お金", "hoikuryo"],
    ["じたんきゅうりょう", "jitan-kyuyo"],
    ["時短の給料", "jitan-kyuyo"],
    ["りにゅうしょく", "rinyushoku-ryo"],
    ["離乳食の量", "rinyushoku-ryo"],
    ["げつれい", "getsurei"],
    ["生後何日", "getsurei"],
    ["ちゃいるどしーと", "child-seat-kitei"],
    ["扶養の壁", "fuyo-kabe"],
    ["よぼうせっしゅ", "yobousesshu"],
    ["こども手当", "jido-teate"],
    ["大さじ 何グラム", "chomiryo-kanzan"],
  ];
  for (const [query, expectedSlug] of cases) {
    it(`「${query}」→ ${expectedSlug} が最上位`, () => {
      expect(topSlug(query)).toBe(expectedSlug);
    });
  }
});

describe("isWeakResult: 2段目ボタン表示条件", () => {
  it("強いクエリ（タイトル/solve一致）は弱くない", () => {
    expect(isWeakResult(searchTools("保育料", live, catLabel))).toBe(false);
    expect(isWeakResult(searchTools("じたんきゅうりょう", live, catLabel))).toBe(false);
  });
  it("該当ツールが無いクエリは弱い（0件）", () => {
    const hits = searchTools("あいうえおかきくけこ存在しない語", live, catLabel);
    expect(hits.length).toBe(0);
    expect(isWeakResult(hits)).toBe(true);
  });
  it("閾値は部分一致1件分（前方一致以上なら弱くない）", () => {
    expect(WEAK_HIT_THRESHOLD).toBe(7);
  });
});
