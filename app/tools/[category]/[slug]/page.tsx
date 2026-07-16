import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { ToolShell } from "@/components/tools/ToolShell";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { SeiriShuki } from "@/components/tools/impl/SeiriShuki";

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
  "seiri-shuki": {
    ui: <SeiriShuki />,
    formula: (
      <>
        <p>
          次回の月経開始予定日は「最終月経開始日 ＋ 平均月経周期日数」で計算します。暦日数をそのまま加算するため、月末・年またぎ・うるう年もそのまま自動的に処理されます。
        </p>
        <p>
          排卵予測日は、黄体期（排卵から次回月経開始までの期間）が個人差の小さい約14日でほぼ一定であるという一般的な知見に基づき、「次回の月経開始予定日 − 14日」で逆算する簡易予測です。妊娠しやすい期間の目安は、精子の生存期間（3〜5日程度）と排卵後の卵子の生存期間（約24時間）を考慮し、排卵予測日の5日前〜1日後としています。
        </p>
        <p>
          このツールが行うのは入力された周期日数に基づく単純な日付演算のみで、実際の排卵・妊娠の有無を検査・診断するものではありません。黄体期の長さには個人差（一般に10〜16日程度）があり、周期が不規則な場合はこの予測のずれが大きくなります。基礎体温の記録や排卵日検査薬の利用、婦人科への相談で確認することをおすすめします。避妊の目的でこの予測のみに頼ることはお控えください。
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
