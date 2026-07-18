"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rakku } from "@/components/mascot/Rakku";
import type { SearchHit } from "./searchSolves";

/**
 * 悩み検索 — registry の solves タグ（「◯◯がわからない」）を全文検索する。
 * すべてクライアント内で完結（外部API・送信なし。docs/05 §1）。
 * 本格的な全文検索（Pagefind）は記事が増える Phase 1 後半で導入し、
 * ツール検索はこのコンポーネントを使い続ける。
 */

export function SolvesSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    let current = true;
    void import("./searchSolves").then(({ searchSolves }) => { if (current) setHits(searchSolves(query)); });
    return () => { current = false; };
  }, [query]);
  const active = query.trim().length > 0;

  return (
    <div className="search-v2">
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
        className="field-control mt-2 min-h-14 w-full rounded-card border border-line bg-paper px-5 text-base shadow-sm"
      />
      {active && (
        <div className="mt-3" role="status" aria-live="polite">
          {hits.length > 0 ? (
            <ul className="search-results grid gap-2 sm:grid-cols-2">
              {hits.map(({ tool, matchedSolve, highlighted }) =>
                tool.status === "live" ? (
                  <li key={tool.slug}>
                    <Link
                      prefetch={false}
                      href={`/tools/${tool.category}/${tool.slug}`}
                      className={`tool-card block h-full rounded-card border bg-paper p-4 ${highlighted ? "is-personalized" : "border-line"}`}
                    >
                      {highlighted && <span className="personalized-label">あなた向け</span>}
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
