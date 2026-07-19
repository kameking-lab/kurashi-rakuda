import type { ReactNode } from "react";
import { Fragment } from "react";
import { parseBlocks } from "./markdown-blocks";

/**
 * 記事工場の Markdown 本文（限定書式）を React 要素に変換する小さなレンダラー。
 * 対応書式: ## / ### 見出し、段落、- 箇条書き（- [ ] チェックリスト含む）、
 * 1. 番号付きリスト、**強調**、[リンク](URL)、``` コードフェンス。
 * 外部ライブラリ・dangerouslySetInnerHTML を使わない（依存最小の方針。docs/05）。
 */

/** インライン書式（**強調**・[リンク](URL)）の変換 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const external = href.startsWith("http");
      nodes.push(
        <a
          key={`${keyPrefix}-a${i}`}
          href={href}
          className="underline underline-offset-4 hover:text-ink"
          {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
        >
          {m[2]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMarkdown(markdown: string): ReactNode {
  const blocks = parseBlocks(markdown);
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h2":
            return (
              <h2 key={i} className="mt-8 border-b border-line pb-1 text-lg font-bold">
                {renderInline(b.text, `h2-${i}`)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-5 font-bold">
                {renderInline(b.text, `h3-${i}`)}
              </h3>
            );
          case "ul":
            return (
              <ul
                key={i}
                className={
                  b.checklist
                    ? "space-y-2"
                    : "list-inside list-disc space-y-2"
                }
              >
                {b.items.map((item, j) => (
                  <li key={j} className={b.checklist ? "flex gap-2" : undefined}>
                    {b.checklist && (
                      <span aria-hidden="true" className="select-none text-brand">
                        ☐
                      </span>
                    )}
                    <span>{renderInline(item, `li-${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-inside list-decimal space-y-2">
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `oli-${i}-${j}`)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={i}
                className="mt-4 overflow-x-auto rounded-card border border-line bg-sand-soft p-4 text-sm"
              >
                <code className="font-mono">{b.text}</code>
              </pre>
            );
          case "p":
            return <p key={i}>{renderInline(b.text, `p-${i}`)}</p>;
          default:
            return <Fragment key={i} />;
        }
      })}
    </>
  );
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * 「## よくある疑問」セクションの `- **質問?** 回答` 形式を FAQPage JSON-LD 用に抽出。
 * 形式に合わない記事は空配列（JSON-LDを出さない）。
 */
export function extractFaq(markdown: string): FaqEntry[] {
  const blocks = parseBlocks(markdown);
  const faq: FaqEntry[] = [];
  let inFaq = false;
  for (const b of blocks) {
    if (b.kind === "h2") {
      inFaq = b.text.includes("よくある疑問") || b.text.includes("よくある質問");
      continue;
    }
    if (inFaq && b.kind === "ul") {
      for (const item of b.items) {
        const m = item.match(/^\*\*(.+?)\*\*\s*(.+)$/);
        if (m) {
          faq.push({
            question: m[1].trim(),
            answer: m[2].replace(/\*\*/g, "").trim(),
          });
        }
      }
    }
  }
  return faq;
}
