/**
 * 記事 Markdown（限定書式）の【ブロック分解】。純関数・JSX非依存（テスト対象）。
 * 描画（React要素化）は markdown.tsx の renderMarkdown が担う。
 * 対応: ## / ### 見出し、段落、- 箇条書き（- [ ] チェックリスト）、1. 番号付き、``` コードフェンス。
 */

export type Block =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "code"; text: string }
  | { kind: "ul"; items: string[]; checklist: boolean }
  | { kind: "ol"; items: string[] };

/** ``` または ~~~（3個以上）で始まるフェンス行か */
export function isFence(trimmed: string): boolean {
  return /^(```+|~~~+)/.test(trimmed);
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  // コードフェンス内の生行を貯める。null のときはフェンス外
  let code: string[] | null = null;
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  for (const line of lines) {
    const t = line.trim();
    // ---- コードフェンス（最優先。中では見出し等の記法を解釈しない） ----
    if (code !== null) {
      if (isFence(t)) {
        // 閉じフェンス。中身が空でも空の <pre> を出す（原文どおり）
        blocks.push({ kind: "code", text: code.join("\n") });
        code = null;
      } else {
        code.push(line); // 生の行（インデントを保持）
      }
      continue;
    }
    if (isFence(t)) {
      // 開きフェンス（言語指定は表示に使わないため読み捨てる）
      flush();
      code = [];
    } else if (t === "") {
      flush();
    } else if (t.startsWith("# ")) {
      // h1 はタイトルとして ArticleShell が表示するため本文では読み飛ばす
      flush();
    } else if (t.startsWith("### ")) {
      flush();
      blocks.push({ kind: "h3", text: t.slice(4) });
    } else if (t.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: t.slice(3) });
    } else if (/^[-*] /.test(t)) {
      flush();
      const item = t.slice(2);
      const checklist = /^\[[ x]\] /.test(item);
      const value = checklist ? item.slice(4) : item;
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === "ul" && prev.checklist === checklist) {
        prev.items.push(value);
      } else {
        blocks.push({ kind: "ul", items: [value], checklist });
      }
    } else if (/^\d+\. /.test(t)) {
      flush();
      const value = t.replace(/^\d+\. /, "");
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === "ol") {
        prev.items.push(value);
      } else {
        blocks.push({ kind: "ol", items: [value] });
      }
    } else {
      paragraph.push(t);
    }
  }
  // 閉じ忘れフェンスは、貯めた分をコードブロックとして描画（原文を失わない）
  if (code !== null) blocks.push({ kind: "code", text: code.join("\n") });
  flush();
  return blocks;
}
