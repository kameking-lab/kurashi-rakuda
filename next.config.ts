import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 広告臭ゼロ＝速さがブランド。画像は当面ローカルのみ、外部ドメインは許可しない
  poweredByHeader: false,
  reactStrictMode: true,
  // セキュリティヘッダ（診断 B-5）。認証・Cookie なしの静的サイトのため実害は限定的だが、
  // クリックジャッキング・MIME スニッフィング・不要な強力機能を低コストで塞ぐ。
  // HSTS は Vercel 既定で付与されるため重複させない。CSP は Next のインライン script/style と
  // nonce 設計が必要なため本PRでは見送り（診断 O-6: 設計込みで別判断）。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // フレーム埋め込み禁止（クリックジャッキング防止）。当サイトは iframe 埋め込みを想定しない
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Content-Type の推測を禁止
          { key: "X-Content-Type-Options", value: "nosniff" },
          // リファラは同一オリジンには送るが、クロスオリジンにはオリジンのみ（現行ブラウザ既定を明示）
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 使っていない強力機能を明示的に無効化（カメラ・マイク・位置情報など）
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
  // BACKLOG Q4-8: 新旧重複記事の統廃合に伴う301リダイレクト（統合先へ誘導）
  async redirects() {
    return [
      {
        source: "/guide/money/seido-fuyou-no-kabe-2026",
        destination: "/guide/money/seido-fuyou-no-kabe-103-106-130-2026",
        permanent: true,
      },
      {
        source: "/guide/career/seido-ikuji-kyugyou-kyufu",
        destination: "/guide/pregnancy/seido-ikuji-kyugyou-kyufu-taisho-kikan-2026",
        permanent: true,
      },
      {
        source: "/guide/childcare/seido-jidou-teate-2026",
        destination: "/guide/childcare/seido-jidou-teate-shotoku-seigen-teppai",
        permanent: true,
      },
      {
        source: "/guide/care/seido-kaigo-hoken-jikofutan",
        destination: "/guide/care/seido-kaigo-hoken-futan-wariai-shotoku",
        permanent: true,
      },
      {
        source: "/guide/pregnancy/seido-sanzensango-hoken-menjo",
        destination: "/guide/pregnancy/seido-sanzensango-hoken-menjo-kikan-2026",
        permanent: true,
      },
      {
        source: "/guide/childcare/seido-youji-kyouiku-mushouka",
        destination: "/guide/childcare/seido-youji-mushouka-taisho-nenrei",
        permanent: true,
      },
      {
        source: "/guide/pregnancy/seido-shussan-teate-ichijikin",
        destination: "/guide/pregnancy/seido-shussan-teate-kingaku-2026",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
