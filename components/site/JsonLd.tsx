/**
 * JSON-LD（構造化データ）出力。値はすべてビルド時に自サイトのデータから生成する。
 * script タグへの埋め込みは JSON.stringify の結果のみ（外部入力なし）。
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function breadcrumbList(
  items: { name: string; path: string }[],
  siteUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

/** 運営者（発行元）。JSON-LD の publisher / author に使う共通ノード */
function publisher(
  siteName: string,
  siteUrl: string,
): Record<string, unknown> {
  return {
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/mascot/front.png`,
    },
  };
}

/**
 * ツールの構造化データ（WebApplication）。値はすべて registry のデータから生成する。
 * すべて無料・登録不要・ブラウザ完結という事実をそのまま price:0 / operatingSystem で表す。
 */
export function webApplication(args: {
  name: string;
  description: string;
  path: string;
  siteName: string;
  siteUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: args.name,
    description: args.description,
    url: `${args.siteUrl}${args.path}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript.",
    inLanguage: "ja",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
    },
    publisher: publisher(args.siteName, args.siteUrl),
  };
}

/**
 * 記事の構造化データ（Article）。datePublished / dateModified は
 * 記事の最終確認日（updated）を単一ソースとして使う（別の公開日を持たないため）。
 */
export function article(args: {
  title: string;
  description: string;
  path: string;
  updated: string;
  siteName: string;
  siteUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.title,
    description: args.description,
    inLanguage: "ja",
    datePublished: args.updated,
    dateModified: args.updated,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${args.siteUrl}${args.path}`,
    },
    author: publisher(args.siteName, args.siteUrl),
    publisher: publisher(args.siteName, args.siteUrl),
  };
}
