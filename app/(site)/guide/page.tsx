import Link from "next/link";
import type { Metadata } from "next";
import { getAllArticles } from "@/app/lib/articles/loader";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Rakku } from "@/components/mascot/Rakku";

const CATEGORY_UI: Record<ToolCategory, { icon: string; className: string }> = {
  pregnancy: { icon: "○", className: "category-pregnancy" }, childcare: { icon: "◇", className: "category-childcare" },
  kaji: { icon: "⌂", className: "category-kaji" }, money: { icon: "¥", className: "category-money" },
  health: { icon: "+", className: "category-health" }, career: { icon: "□", className: "category-career" },
  care: { icon: "∞", className: "category-care" },
};

export const metadata: Metadata = {
  title: "ガイド記事",
  description:
    "制度やお金の疑問に、出典つきの平易な言葉で答えるガイド記事の一覧です。",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  const articles = getAllArticles();
  const categories = (Object.keys(TOOL_CATEGORIES) as ToolCategory[]).filter(
    (cat) => articles.some((a) => a.category === cat),
  );

  return (
    <div className="category-index">
      <header className="index-hero">
        <div><p className="eyebrow">暮らしのガイド</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">迷ったときの、確かな道しるべ。</h1>
      <p className="mt-2 text-ink-muted">
        すべての記事に出典と更新日を明記しています。制度の記事には準拠年度と次回の改定チェック日も表示します。
        </p></div><Rakku pose="guide" size={180} />
      </header>
      <nav aria-label="ガイドカテゴリ" className="category-nav mt-5">
        {categories.map((cat) => <Link key={cat} href={`#${cat}`} className={`category-chip ${CATEGORY_UI[cat].className}`}><span aria-hidden="true">{CATEGORY_UI[cat].icon}</span>{TOOL_CATEGORIES[cat]}</Link>)}
      </nav>
      {categories.map((cat) => (
        <section key={cat} id={cat} aria-label={TOOL_CATEGORIES[cat]} className={`category-section ${CATEGORY_UI[cat].className}`}>
          <SectionHeading>{TOOL_CATEGORIES[cat]}</SectionHeading>
          <ul className="space-y-3">
            {articles
              .filter((a) => a.category === cat)
              .map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/guide/${a.category}/${a.slug}`}
                    className="guide-card block rounded-card border border-line bg-paper p-5"
                  >
                    <span className="font-medium">{a.title}</span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      {a.lead}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
