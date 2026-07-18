import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getLiveTools, tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Callout } from "@/components/ui/Callout";
import { SolvesSearch } from "@/components/search/SolvesSearch";
import { DeferredHomePersonalization, DeferredProfileSettings } from "@/components/personalize/DeferredPersonalization";

/** ライフステージ導線（docs/04 §3.1 の2軸ナビのうちステージ軸。専用ハブは Phase 2） */
const stages: { label: string; category: ToolCategory }[] = [
  { label: "妊活", category: "pregnancy" },
  { label: "妊娠中", category: "pregnancy" },
  { label: "育児", category: "childcare" },
  { label: "復職・仕事", category: "career" },
  { label: "介護", category: "care" },
  { label: "自分の暮らし", category: "kaji" },
];

// トップは title テンプレートの %s を付けず、ルートの既定タイトル（サイト名＋タグライン）を使う。
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const live = getLiveTools();
  const planned = tools.length - live.length;

  return (
    <div className="home-v2">
      <section aria-label="サイト紹介" className="hero-grid hero-concept-a">
        <div className="relative z-10">
          <p className="eyebrow">暮らしの判断を、やさしく確かに</p>
          <h1 className="hero-title mt-4 font-bold leading-[1.18] tracking-tight">
            暮らしの荷物を、<br /><span className="text-brand">ひとつ軽く。</span>
          </h1>
          <div className="hero-copy mt-6 max-w-xl text-ink-muted">
            <p>妊娠・子育て・家事・お金・仕事・介護の計算と段取りを、一次情報と機械検査で確かな形に。</p>
          </div>
          <div className="mt-7 max-w-2xl"><SolvesSearch /></div>
        </div>
        <div className="hero-mascot" aria-hidden="true"><Image src="/brand/hero-rakku.png" width={1024} height={1024} alt="" priority sizes="(max-width: 767px) 140px, 440px" /></div>
        <p className="hero-signature" aria-hidden="true">FREE / NO ADS / EVIDENCE FIRST</p>
      </section>

      <section aria-label="信頼の根拠" className="trust-strip">
        <div><strong>64</strong><span>公開中の無料ツール</span></div>
        <div><strong>437</strong><span>解決できる暮らしの悩み</span></div>
        <div><strong>0</strong><span>広告・会員登録・外部送信</span></div>
        <div><strong>一次情報</strong><span>出典・更新日・計算式を公開</span></div>
      </section>

      <div className="mt-6"><DeferredProfileSettings /></div>
      <section aria-labelledby="for-you-title" className="for-you-section mt-8 rounded-[1.5rem] border border-line bg-brand-soft p-5 sm:p-7">
        <p className="eyebrow" data-home-personalized-eyebrow>まず使ってほしいツール</p>
        <h2 id="for-you-title" data-home-personalized-heading className="mt-1 text-2xl font-bold">よく使われるツール</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">{live.slice(0, 6).map((tool) => <li key={tool.slug}>
          <Link data-home-personalized prefetch={false} href={`/tools/${tool.category}/${tool.slug}`} className="personalized-card block h-full rounded-card border border-line bg-paper p-4">
            <strong data-home-title className="block">{tool.title}</strong><span data-home-description className="mt-1 block text-sm text-ink-muted">{tool.description}</span>
          </Link>
        </li>)}</ul>
        <DeferredHomePersonalization />
      </section>

      <section className="stage-feature"><div className="section-intro"><p className="eyebrow">LIFE STAGE</p><SectionHeading>今の暮らしから、まっすぐ探す</SectionHeading><p>制度の名前が分からなくても大丈夫。今のあなたに近い入り口から案内します。</p></div>
      <ul className="stage-editorial-grid">
        {stages.map((s) => (
          <li key={s.label}>
            <Link
              href={`/tools#${s.category}`}
              className="stage-card editorial-stage-card"
            >
              <span>{s.label}</span><small>関連ツールへ <b aria-hidden="true">↗</b></small>
            </Link>
          </li>
        ))}
      </ul></section>

      <SectionHeading>カテゴリからさがす</SectionHeading>
      <ul className="flex flex-wrap gap-2">
        {(Object.keys(TOOL_CATEGORIES) as ToolCategory[]).map((cat) => (
          <li key={cat}>
            <Link
              href={`/tools#${cat}`}
              className="chip-link inline-flex min-h-12 items-center rounded-full border border-line px-5 text-sm font-medium"
            >
              {TOOL_CATEGORIES[cat]}
            </Link>
          </li>
        ))}
      </ul>

      <SectionHeading>いま使えるツール</SectionHeading>
      <ul className="deferred-tool-grid grid gap-3 sm:grid-cols-2">
        {live.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/tools/${t.category}/${t.slug}`}
              className="tool-card block h-full rounded-card border border-line bg-paper p-5"
            >
              <span className="font-medium">{t.title}</span>
              <span className="mt-1 block text-sm text-ink-muted">
                {t.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Callout>
          いま {planned} 本のツールを準備中です。公開状況は
          <Link href="/tools" className="mx-1 underline underline-offset-4">
            ツール一覧
          </Link>
          で見られます。
        </Callout>
      </div>
    </div>
  );
}
