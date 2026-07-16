import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { ToolShell } from "@/components/tools/ToolShell";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { JidoTeate } from "@/components/tools/impl/JidoTeate";
import { JIDO_TEATE_DISCLAIMER } from "@/components/tools/impl/JidoTeate.calc";

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
  "jido-teate": {
    ui: <JidoTeate />,
    formula: (
      <>
        <p>
          支給対象は0歳から、18歳に達する日以後の最初の3月31日まで（いわゆる「高校生年代まで」。実際に高校に在学しているかは問いません）です。2024年10月の制度拡充により所得制限は撤廃されているため、世帯所得による判定は行いません。
        </p>
        <p>
          月額は年齢区分と「第何子か」で決まります。0〜2歳は第1子・第2子が月15,000円、第3子以降は月30,000円。3歳〜高校生年代は第1子・第2子が月10,000円、第3子以降は月30,000円です（いずれも
          こども家庭庁「児童手当制度のご案内」に基づく2026年度時点の値）。
        </p>
        <p>
          「第3子以降」を数える範囲は、実際に手当を受け取れる範囲（18歳年度末まで）より広く設定されています。年齢が上の子から順に数えるとき、22歳に達する日以後の最初の3月31日までの兄姉を数に含めます。つまり大学生年代の兄姉自身は手当を受け取りませんが、下の子を「第3子」に押し上げる効果を持ちます。ただし18歳年度末を超えた兄姉（19〜22歳年度末）を数に含めるには、親などがその子を経済的に養っている（監護相当・生計費の負担をしている）ことが要件になるため、本ツールでは該当する年齢の子についてのみ、その確認を追加で行います。
        </p>
        <p>
          世帯合計月額は各子の月額の合計、年額は月額×12、1回あたりの支給額は月額×2です。支給は偶数月（2・4・6・8・10・12月）の年6回で、各支給月にそれぞれ前月分までの2か月分をまとめて支給します。
        </p>
        <p>
          {JIDO_TEATE_DISCLAIMER}
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
