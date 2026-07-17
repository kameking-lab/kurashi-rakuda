import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 広告臭ゼロ＝速さがブランド。画像は当面ローカルのみ、外部ドメインは許可しない
  poweredByHeader: false,
  reactStrictMode: true,
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
