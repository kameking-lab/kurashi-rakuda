import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/app/lib/site";

/**
 * robots.txt。クロール自体は許可し、インデックス可否は各ページの
 * meta robots（app/layout.tsx の noindex。解除は社長決裁＝docs/10）で制御する。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
