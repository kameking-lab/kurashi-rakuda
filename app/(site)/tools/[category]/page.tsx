import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { tools } from "@/app/lib/tools/registry";
import { getArticlesByCategory } from "@/app/lib/articles/loader";
import { TOOL_CATEGORIES, isToolCategory, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CategoryIcon, CategoryVisual } from "@/components/ui/CategoryVisual";
import { JsonLd, breadcrumbList } from "@/components/site/JsonLd";
import { SITE_URL } from "@/app/lib/site";

/*
 * カテゴリページ（IA-4。specs/ui/tools-directory-ia.md §2）。
 * /tools 一覧のアンカー（#category）を「着地する人」（検索流入・共有・パンくず遡行）向けに
 * URL として独立させたもの。既存の /tools#category アンカー導線は非破壊で残る（追加のみ）。
 * SSR で全件描画（JS無効でも全ツール・全関連記事に到達できる）。
 */

const CATEGORY_UI: Record<ToolCategory, { icon: string; className: string; copy: string }> = {
  pregnancy: { icon: "○", className: "category-pregnancy", copy: "妊娠週数から出産準備まで" },
  childcare: { icon: "◇", className: "category-childcare", copy: "成長と毎日の育児を支える" },
  kaji: { icon: "⌂", className: "category-kaji", copy: "料理と家事の迷いを短く" },
  money: { icon: "¥", className: "category-money", copy: "家計と制度を数字で見通す" },
  health: { icon: "+", className: "category-health", copy: "からだの目安を穏やかに確認" },
  career: { icon: "□", className: "category-career", copy: "働き方と手取りを整理する" },
  care: { icon: "∞", className: "category-care", copy: "介護の費用と段取りを支える" },
};

const CATEGORIES = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isToolCategory(category)) return {};
  const label = TOOL_CATEGORIES[category];
  return {
    title: `${label}の無料ツール一覧`,
    description: `${label}に関する無料計算ツールの一覧です。すべて無料・登録不要・広告なしで使えます。${CATEGORY_UI[category].copy}。`,
    alternates: { canonical: `/tools/${category}` },
  };
}

export default async function ToolCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isToolCategory(category)) notFound();

  const label = TOOL_CATEGORIES[category];
  const ui = CATEGORY_UI[category];
  const categoryTools = tools.filter((t) => t.category === category);
  const relatedArticles = getArticlesByCategory(category)
    .slice()
    .sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0))
    .slice(0, 6);
  const otherCategories = CATEGORIES.filter((c) => c !== category);

  return (
    <div className="category-index">
      <JsonLd
        data={breadcrumbList(
          [
            { name: "ホーム", path: "/" },
            { name: "ツール一覧", path: "/tools" },
            { name: label, path: `/tools/${category}` },
          ],
          SITE_URL,
        )}
      />

      <header className="index-hero">
        <div>
          <p className="eyebrow">{categoryTools.length} TOOLS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
            {label}の無料ツール一覧
          </h1>
          <p className="mt-2 text-ink-muted">{ui.copy}。すべて無料・登録不要・広告なしで使えます。</p>
        </div>
        <span className="index-hero-mascot">
          <CategoryVisual category={category} />
        </span>
      </header>

      <nav aria-label="他のカテゴリ" className="category-nav mt-5">
        <Link href="/tools" className="category-chip">
          全ツール一覧
        </Link>
        {otherCategories.map((cat) => (
          <Link key={cat} href={`/tools/${cat}`} className={`category-chip ${CATEGORY_UI[cat].className}`}>
            <CategoryIcon category={cat} />
            {TOOL_CATEGORIES[cat]}
          </Link>
        ))}
      </nav>

      <section className={`category-section ${ui.className}`}>
        <div className="category-section-heading">
          <CategoryVisual category={category} />
          <SectionHeading id="tools">{label}のツール</SectionHeading>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {categoryTools.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={`/tools/${tool.category}/${tool.slug}`}
                className="tool-card block h-full rounded-card border border-line bg-paper p-5"
              >
                <span className="font-medium">{tool.title}</span>
                <span className="mt-1 block text-sm text-ink-muted">{tool.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {relatedArticles.length > 0 && (
        <section aria-labelledby="related-guide">
          <SectionHeading id="related-guide">{label}の関連ガイド記事</SectionHeading>
          <ul className="mt-3 space-y-3">
            {relatedArticles.map((a) => (
              <li key={a.slug}>
                <Link href={`/guide/${a.category}/${a.slug}`} className="guide-card block rounded-card border border-line bg-paper p-5">
                  <span className="font-medium">{a.title}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{a.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
