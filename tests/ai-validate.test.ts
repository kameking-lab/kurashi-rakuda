import { describe, it, expect } from "vitest";
import { validateModelOutput } from "@/lib/ai/validate";

/**
 * AI 応答のサーバー側検証（specs/ai/02 §2・docs/16 §4-3）。
 * 幻覚 URL の除去・URL/HTML 混入の破棄・code 正規化を固定する。
 */
const REAL_TOOL = "/tools/childcare/hoikuryo"; // 実在するツール URL

describe("validateModelOutput", () => {
  it("実在 URL の match はそのまま通す（title を補完）", () => {
    const out = validateModelOutput({
      code: "match",
      items: [{ url: REAL_TOOL, reason: "保育料を計算できます" }],
    });
    expect(out.code).toBe("match");
    expect(out.items).toHaveLength(1);
    expect(out.items[0].url).toBe(REAL_TOOL);
    expect(out.items[0].title.length).toBeGreaterThan(0);
    expect(out.items[0].reason).toBe("保育料を計算できます");
  });

  it("実在しない（幻覚）URL は除去し、残らなければ none に落とす", () => {
    const out = validateModelOutput({
      code: "match",
      items: [{ url: "/tools/money/does-not-exist", reason: "x" }, { url: "https://evil.example", reason: "y" }],
    });
    expect(out.items).toHaveLength(0);
    expect(out.code).toBe("none");
  });

  it("reason に URL・HTML が含まれたら空にする", () => {
    const out = validateModelOutput({
      code: "match",
      items: [{ url: REAL_TOOL, reason: "詳しくは https://example.com へ" }],
    });
    expect(out.items[0].reason).toBe("");
  });

  it("note に HTML が含まれたら破棄する", () => {
    const out = validateModelOutput({ code: "none", items: [], note: "<script>alert(1)</script>" });
    expect(out.note).toBeUndefined();
  });

  it("refer はアイテムを持たず code:refer を返す", () => {
    const out = validateModelOutput({ code: "refer", items: [{ url: REAL_TOOL }], note: "専門窓口へ" });
    expect(out.code).toBe("refer");
    expect(out.items).toHaveLength(0);
    expect(out.note).toBe("専門窓口へ");
  });

  it("不明な code は none に正規化", () => {
    expect(validateModelOutput({ code: "anything" }).code).toBe("none");
    expect(validateModelOutput(null).code).toBe("none");
  });

  it("reason は30字・note は80字に切り詰める", () => {
    const out = validateModelOutput({
      code: "match",
      items: [{ url: REAL_TOOL, reason: "あ".repeat(50) }],
      note: "い".repeat(200),
    });
    expect(out.items[0].reason.length).toBe(30);
    expect((out.note ?? "").length).toBe(80);
  });
});
