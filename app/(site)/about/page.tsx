import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_NAME, SISTER_SITE } from "@/app/lib/site";
import { Rakku } from "@/components/mascot/Rakku";

export const metadata: Metadata = {
  title: "サイト概要・運営方針",
  description:
    "くらしのラクダのサイト概要と運営方針。完全無料・登録不要・広告に邪魔されないことをお約束します。",
  alternates: { canonical: "/about" },
};

/** サイト概要＋運営方針（ブランド哲学 docs/00 §3 の公開版） */
export default function AboutPage() {
  return (
    <div className="static-page static-about">
      <header className="static-hero"><div><p className="eyebrow">ABOUT US</p><h1>サイト概要・運営方針</h1><p>
        {SITE_NAME}は、妊娠・出産から子育て、家事、お金、仕事、介護まで、女性のライフステージで発生する「調べもの・計算・段取り」を、その場で解決するための完全無料サイトです。
      </p></div><Rakku pose="sit" size={160} /></header>

      <SectionHeading>3つのお約束</SectionHeading>
      <ol className="list-inside list-decimal space-y-3">
        <li>
          <strong>すべて無料・登録不要です。</strong>
          有料プラン・会員限定機能はありません。今後も作りません。入力した内容がサーバーに送信されることもありません（計算はすべてお使いの端末の中で行われます）。
        </li>
        <li>
          <strong>広告に答えを邪魔させません。</strong>
          記事内広告・追従バナー・ポップアップ・「おすすめ○○選」型のランキング記事を置きません。{/* 禁止事項の言及 brand-lint-allow */}商品を紹介するのは、その商品で生活が確実に改善されると判断できた場合だけです（
          <Link href="/policy" className="underline underline-offset-4">
            紹介ポリシー
          </Link>
          ）。
        </li>
        <li>
          <strong>正確さの根拠を必ず示します。</strong>
          計算ロジックと制度情報は法令・省庁・自治体・学会などの一次情報に基づき、各ページに出典・準拠年度・最終更新日を明記します。計算式も平文で公開し、ブラックボックスにしません。
        </li>
      </ol>

      <SectionHeading>判断基準</SectionHeading>
      <p>
        このサイトの運営判断はすべて「ユーザーの生活が楽になるか」の一点で行います。ページビューや収益を目標にした施策（煽りタイトル・離脱防止・成約導線の最適化など）は行いません。
      </p>

      <SectionHeading>正確性への取り組み</SectionHeading>
      <ul className="list-inside list-disc space-y-2">
        <li>
          制度データは改定年度・出典URL・次回チェック日をデータとして管理し、毎日の自動照合で期限切れを検知しています。
        </li>
        <li>
          お金や制度の計算は、根拠を確認できなかった部分では金額を表示せず、窓口への確認をご案内します（推測で数字を出しません）。
        </li>
        <li>
          誤りを見つけた場合は
          <Link href="/contact" className="mx-1 underline underline-offset-4">
            お問い合わせ
          </Link>
          からご指摘ください。確認のうえ速やかに訂正します。
        </li>
      </ul>

      <SectionHeading>運営者</SectionHeading>
      <p>
        個人により運営しています。姉妹サイトとして、汎用の生活計算ツール集「
        <a
          href={SISTER_SITE.url}
          className="underline underline-offset-4"
          rel="noopener noreferrer"
          target="_blank"
        >
          {SISTER_SITE.name}
        </a>
        」を運営しています。ご連絡は
        <Link href="/contact" className="mx-1 underline underline-offset-4">
          お問い合わせ
        </Link>
        ページからお願いします。
      </p>
    </div>
  );
}
