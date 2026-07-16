import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "編集・紹介ポリシー",
  robots: { index: false },
};

/** Q4-6 で docs/06_紹介ポリシー.md の全文を掲載する固定ページのスタブ */
export default function PolicyPage() {
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">編集・紹介ポリシー</h1>
      <p className="mt-4">
        くらしのラクダは完全無料のサイトです。商品・サービスを紹介するのは「その商品で生活が確実に改善される場合」だけで、紹介料の有無は掲載判断に影響させません。
      </p>
      <p className="mt-2 text-ink-muted">
        ポリシー全文は公開までにこのページに掲載します。
      </p>
    </div>
  );
}
