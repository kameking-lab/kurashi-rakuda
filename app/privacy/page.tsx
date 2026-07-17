import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_NAME } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "くらしのラクダの個人情報・データの取り扱いについての方針です。",
};

const UPDATED = "2026-07-17";

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">プライバシーポリシー</h1>
      <p className="mt-4">
        {SITE_NAME}
        （以下「当サイト」）は、利用者の個人情報・データを次の方針で取り扱います。
      </p>

      <SectionHeading>1. 会員登録・個人情報の収集について</SectionHeading>
      <p>
        当サイトに会員登録の仕組みはありません。氏名・住所・電話番号などの個人情報を入力させる機能はありません。
      </p>

      <SectionHeading>2. ツールに入力した内容について</SectionHeading>
      <p>
        計算ツールに入力した内容（収入・家族構成・生年月日など）は、すべてお使いの端末（ブラウザ）の中だけで計算され、
        <strong>当サイトのサーバーに送信・保存されることはありません</strong>
        。入力内容を保存する機能は、お使いのブラウザのローカルストレージ（端末内の保存領域）のみを使用し、ブラウザの設定からいつでも削除できます。
      </p>

      <SectionHeading>3. アクセス解析について</SectionHeading>
      <p>
        当サイトは、サイトの改善のためにアクセス解析ツール（Vercel Analytics /
        Vercel Speed
        Insights）を利用しています。この解析はクッキー（Cookie）を使用せず、端末をまたいで個人を追跡する仕組みもありません。収集されるのは、閲覧されたページ・おおまかな地域・ブラウザの種類・表示速度といった匿名の統計情報のみで、個人を特定するものではありません。クッキーを使用しないため、同意バナーは表示していません。Google
        Analyticsなどクッキーを利用する解析ツールは使用していません。
      </p>

      <SectionHeading>4. 広告について</SectionHeading>
      <p>
        当サイトはディスプレイ広告（コンテンツ内広告・追従広告・ポップアップ広告）を掲載していません。商品・サービスの紹介リンクを掲載する場合の基準と表記は
        <Link href="/policy" className="mx-1 underline underline-offset-4">
          編集・紹介ポリシー
        </Link>
        に定めています。
      </p>

      <SectionHeading>5. お問い合わせで受け取った情報について</SectionHeading>
      <p>
        お問い合わせのメールで受け取ったメールアドレス・内容は、回答と当サイトの改善のためだけに使用し、第三者に提供しません。
      </p>

      <SectionHeading>6. 改定について</SectionHeading>
      <p>
        本ポリシーを変更する場合は、このページで公表します。最終更新日: {UPDATED}
      </p>
    </div>
  );
}
