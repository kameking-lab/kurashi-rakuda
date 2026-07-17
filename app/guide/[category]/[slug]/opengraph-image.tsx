import { ogImage, OG_SIZE } from "@/app/lib/og";
import { getAllArticles, getArticle } from "@/app/lib/articles/loader";
import { TOOL_CATEGORIES, isToolCategory } from "@/app/lib/tools/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "記事の紹介画像";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ category: a.category, slug: a.slug }));
}

/** 記事ごとの動的OGP画像（ビルド時生成） */
export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = getArticle(category, slug);
  const categoryLabel = isToolCategory(category)
    ? TOOL_CATEGORIES[category]
    : "";
  return ogImage({
    title: article?.title ?? "くらしのラクダ",
    subtitle: article
      ? `${categoryLabel}のガイド記事${article.basisYear ? `｜${article.basisYear}準拠` : ""}`
      : undefined,
  });
}
