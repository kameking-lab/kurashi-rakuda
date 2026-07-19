import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_NAME } from "@/app/lib/site";
import { Rakku } from "@/components/mascot/Rakku";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "くらしのラクダの個人情報・データの取り扱いについての方針です。",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-07-20";

export default function PrivacyPage() {
  return (
    <div className="static-page static-privacy">
      <header className="static-hero"><div><p className="eyebrow">PRIVACY</p><h1>プライバシーポリシー</h1><p>
        {SITE_NAME}
        （以下「当サイト」）は、利用者の個人情報・データを次の方針で取り扱います。
      </p></div><Rakku pose="sleep" size={160} /></header>

      <SectionHeading>1. 会員登録・個人情報の収集について</SectionHeading>
      <p>
        当サイトに会員登録の仕組みはありません。氏名・住所・電話番号などの個人情報を入力させる機能はありません。
      </p>

      <SectionHeading>2. ツールに入力した内容について（従来どおり）</SectionHeading>
      <p>
        各種計算ツール・記事・パーソナライズ設定は、すべてお使いの端末（ブラウザ）の中だけで動作します。入力した内容（収入・家族構成・生年月日など）が
        <strong>当サイトのサーバーや外部に送信されることはありません</strong>
        。入力内容を保存する機能は、お使いのブラウザのローカルストレージ（端末内の保存領域）のみを使用し、ブラウザの設定からいつでも削除できます。
      </p>

      <SectionHeading>3. AI機能について（送信ボタンを押した場合のみ）</SectionHeading>
      <p>
        「AIに聞く」「AIに相談する」は、<strong>送信ボタンを押した時に限り</strong>
        、入力されたテキストを当サイトのサーバーを経由して Google の生成
        AI（Gemini API）に送信し、応答を生成します。送信された質問文は、個人を特定する情報と結び付けない形（質問文・種別・日付のみ）で保存し、サイトの機能改善（「まだ用意できていない道具」の把握）に利用します。パーソナライズ設定（プロフィール）は送信しません。氏名・住所・電話番号などの個人情報は入力しないでください。
        <strong>AI 機能を使わない限り、外部への送信は一切発生しません。</strong>
      </p>

      <SectionHeading>4. アクセス解析について</SectionHeading>
      <p>
        当サイトは、サイトの改善のためにアクセス解析ツール（Vercel Analytics /
        Vercel Speed
        Insights）を利用しています。この解析はクッキー（Cookie）を使用せず、端末をまたいで個人を追跡する仕組みもありません。収集されるのは、閲覧されたページ・おおまかな地域・ブラウザの種類・表示速度といった匿名の統計情報のみで、個人を特定するものではありません。クッキーを使用しないため、同意バナーは表示していません。Google
        Analyticsなどクッキーを利用する解析ツールは使用していません。
      </p>

      <SectionHeading>5. 広告について</SectionHeading>
      <p>
        当サイトはディスプレイ広告（コンテンツ内広告・追従広告・ポップアップ広告）を掲載していません。商品・サービスの紹介リンクを掲載する場合の基準と表記は
        <Link href="/policy" className="mx-1 underline underline-offset-4">
          編集・紹介ポリシー
        </Link>
        に定めています。
      </p>

      <SectionHeading>6. お問い合わせで受け取った情報について</SectionHeading>
      <p>
        お問い合わせのメールで受け取ったメールアドレス・内容は、回答と当サイトの改善のためだけに使用し、第三者に提供しません。
      </p>

      <SectionHeading>7. 改定について</SectionHeading>
      <p>
        本ポリシーを変更する場合は、このページで公表します。最終更新日: {UPDATED}
      </p>
    </div>
  );
}
