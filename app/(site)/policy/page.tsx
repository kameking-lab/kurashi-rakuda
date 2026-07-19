import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_NAME } from "@/app/lib/site";
import { Rakku } from "@/components/mascot/Rakku";

export const metadata: Metadata = {
  title: "編集・紹介ポリシー",
  description:
    "くらしのラクダの編集方針と、商品・サービス紹介の掲載基準の全文です。",
  alternates: { canonical: "/policy" },
};

/** docs/06_紹介ポリシー.md の公開版（全文掲載は §4 の必須要件） */
export default function PolicyPage() {
  return (
    <div className="static-page static-policy">
      <header className="static-hero"><div><p className="eyebrow">OUR POLICY</p><h1>編集・紹介ポリシー</h1><p>
        {SITE_NAME}は完全無料のサイトです。商品・サービスを紹介してよいのは、
        <strong>その商品で生活が確実に改善されると判断できた場合のみ</strong>
        で、紹介料の有無は掲載判断に影響させません。「紹介できる商品が見つからない」ことは失敗ではなく通常の状態と考えており、紹介ゼロのページが大多数であることを健全とみなします。
      </p></div><Rakku pose="guide" size={160} /></header>

      <SectionHeading>掲載の4条件（すべて満たさない限り掲載しません）</SectionHeading>
      <ol className="list-inside list-decimal space-y-3">
        <li>
          <strong>家族テスト</strong>
          ：自分の家族に、報酬ゼロでも本気で勧められるか。勧めるときに一瞬でもためらうなら掲載しません。
        </li>
        <li>
          <strong>リンク削除テスト</strong>
          ：紹介リンクをすべて消しても、記事が読み物として完結し、課題が解決するか。リンクがないと成立しない記事は掲載しません。
        </li>
        <li>
          <strong>主目的テスト</strong>
          ：記事の主目的が課題解決であり、商品紹介は解決手段の一つとして従属的に登場するか。「紹介するために書いた記事」は企画段階で却下します。
        </li>
        <li>
          <strong>欠点開示テスト</strong>
          ：その商品の欠点・向かない人・より安い代替手段（無料の代替、自治体サービス、型落ち品など）を本文中に正直に書けるか。欠点が書けないうちは掲載しません。
        </li>
      </ol>

      <SectionHeading>行わないこと</SectionHeading>
      <ul className="list-inside list-disc space-y-2">
        <li>「おすすめ○○選」型のランキング記事（順位をつけません。比較が必要な場合は課題解決記事の中に比較表を置きます）{/* brand-lint-allow */}</li>
        {/* 禁止事項の列挙はポリシー説明のための言及 brand-lint-allow */}
        <li>PR・タイアップ・寄稿による商品紹介の受託（打診をいただいても全件お断りします）{/* brand-lint-allow */}</li>
        <li>成約率を上げるための施策（ボタンの最適化、リンクの複数回設置、離脱防止ポップアップ、「今だけ」「残りわずか」などの限定・緊急の演出）{/* brand-lint-allow */}</li>
        <li>商品名を含む煽りタイトル、体験談の演出・創作</li>
        <li>紹介報酬の高さを理由とした商品選定（掲載可否を決めた後にアフィリエイトプログラムの有無を確認する順序を守ります）</li>
        <li>保険・金融商品の紹介（保険相談への送客を含め全面的に行いません。お金のカテゴリは計算ツールと制度解説のみで完結させます）</li>
      </ul>

      <SectionHeading>紹介リンクを掲載する場合の表記</SectionHeading>
      <p>
        紹介リンクを掲載する場合は、リンクの直前または記事冒頭に「このリンクから購入すると当サイトに紹介料が入ります。紹介料の有無は掲載判断に影響していません」と明示し、リンクには
        rel=&quot;sponsored&quot;
        を付与します。景品表示法およびステルスマーケティング規制（2023年10月施行）に準拠します。
      </p>

      <SectionHeading>掲載後の見直し</SectionHeading>
      <p>
        掲載中の商品は年2回すべて再判定します（値上げ・改悪・より良い代替の登場をチェック）。「合わなかった」という声が届いた場合も都度再判定し、条件を満たさなくなった場合は速やかにリンクを削除します。リンク切れ・販売終了は検知次第削除します。
      </p>

      <SectionHeading>編集方針</SectionHeading>
      <ul className="list-inside list-disc space-y-2">
        <li>制度・お金・健康にかかわる情報は一次情報（法令・省庁・自治体・学会）のみを根拠にし、出典を明記します。</li>
        <li>根拠を確認できなかった数値は掲載せず、窓口への確認をご案内します。</li>
        <li>不安を煽る表現（「知らないと損」など）を使いません。{/* 禁止例の言及 brand-lint-allow */}</li>
        <li>
          出典は
          <Link href="/sources" className="mx-1 underline underline-offset-4">
            出典一覧
          </Link>
          でまとめて確認できます。
        </li>
      </ul>
    </div>
  );
}
