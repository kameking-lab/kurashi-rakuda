import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_NAME } from "@/app/lib/site";
import { Rakku } from "@/components/mascot/Rakku";

export const metadata: Metadata = {
  title: "免責事項",
  description: "くらしのラクダのご利用にあたっての免責事項です。",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="static-page static-disclaimer">
      <header className="static-hero"><div><p className="eyebrow">PLEASE NOTE</p><h1>免責事項</h1><p>
        {SITE_NAME}
        は、掲載する情報と計算結果の正確さのために、一次情報（法令・省庁・自治体・学会など）に基づく確認と毎日の自動照合を行っていますが、ご利用にあたっては次の点をご了承ください。
      </p></div><Rakku pose="worried" size={160} /></header>

      <SectionHeading>計算結果・情報は「目安」です</SectionHeading>
      <ul className="list-inside list-disc space-y-2">
        <li>
          当サイトのツールの計算結果や記事の情報は一般的な目安であり、個別の事情（勤務先の制度、自治体の運用、健康状態など）により実際とは異なる場合があります。
        </li>
        <li>
          給付金・保険料・保育料などの正式な金額は、必ず市区町村・年金事務所・ハローワーク・勤務先などの窓口でご確認ください。
        </li>
        <li>
          医療・健康に関する情報（妊娠週数・予防接種・授乳量など）は制度上・統計上の目安の計算であり、診断や医学的判断ではありません。判断はかかりつけ医などの専門家にご相談ください。
        </li>
      </ul>

      <SectionHeading>制度改定への追随について</SectionHeading>
      <p>
        制度は改定されます。当サイトは各ページに準拠年度・最終更新日を明記し、改定の検知に努めていますが、改定直後など、最新の制度と表示が一致しない期間が生じる可能性があります。
      </p>

      <SectionHeading>損害についての責任</SectionHeading>
      <p>
        当サイトの情報・計算結果の利用によって生じたいかなる損害についても、当サイトは責任を負いかねます。最終的な判断はご自身の確認のもとで行ってください。
      </p>

      <SectionHeading>リンク先について</SectionHeading>
      <p>
        当サイトからリンクする外部サイト（省庁・自治体サイトを含む）の内容について、当サイトは責任を負いません。
      </p>

      <SectionHeading>誤りのご指摘</SectionHeading>
      <p>
        情報の誤りを見つけた場合は
        <Link href="/contact" className="mx-1 underline underline-offset-4">
          お問い合わせ
        </Link>
        からご連絡ください。確認のうえ速やかに訂正します。
      </p>
    </div>
  );
}
