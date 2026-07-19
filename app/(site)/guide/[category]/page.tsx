import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticlesByCategory } from "@/app/lib/articles/loader";
import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, isToolCategory, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CategoryIcon, CategoryVisual } from "@/components/ui/CategoryVisual";
import { JsonLd, breadcrumbList } from "@/components/site/JsonLd";
import { SITE_URL } from "@/app/lib/site";

/*
 * ガイド カテゴリページ（IA-5。specs/ui/tools-directory-ia.md §2「/guide/[category] も同型で新設」）。
 * /tools/[category]/page.tsx と同じテンプレート構成（見出し・一言・SSR全件・関連導線）。
 */

const CATEGORY_UI: Record<ToolCategory, { className: string; copy: string }> = {
  pregnancy: { className: "category-pregnancy", copy: "妊娠週数から出産準備まで" },
  childcare: { className: "category-childcare", copy: "成長と毎日の育児を支える" },
  kaji: { className: "category-kaji", copy: "料理と家事の迷いを短く" },
  money: { className: "category-money", copy: "家計と制度を数字で見通す" },
  health: { className: "category-health", copy: "からだの目安を穏やかに確認" },
  career: { className: "category-career", copy: "働き方と手取りを整理する" },
  care: { className: "category-care", copy: "介護の費用と段取りを支える" },
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
    title: `${label}のガイド記事一覧`,
    description: `${label}に関する制度・お金の疑問に、出典つきの平易な言葉で答えるガイド記事の一覧です。`,
    alternates: { canonical: `/guide/${category}` },
  };
}

export default async function GuideCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isToolCategory(category)) notFound();

  const label = TOOL_CATEGORIES[category];
  const ui = CATEGORY_UI[category];
  const articles = getArticlesByCategory(category)
    .slice()
    .sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
  const categoryTools = tools.filter((t) => t.category === category && t.status === "live").slice(0, 6);
  const otherCategories = CATEGORIES.filter((c) => c !== category);

  return (
    <div className="category-index">
      <JsonLd
        data={breadcrumbList(
          [
            { name: "ホーム", path: "/" },
            { name: "ガイド記事", path: "/guide" },
            { name: label, path: `/guide/${category}` },
          ],
          SITE_URL,
        )}
      />

      <header className="index-hero">
        <div>
          <p className="eyebrow">{articles.length} ARTICLES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{label}のガイド記事一覧</h1>
          <p className="mt-2 text-ink-muted">{ui.copy}。すべての記事に出典と更新日を明記しています。</p>
        </div>
        <span className="index-hero-mascot">
          <CategoryVisual category={category} />
        </span>
      </header>

      <nav aria-label="他のカテゴリ" className="category-nav mt-5">
        <Link href="/guide" className="category-chip">
          全記事一覧
        </Link>
        {otherCategories.map((cat) => (
          <Link key={cat} href={`/guide/${cat}`} className={`category-chip ${CATEGORY_UI[cat].className}`}>
            <CategoryIcon category={cat} />
            {TOOL_CATEGORIES[cat]}
          </Link>
        ))}
      </nav>

      <section className={`category-section ${ui.className}`}>
        <div className="category-section-heading">
          <CategoryVisual category={category} />
          <SectionHeading id="articles">{label}の記事</SectionHeading>
        </div>
        {articles.length === 0 ? (
          <p className="text-sm text-ink-muted">このカテゴリの記事は準備中です。</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/guide/${a.category}/${a.slug}`} className="guide-card block rounded-card border border-line bg-paper p-5">
                  <span className="font-medium">{a.title}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{a.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {categoryTools.length > 0 && (
        <section aria-labelledby="related-tools">
          <SectionHeading id="related-tools">{label}の関連ツール</SectionHeading>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <p className="mt-3">
            <Link href={`/tools/${category}`} className="underline underline-offset-4">
              {label}のツールをすべて見る
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
