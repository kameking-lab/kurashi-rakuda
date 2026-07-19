import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllArticles, getArticle } from "@/app/lib/articles/loader";
import type { ArticleMeta } from "@/app/lib/articles/types";
import { renderMarkdown, extractFaq } from "@/app/lib/articles/markdown";
import { ArticleShell } from "@/components/articles/ArticleShell";
import {
  JsonLd,
  breadcrumbList,
  article as articleLd,
} from "@/components/site/JsonLd";
import { TOOL_CATEGORIES } from "@/app/lib/tools/types";
import { tools } from "@/app/lib/tools/registry";
import { SITE_NAME, SITE_URL } from "@/app/lib/site";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ category: a.category, slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getArticle(category, slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.lead,
    alternates: { canonical: `/guide/${article.category}/${article.slug}` },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = getArticle(category, slug);
  if (!article) notFound();

  const linkedTool = article.toolSlug
    ? tools.find((t) => t.slug === article.toolSlug)
    : undefined;

  // ArticleShell の判別可能ユニオンに合わせてメタを組み立てる
  const base = {
    slug: article.slug,
    title: article.title,
    lead: article.lead,
    category: article.category,
    solves: article.solves,
    sources: article.sources,
    updated: article.updated,
    audience: article.audience,
  };
  const meta: ArticleMeta =
    article.type === "seido"
      ? {
          ...base,
          type: "seido",
          basisYear: article.basisYear ?? "",
          nextReviewDate: article.nextReviewDate ?? "",
        }
      : article.type === "heiso" && linkedTool
        ? {
            ...base,
            type: "heiso",
            toolCategory: linkedTool.category,
            toolSlug: linkedTool.slug,
          }
        : { ...base, type: "dandori" };

  const faq = extractFaq(article.body);

  return (
    <>
      <JsonLd
        data={breadcrumbList(
          [
            { name: "ホーム", path: "/" },
            { name: "ガイド記事", path: "/guide" },
            {
              name: TOOL_CATEGORIES[article.category],
              path: `/guide/${article.category}`,
            },
            {
              name: article.title,
              path: `/guide/${article.category}/${article.slug}`,
            },
          ],
          SITE_URL,
        )}
      />
      <JsonLd
        data={articleLd({
          title: article.title,
          description: article.lead,
          path: `/guide/${article.category}/${article.slug}`,
          updated: article.updated,
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
        })}
      />
      {faq.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }}
        />
      )}
      <ArticleShell meta={meta}>{renderMarkdown(article.body)}</ArticleShell>
    </>
  );
}
