"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES } from "@/app/lib/tools/types";
import type { ToolMeta } from "@/app/lib/tools/types";
import { Rakku } from "@/components/mascot/Rakku";

/**
 * 悩み検索 — registry の solves タグ（「◯◯がわからない」）を全文検索する。
 * すべてクライアント内で完結（外部API・送信なし。docs/05 §1）。
 * 本格的な全文検索（Pagefind）は記事が増える Phase 1 後半で導入し、
 * ツール検索はこのコンポーネントを使い続ける。
 */

interface Hit {
  tool: ToolMeta;
  matchedSolve: string | null;
}

function normalize(s: string): string {
  // ひらがな→カタカナ・全角半角ゆれを吸収した素朴な正規化
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/\s/g, "");
}

function search(query: string): Hit[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const hits: { hit: Hit; score: number }[] = [];
  for (const tool of tools) {
    const matchedSolve = tool.solves.find((s) => normalize(s).includes(q)) ?? null;
    const inTitle = normalize(tool.title).includes(q);
    const inDescription = normalize(tool.description).includes(q);
    const inCategory = normalize(TOOL_CATEGORIES[tool.category]).includes(q);
    if (!matchedSolve && !inTitle && !inDescription && !inCategory) continue;
    const score =
      (matchedSolve ? 4 : 0) + (inTitle ? 3 : 0) + (inDescription ? 1 : 0) + (tool.status === "live" ? 2 : 0);
    hits.push({ hit: { tool, matchedSolve }, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((h) => h.hit);
}

export function SolvesSearch() {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => search(query), [query]);
  const active = query.trim().length > 0;

  return (
    <div>
      <label htmlFor="solves-search" className="block font-medium">
        いま、なにに困っていますか？
      </label>
      <input
        id="solves-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例: 離乳食の量 / 保育料 / 時短の給料"
        autoComplete="off"
        className="mt-2 min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base"
      />
      {active && (
        <div className="mt-3" role="status" aria-live="polite">
          {hits.length > 0 ? (
            <ul className="space-y-2">
              {hits.map(({ tool, matchedSolve }) =>
                tool.status === "live" ? (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.category}/${tool.slug}`}
                      className="block rounded-card border border-line p-3 hover:border-brand"
                    >
                      <span className="font-medium">{tool.title}</span>
                      {matchedSolve && (
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          解決できる悩み: {matchedSolve}
                        </span>
                      )}
                    </Link>
                  </li>
                ) : (
                  <li key={tool.slug}>
                    <div className="rounded-card border border-dashed border-line p-3 text-ink-muted">
                      <span className="font-medium">{tool.title}</span>
                      <span className="ml-2 text-sm">準備中</span>
                      {matchedSolve && (
                        <span className="mt-0.5 block text-sm">この悩みに対応予定: {matchedSolve}</span>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <div className="flex items-start gap-3 rounded-card bg-sand-soft p-4">
              <Rakku size={44} expression="sorry" />
              <p className="text-sm sm:text-base">
                ごめんね、「{query}」に合うツールはまだないみたい。
                <Link href="/tools" className="mx-1 underline underline-offset-4">
                  ツール一覧
                </Link>
                ものぞいてみてね。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
