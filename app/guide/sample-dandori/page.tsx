import type { Metadata } from "next";
import type { DandoriArticleMeta } from "@/app/lib/articles/types";
import { ArticleShell } from "@/components/articles/ArticleShell";
import { DandoriSteps } from "@/components/articles/DandoriSteps";
import { SectionHeading } from "@/components/ui/SectionHeading";

/*
 * 段取り型テンプレートのサンプルページ（開発検証用）。
 * 「次に何をすればいいか分からない」に、番号つき手順と時期で答える。
 */

const meta: DandoriArticleMeta = {
  type: "dandori",
  slug: "sample-dandori",
  title: "【サンプル】段取り型テンプレート",
  lead: "段取り型の記事は、全体の流れをこの位置で一言に要約します。例:「申請から利用開始まで、やることは4つ・期間は約1ヶ月です」。",
  category: "care",
  solves: ["（サンプル）段取り型テンプレートの構成を確認したい"],
  sources: [],
  updated: "2026-07-17",
};

export const metadata: Metadata = {
  title: meta.title,
  robots: { index: false },
};

export default function Page() {
  return (
    <ArticleShell meta={meta}>
      <SectionHeading>手順</SectionHeading>
      <DandoriSteps
        steps={[
          {
            title: "手順のタイトル",
            when: "目安時期",
            body: "1ステップでやることを1〜3文で。持ち物・窓口・費用など、その場で必要な情報を添えます。",
          },
          {
            title: "次の手順",
            when: "前の手順から◯日後",
            body: "ステップ間の待ち時間や、並行して進められることを明記します。",
          },
          {
            title: "最後の手順",
            body: "完了の状態を具体的に書いて終わります。関連する計算はツールへリンクします。",
          },
        ]}
      />
    </ArticleShell>
  );
}
