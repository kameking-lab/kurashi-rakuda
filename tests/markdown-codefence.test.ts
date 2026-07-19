import { describe, it, expect } from "vitest";
import { parseBlocks } from "@/app/lib/articles/markdown-blocks";

/**
 * 記事レンダラーのコードフェンス対応（診断 A-9 / O-8）。
 * ブロック分解（純関数）を検証する。描画は既存トークンに委ねるため「機能」のみを固定する:
 *   - ``` 〜 ``` が単一の code ブロックになる（生のバッククォートが本文に残らない）
 *   - フェンス内では見出し・箇条書き等の Markdown 記法を解釈しない
 *   - 生の行（インデント）を保持する
 */
describe("parseBlocks: コードフェンス (A-9)", () => {
  it("``` で囲んだ範囲を1つの code ブロックにする", () => {
    const blocks = parseBlocks("段落\n\n```\nconst x = 1;\n```\n\n次の段落");
    const code = blocks.filter((b) => b.kind === "code");
    expect(code).toHaveLength(1);
    expect(code[0]).toMatchObject({ kind: "code", text: "const x = 1;" });
    // 段落は通常どおり残る
    expect(blocks.some((b) => b.kind === "p" && b.text === "段落")).toBe(true);
    expect(blocks.some((b) => b.kind === "p" && b.text === "次の段落")).toBe(true);
  });

  it("フェンス内では見出し・箇条書きを解釈せず原文のまま保持する", () => {
    const blocks = parseBlocks("```\n## 見出しではない\n- 箇条書きではない\n```");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      kind: "code",
      text: "## 見出しではない\n- 箇条書きではない",
    });
    expect(blocks.some((b) => b.kind === "h2")).toBe(false);
    expect(blocks.some((b) => b.kind === "ul")).toBe(false);
  });

  it("フェンス内のインデント（生の行）を保持する", () => {
    const blocks = parseBlocks("```\n  indented\n    more\n```");
    expect(blocks[0]).toMatchObject({ kind: "code", text: "  indented\n    more" });
  });

  it("言語指定つき（```ts）でも中身だけを code ブロックにする", () => {
    const blocks = parseBlocks("```ts\nconst y: number = 2;\n```");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: "code", text: "const y: number = 2;" });
  });

  it("閉じ忘れフェンスでも原文を失わず code ブロックにする", () => {
    const blocks = parseBlocks("```\ncode without close");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: "code", text: "code without close" });
  });

  it("コード前後の通常ブロックは従来どおり分解される", () => {
    const blocks = parseBlocks("## 見出し\n\n本文です\n\n```\ncode\n```");
    expect(blocks[0]).toMatchObject({ kind: "h2", text: "見出し" });
    expect(blocks.some((b) => b.kind === "p" && b.text === "本文です")).toBe(true);
    expect(blocks.some((b) => b.kind === "code")).toBe(true);
  });
});
