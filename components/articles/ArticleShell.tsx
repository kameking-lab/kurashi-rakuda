import type { ReactNode } from "react";
import Link from "next/link";
import type { ArticleMeta } from "@/app/lib/articles/types";
import { getTool } from "@/app/lib/tools/registry";
import { SourceList } from "@/components/ui/SourceList";
import { Callout } from "@/components/ui/Callout";

/**
 * 記事共通シェル。構成: タイトル → 結論（lead、最初の段落） → 本文 → 出典。
 * 「読ませて滞在させる」装飾（続きを読むボタン・無限スクロール等）は持たない。
 */
export function ArticleShell({
  meta,
  children,
}: {
  meta: ArticleMeta;
  children: ReactNode;
}) {
  const basisYear = meta.type === "seido" ? meta.basisYear : null;
  const linkedTool =
    meta.type === "heiso" ? getTool(meta.toolCategory, meta.toolSlug) : undefined;

  return (
    <article>
      <h1 className="text-xl font-bold sm:text-2xl">{meta.title}</h1>

      {/* 結論を最初に（UI十原則1） */}
      <div className="mt-4 rounded-card bg-brand-soft p-4 sm:p-5">
        <p className="text-sm font-bold text-brand">結論</p>
        <p className="mt-1">{meta.lead}</p>
      </div>

      {meta.type === "seido" && (
        <p className="mt-3 text-sm text-ink-muted">
          この記事は{meta.basisYear}の制度に基づいています（次回の改定チェック:{" "}
          {meta.nextReviewDate}）。
        </p>
      )}

      {linkedTool && linkedTool.status === "live" && (
        <div className="mt-4">
          <Callout>
            この記事とセットで使うツール:{" "}
            <Link
              href={`/tools/${linkedTool.category}/${linkedTool.slug}`}
              className="font-medium underline underline-offset-4"
            >
              {linkedTool.title}
            </Link>
          </Callout>
        </div>
      )}

      <div className="prose-kurashi mt-6 space-y-4">{children}</div>

      <SourceList
        sources={meta.sources}
        basisYear={basisYear}
        updated={meta.updated}
      />
    </article>
  );
}
