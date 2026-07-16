import type { Metadata, Viewport } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "くらしのラクダ — 主婦・女性の毎日を楽にする無料ツール",
    template: "%s｜くらしのラクダ",
  },
  description:
    "妊娠・出産から子育て、家事、お金、仕事、介護まで。女性の毎日の「調べもの・計算・段取り」を、広告に邪魔されず登録なしで解決する完全無料サイトです。",
  // 独自ドメイン接続・公開判定（Q5-4）までインデックスさせない。公開時にこの行を削除する
  robots: { index: false, follow: false },
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
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
