import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 広告臭ゼロ＝速さがブランド。画像は当面ローカルのみ、外部ドメインは許可しない
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
