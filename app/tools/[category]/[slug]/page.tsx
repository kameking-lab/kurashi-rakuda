import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { ToolShell } from "@/components/tools/ToolShell";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { ShussanYoteibi } from "@/components/tools/impl/ShussanYoteibi";

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
  "shussan-yoteibi": {
    ui: <ShussanYoteibi />,
    formula: (
      <>
        <p>
          出産予定日は「最終月経開始日 + 280日（40週0日）」で算出します（ネーゲレ概算法）。平均月経周期が28日と異なる場合は、その差分日数（周期日数−28日）を加減して補正します。
        </p>
        <p>
          妊娠週数は「基準日（今日）− 最終月経開始日」の経過日数を7で割った商を週、余りを日として表示します（例: 経過90日 → 12週6日）。妊娠月数は「1ヶ月＝4週」の慣用区分（1〜10ヶ月、40週以降は月数表示なし）、妊娠期は日本産科婦人科学会の用語定義（初期＝〜13週6日／中期＝14週0日〜27週6日／後期＝28週0日〜）に基づきます。
        </p>
        <p>
          このツールが行うのは最終月経開始日を起点とした日付の加減算のみです。超音波検査や医師の診察に基づく妊娠週数の確定・修正、出産の可否や健康状態に関する判断は一切行いません。実際の週数・予定日は必ず担当医にご確認ください。
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
