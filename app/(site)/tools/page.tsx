import type { Metadata } from "next";
import Link from "next/link";
import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { Rakku } from "@/components/mascot/Rakku";
import { DeferredProfileSettings, DeferredToolDirectoryControls } from "@/components/personalize/DeferredPersonalization";
import { SectionHeading } from "@/components/ui/SectionHeading";

const CATEGORY_UI: Record<ToolCategory, { icon: string; className: string; copy: string }> = {
 pregnancy:{icon:"○",className:"category-pregnancy",copy:"妊娠週数から出産準備まで"}, childcare:{icon:"◇",className:"category-childcare",copy:"成長と毎日の育児を支える"},
 kaji:{icon:"⌂",className:"category-kaji",copy:"料理と家事の迷いを短く"}, money:{icon:"¥",className:"category-money",copy:"家計と制度を数字で見通す"},
 health:{icon:"+",className:"category-health",copy:"からだの目安を穏やかに確認"}, career:{icon:"□",className:"category-career",copy:"働き方と手取りを整理する"},
 care:{icon:"∞",className:"category-care",copy:"介護の費用と段取りを支える"},
};

export const metadata: Metadata = {
  title: "ツール一覧",
  description:
    "妊娠・出産から子育て、家事、お金、仕事、介護まで。すべて無料・登録不要で使える計算ツールの一覧です。",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];
  return (
    <div className="category-index">
      <header className="index-hero"><div><p className="eyebrow">48+ FREE TOOLS</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">暮らしの答えを、すぐ手元に。</h1>
      <p className="mt-2 text-ink-muted">
        すべて無料・登録不要。準備中のツールも順次公開します。
      </p></div><span className="index-hero-mascot"><Rakku pose="calc" size={180} sizes="180px" /></span></header>
      <nav aria-label="ツールカテゴリ" className="category-nav mt-5">{categories.map((cat)=><a key={cat} href={`#${cat}`} className={`category-chip ${CATEGORY_UI[cat].className}`}><span aria-hidden="true">{CATEGORY_UI[cat].icon}</span>{TOOL_CATEGORIES[cat]}</a>)}</nav>
      <div className="mt-5"><DeferredProfileSettings /></div>
      <DeferredToolDirectoryControls />
      {categories.map((cat) => {
        const list = tools.filter((tool) => tool.category === cat);
        return <section key={cat} data-tool-category={cat} className={`category-section ${CATEGORY_UI[cat].className}`}>
          <SectionHeading id={cat}><span aria-hidden="true" className="mr-2">{CATEGORY_UI[cat].icon}</span>{TOOL_CATEGORIES[cat]}<span className="ml-3 text-sm font-normal text-ink-muted">{CATEGORY_UI[cat].copy}</span></SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((tool) => <li key={tool.slug} data-tool-slug={tool.slug}>
              <Link href={`/tools/${tool.category}/${tool.slug}`} className="tool-card block h-full rounded-card border border-line bg-paper p-5">
                <span className="font-medium">{tool.title}</span><span className="mt-1 block text-sm text-ink-muted">{tool.description}</span>
              </Link>
            </li>)}
          </ul>
        </section>;
      })}
    </div>
  );
}
