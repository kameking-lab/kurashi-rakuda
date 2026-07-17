import type { MetadataRoute } from "next";
import { getLiveTools } from "@/app/lib/tools/registry";
import { getAllArticles } from "@/app/lib/articles/loader";
import { absoluteUrl } from "@/app/lib/site";

/**
 * sitemap.xml（ビルド時静的生成）。live のツールと全記事、固定ページを含める。
 * 開発用サンプル（/guide/sample-*）は含めない。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    "/",
    "/tools",
    "/guide",
    "/about",
    "/policy",
    "/sources",
    "/privacy",
    "/disclaimer",
    "/contact",
  ].map((path) => ({ url: absoluteUrl(path) }));

  const toolPages: MetadataRoute.Sitemap = getLiveTools().map((t) => ({
    url: absoluteUrl(`/tools/${t.category}/${t.slug}`),
    lastModified: t.updated,
  }));

  const articlePages: MetadataRoute.Sitemap = getAllArticles().map((a) => ({
    url: absoluteUrl(`/guide/${a.category}/${a.slug}`),
    lastModified: a.updated,
  }));

  return [...staticPages, ...toolPages, ...articlePages];
}
