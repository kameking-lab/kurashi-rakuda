import Link from "next/link";
import type { Metadata } from "next";
import { getAllArticles } from "@/app/lib/articles/loader";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">ガイド記事</h1>
      <p className="mt-2 text-ink-muted">
        すべての記事に出典と更新日を明記しています。制度の記事には準拠年度と次回の改定チェック日も表示します。
      </p>
      {categories.map((cat) => (
        <section key={cat} id={cat} aria-label={TOOL_CATEGORIES[cat]}>
          <SectionHeading>{TOOL_CATEGORIES[cat]}</SectionHeading>
          <ul className="space-y-3">
            {articles
              .filter((a) => a.category === cat)
              .map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/guide/${a.category}/${a.slug}`}
                    className="block rounded-card border border-line p-4 hover:border-brand"
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
