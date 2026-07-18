import type { ReactNode } from "react";
import Link from "next/link";
import type { ArticleMeta } from "@/app/lib/articles/types";
import { getTool } from "@/app/lib/tools/registry";
import { SourceList } from "@/components/ui/SourceList";
import { Callout } from "@/components/ui/Callout";
import { Rakku } from "@/components/mascot/Rakku";
import { ArticleToc } from "@/components/articles/ArticleToc";

const TYPE_LABEL = { seido: "制度をやさしく整理", heiso: "ツールと一緒に確認", dandori: "順番どおりに進める" } as const;
const TYPE_POSE = { seido: "guide", heiso: "calc", dandori: "carry" } as const;

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
    <article className={`article-shell article-${meta.type}`}>
      <header className="article-hero">
        <div>
          <p className="eyebrow">{TYPE_LABEL[meta.type]}</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-4xl">{meta.title}</h1>
          <p className="mt-3 text-sm text-ink-muted">最終更新 {meta.updated}</p>
        </div>
        <Rakku pose={TYPE_POSE[meta.type]} size={128} />
      </header>

      {/* 結論を最初に（UI十原則1） */}
      <div className="article-lead mt-5 rounded-card bg-brand-soft p-5 sm:p-6">
        <p className="eyebrow">先に結論</p>
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

      <ArticleToc contentId="article-content" />
      <div className="article-reading-frame"><div id="article-content" className="prose-kurashi mx-auto mt-9 max-w-[70ch] space-y-5">{children}</div></div>

      <SourceList
        sources={meta.sources}
        basisYear={basisYear}
        updated={meta.updated}
      />
    </article>
  );
}
