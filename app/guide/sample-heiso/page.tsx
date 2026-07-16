import type { Metadata } from "next";
import type { HeisoArticleMeta } from "@/app/lib/articles/types";
import { ArticleShell } from "@/components/articles/ArticleShell";
import { SectionHeading } from "@/components/ui/SectionHeading";

/*
 * ツール併走型テンプレートのサンプルページ（開発検証用）。
 * toolSlug で紐付けたツールへのリンクカードが冒頭に自動表示される。
 */

const meta: HeisoArticleMeta = {
  type: "heiso",
  slug: "sample-heiso",
  title: "【サンプル】ツール併走型テンプレート",
  lead: "ツール併走型の記事は、ツールの結果の読み方と「なぜこの計算になるのか」を説明します。ツール1個につき1本だけ作ります。",
  category: "kaji",
  solves: ["（サンプル）ツール併走型テンプレートの構成を確認したい"],
  sources: [],
  updated: "2026-07-17",
  toolCategory: "kaji",
  toolSlug: "chomiryo-kanzan",
};

export const metadata: Metadata = {
  title: meta.title,
  robots: { index: false },
};

export default function Page() {
  return (
    <ArticleShell meta={meta}>
      <SectionHeading>結果の読み方</SectionHeading>
      <p>
        ツールが出した数字の意味、前提、誤差の幅をここで説明します。計算式そのものはツールページの「根拠・計算式」にあるため、重複させず補完に徹します。
      </p>
      <SectionHeading>よくあるつまずき</SectionHeading>
      <p>
        入力を間違えやすいポイント、結果が想定とずれる典型的な原因を、実際のフィードバックに基づいて追記していきます。
      </p>
    </ArticleShell>
  );
}
