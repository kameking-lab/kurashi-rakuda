import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { ToolShell } from "@/components/tools/ToolShell";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { Inunohi } from "@/components/tools/impl/Inunohi";

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
  inunohi: {
    ui: <Inunohi />,
    formula: (
      <>
        <p>
          十二支は暦日に対して連続的に循環割り当てされる伝統的な体系で、「戌の日」は12日に1度巡ってきます（干支＝十干十二支は60日周期ですが、十二支のみを見ると12日周期になります）。実在が確認できる戌の日（2026年1月12日）を基準点にして、そこから対象の日までの日数差を12で割った余りが0のとき「戌の日」と判定しています。
        </p>
        <p>
          妊娠5ヶ月に入る日は、最終月経開始日（出産予定日から入力した場合は出産予定日−280日で逆算）に112日（16週0日）を足して求めます。その日以降で最初に巡ってくる戌の日を「妊娠5ヶ月最初の戌の日」として表示し、そこから12日おきの戌の日もあわせて一覧にしています。
        </p>
        <p>
          年をまたぐ場合やうるう年の2月をまたぐ場合も、日付は暦日数の実加算で計算しているため追加の補正は不要です。
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
