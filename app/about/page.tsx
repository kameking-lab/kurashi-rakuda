import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営者情報",
  robots: { index: false },
};

/** Q4-6 で本文を整備する固定ページのスタブ */
export default function AboutPage() {
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">運営者情報</h1>
      <p className="mt-4 text-ink-muted">
        このページは準備中です。公開までに運営者・運営方針・連絡先を記載します。
      </p>
    </div>
  );
}
