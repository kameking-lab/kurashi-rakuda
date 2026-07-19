import type { Metadata } from "next";
import { Rakku } from "@/components/mascot/Rakku";
import { AskConsultForm } from "@/components/ai/AskConsultForm";

/**
 * AI 悩み相談ページ（specs/ai/02 §3・docs/16 §2）。
 * 明示送信のみ・質問文だけを送る。機能 OFF の間は準備中表示に縮退し、noindex にする。
 */
const AI_ON = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

export const metadata: Metadata = {
  title: "AIに相談する",
  description:
    "どんなことに困っているかを書くと、AI がこのサイト内の合うツール・記事を案内します。入力は押した時だけ送信され、個人情報は入力しないでください。",
  alternates: { canonical: "/ask" },
  // 機能 OFF の間は準備中ページのため検索対象にしない
  robots: AI_ON ? undefined : { index: false, follow: true },
};

export default function AskPage() {
  return (
    <div className="static-page mx-auto max-w-3xl">
      <header className="static-hero">
        <div>
          <p className="eyebrow">くらしのラクダ</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">AIに相談する</h1>
          <p className="mt-3 text-ink-muted">
            困りごとを書くと、このサイト内の合うツールや記事をお探しします。金額や制度の結論は各ツールにお任せください。
          </p>
        </div>
        <Rakku pose="guide" size={140} sizes="140px" />
      </header>

      <section className="mt-6">
        <AskConsultForm />
      </section>
    </div>
  );
}
