import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SeidoArticleMeta } from "@/app/lib/articles/types";
import { ArticleShell } from "@/components/articles/ArticleShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Callout } from "@/components/ui/Callout";

/*
 * 制度解説型テンプレートのサンプルページ（開発検証用）。
 * 実記事は記事工場（Q4）から生成され、この構成に流し込まれる。
 */

const meta: SeidoArticleMeta = {
  type: "seido",
  slug: "sample-seido",
  title: "【サンプル】制度解説型テンプレート",
  lead: "制度解説型の記事は、結論（金額・期限・条件）をこの位置に最初に書きます。読者はここだけ読めば要点が分かります。",
  category: "money",
  solves: ["（サンプル）制度解説型テンプレートの構成を確認したい"],
  sources: [
    {
      label: "出典のサンプル（実記事では省庁・法令の一次情報のみを置く）",
      url: "https://example.com/",
    },
  ],
  updated: "2026-07-17",
  audience: { universal: true, lifeStages: [], lifeEvents: [], childAgeBands: [], gender: null },
  basisYear: "2026年度",
  nextReviewDate: "2027-04-01",
};

export const metadata: Metadata = {
  title: meta.title,
  robots: { index: false },
};

export default function Page() {
  // テンプレート確認用のサンプルページ。開発環境でのみ閲覧可能で、本番ビルドからは除外する（docs/13 A-13/N-5）。
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ArticleShell meta={meta}>
      <SectionHeading>見出しは「読者の疑問」の形にする</SectionHeading>
      <p>
        本文は中学生でも読める平易文で書きます。専門用語には最初に登場した箇所で言い換えを添えます。金額・日数・条件の数値は、CI
        の忠実性ゲートが出典と機械照合します。
      </p>
      <Callout>
        補足や例外は、ラクダのひとことで添えます。本文の流れを止めないための部品です。
      </Callout>
      <SectionHeading>次に読む・使う</SectionHeading>
      <p>
        記事の最後は、関連ツールへの導線1つで終わります。読み続けさせるための「あわせて読みたい」の羅列はしません。
      </p>
    </ArticleShell>
  );
}
