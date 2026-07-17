import { ogImage, OG_SIZE } from "@/app/lib/og";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, isToolCategory } from "@/app/lib/tools/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ツールの紹介画像";

export function generateStaticParams() {
  return getLiveTools().map((t) => ({ category: t.category, slug: t.slug }));
}

/** ツールごとの動的OGP画像（ビルド時生成） */
export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const tool = getTool(category, slug);
  const categoryLabel = isToolCategory(category)
    ? TOOL_CATEGORIES[category]
    : "";
  return ogImage({
    title: tool?.title ?? "くらしのラクダ",
    subtitle: tool
      ? `${categoryLabel}の無料ツール${tool.basisYear ? `｜${tool.basisYear}準拠` : ""}`
      : undefined,
  });
}
