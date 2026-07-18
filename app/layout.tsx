import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JsonLd } from "@/components/site/JsonLd";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/app/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  // 2026-07-18 公開（社長決裁）: noindex を解除し検索エンジンのインデックスを許可。
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="flex min-h-dvh flex-col">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            alternateName: SITE_TAGLINE,
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            inLanguage: "ja",
          }}
        />
        {children}
        {/* クッキーレス解析（Vercel Analytics / Speed Insights）。GA4・同意バナーは置かない方針（プライバシーポリシー第3条） */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
