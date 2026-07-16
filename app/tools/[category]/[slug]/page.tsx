import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { ToolShell } from "@/components/tools/ToolShell";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { Getsurei } from "@/components/tools/impl/Getsurei";

/**
 * ツール実装のマッピング。G2（Q3-01〜20）で実装が増えるたびにここへ1行追加し、
 * registry.json の status を "live" に変える。
 */
const implementations: Record<string, { ui: ReactNode; formula: ReactNode }> = {
  "chomiryo-kanzan": {
    ui: <ChomiryoKanzan />,
    formula: (
      <>
        <p>大さじ1杯は15ml、小さじ1杯は5mlです（計量スプーンの規格）。</p>
        <p>
          グラムへの換算は「その調味料の大さじ1杯あたりのグラム数（例:
          しょうゆ18g、砂糖9g）」を使い、ml × (大さじ1のg ÷ 15)
          で計算しています。調味料ごとに比重が違うため、同じ大さじ1でもグラムは変わります。
        </p>
        <p>
          値は一般的な調理用計量表に基づく参考値です。製品や計り方（すりきり）で多少前後します。
        </p>
      </>
    ),
  },
  getsurei: {
    ui: <Getsurei />,
    formula: (
      <>
        <p>
          生後日数は「基準日−生年月日」の単純な暦日差、生後週数はそれを7で割った商とあまりです。
        </p>
        <p>
          月齢（◯か月）は「生まれた日と同じ日（応当日）を迎えるたびに1か月」と数える暦月ベースの方式です。応当日が存在しない月（例:
          1/31生まれの2月）はその月の末日を応当日とみなします（月末クランプ）。うるう年の2/29生まれは、非うるう年では2/28を応当日として扱います。
        </p>
        <p>
          出産予定日を入力すると、生年月日の代わりに出産予定日を起点にして同じ数え方を適用した「修正月齢」を計算します。基準日が予定日にまだ達していない場合は「予定日まであと◯日」と表示します。修正月齢は早産で生まれたお子さまの発達を考える際の目安の一つで、実際の発達評価は乳幼児健診等で医療者にご確認ください。
        </p>
        <p>
          この計算はグレゴリオ暦の一般的な暦法規則（うるう年判定・大の月/小の月）のみに基づき、制度改定の概念はありません。
        </p>
      </>
    ),
  },
};

export function generateStaticParams() {
  return getLiveTools().map((t) => ({ category: t.category, slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const tool = getTool(category, slug);
  if (!tool) return {};
  return { title: tool.title, description: tool.description };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const tool = getTool(category, slug);
  const impl = tool && implementations[tool.slug];
  if (!tool || tool.status !== "live" || !impl) notFound();

  return (
    <ToolShell meta={tool} formula={impl.formula}>
      {impl.ui}
    </ToolShell>
  );
}
