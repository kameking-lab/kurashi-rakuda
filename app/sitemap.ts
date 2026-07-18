import type { MetadataRoute } from "next";
import { getLiveTools } from "@/app/lib/tools/registry";
import { getAllArticles } from "@/app/lib/articles/loader";
import { absoluteUrl } from "@/app/lib/site";

/**
 * sitemap.xml（ビルド時静的生成）。live のツールと全記事、固定ページを含める。
 * 開発用サンプル（/guide/sample-*）は含めない。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // トップ・一覧は回遊の起点なので優先度を高めに、更新頻度は実態（ツール追加＝週次）に合わせる。
  // 法的固定ページ（規約・免責等）は優先度低め・更新頻度低め。priority/changeFrequency は
  // クローラへの参考値で、実際のindex可否は各ページの meta robots が制御する。
  const primaryPages: MetadataRoute.Sitemap = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/tools", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/guide", priority: 0.8, changeFrequency: "weekly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));

  const legalPages: MetadataRoute.Sitemap = [
    "/about",
    "/policy",
    "/sources",
    "/privacy",
    "/disclaimer",
    "/contact",
  ].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const toolPages: MetadataRoute.Sitemap = getLiveTools().map((t) => ({
    url: absoluteUrl(`/tools/${t.category}/${t.slug}`),
    lastModified: t.updated,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const articlePages: MetadataRoute.Sitemap = getAllArticles().map((a) => ({
    url: absoluteUrl(`/guide/${a.category}/${a.slug}`),
    lastModified: a.updated,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...primaryPages, ...legalPages, ...toolPages, ...articlePages];
}
