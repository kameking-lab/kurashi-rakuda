import type { ReactNode } from "react";
import type { ToolMeta } from "@/app/lib/tools/types";
import { SourceList } from "@/components/ui/SourceList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RelatedTools } from "./RelatedTools";
import { SisterSiteLinks } from "./SisterSiteLinks";
import { Rakku } from "@/components/mascot/Rakku";
import { ProfilePrefill } from "@/components/personalize/ProfilePrefill";

/**
 * ツールページ共通シェル（docs/08 P1-04）。
 * 構成: タイトル → 入力・即時計算・結果（children、ファーストビュー内）
 *      → 根拠・計算式 → 出典3点セット → 関連ツール
 * 入力フォームより上に長文・画像を置かない（UI十原則1）。
 */
export function ToolShell({
  meta,
  formula,
  children,
}: {
  meta: ToolMeta;
  /** 「根拠・計算式」セクションの中身。計算をブラックボックスにしない（docs/03 §4.1） */
  formula: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-4xl">
      <header className="tool-hero">
        <div>
          <p className="eyebrow">くらしの無料ツール</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
          <p className="mt-3 max-w-2xl text-ink-muted">{meta.description}</p>
        </div>
        <Rakku pose="calc" size={108} />
      </header>

      <div className="tool-workspace mt-6"><ProfilePrefill slug={meta.slug} />{children}</div>

      <SectionHeading id="formula">根拠・計算式</SectionHeading>
      <div className="space-y-3 text-sm sm:text-base">{formula}</div>

      <SourceList
        sources={meta.sources}
        basisYear={meta.basisYear}
        updated={meta.updated}
      />

      <RelatedTools current={meta} />

      <SisterSiteLinks slug={meta.slug} />
    </article>
  );
}
