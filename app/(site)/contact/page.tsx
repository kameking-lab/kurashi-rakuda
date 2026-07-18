import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_EMAIL, SITE_NAME } from "@/app/lib/site";
import { Rakku } from "@/components/mascot/Rakku";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "くらしのラクダへのお問い合わせ方法です。",
};

/**
 * お問い合わせは外部フォームサービス・環境変数を使わないメール方式
 * （登録不要・データを預からない方針と一貫させる）。
 */
export default function ContactPage() {
  return (
    <div className="static-page static-contact">
      <header className="static-hero"><div><p className="eyebrow">CONTACT</p><h1>お問い合わせ</h1><p>
        {SITE_NAME}
        へのご連絡は、メールでお願いします。外部のフォームサービスを使わないのは、入力内容を当サイト以外に預けない方針のためです。
      </p></div><Rakku pose="bow" size={160} /></header>

      <div className="mt-6 rounded-card border border-line bg-sand-soft p-4 sm:p-5">
        <p className="text-sm text-ink-muted">メールアドレス</p>
        <p className="mt-1 font-medium">
          <a href={`mailto:${SITE_EMAIL}`} className="underline underline-offset-4">
            {SITE_EMAIL}
          </a>
        </p>
      </div>

      <SectionHeading>お寄せいただきたい内容</SectionHeading>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>情報・計算の誤りのご指摘</strong>
          ：最も歓迎します。該当ページのURLと、気づいた点をお知らせください。確認のうえ速やかに訂正します。
        </li>
        <li>
          <strong>「こんなツールがほしい」のご要望</strong>
          ：どんな場面で困ったかを添えていただけると、優先して検討できます。
        </li>
        <li>その他、当サイトに関するご意見・ご質問</li>
      </ul>

      <SectionHeading>ご了承いただきたいこと</SectionHeading>
      <ul className="list-inside list-disc space-y-2">
        <li>個人での運営のため、すべてのメールへの返信はお約束できません。誤りのご指摘は返信の有無にかかわらず必ず確認します。</li>
        <li>個別の税務・社会保険・医療のご相談にはお答えできません。それぞれ税務署・年金事務所・市区町村・かかりつけ医などの窓口にご相談ください。</li>
        <li>広告掲載・タイアップ・寄稿のご提案は、編集・紹介ポリシーによりすべてお断りしています。{/* 方針の言及 brand-lint-allow */}</li>
      </ul>
    </div>
  );
}
