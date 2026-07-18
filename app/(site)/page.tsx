import Link from "next/link";
import { getLiveTools, tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Callout } from "@/components/ui/Callout";
import { SolvesSearch } from "@/components/search/SolvesSearch";
import { Rakku } from "@/components/mascot/Rakku";

/** ライフステージ導線（docs/04 §3.1 の2軸ナビのうちステージ軸。専用ハブは Phase 2） */
const stages: { label: string; category: ToolCategory }[] = [
  { label: "妊活", category: "pregnancy" },
  { label: "妊娠中", category: "pregnancy" },
  { label: "育児", category: "childcare" },
  { label: "復職・仕事", category: "career" },
  { label: "介護", category: "care" },
  { label: "自分の暮らし", category: "kaji" },
];

export default function Home() {
  const live = getLiveTools();
  const planned = tools.length - live.length;

  return (
    <div className="home-v2">
      <section aria-label="サイト紹介" className="hero-grid">
        <div className="relative z-10">
          <p className="eyebrow">登録不要・広告なし・ずっと無料</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.25] tracking-tight sm:text-6xl">
            暮らしの荷物を、<br /><span className="text-brand">ひとつ軽く。</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
          妊娠・子育て・家事・お金・仕事・介護の計算と段取りを、すべて無料・登録不要で。広告に答えを邪魔されません。
          </p>
          <div className="mt-7 max-w-2xl"><SolvesSearch /></div>
        </div>
        <div className="hero-mascot" aria-hidden="true"><Rakku pose="front" size={360} /></div>
      </section>

      <section aria-label="信頼の根拠" className="trust-strip">
        <div><strong>100%</strong><span>全ツール無料</span></div>
        <div><strong>0</strong><span>広告・会員登録</span></div>
        <div><strong>一次情報</strong><span>根拠と出典を明記</span></div>
        <div><strong>機械照合</strong><span>計算結果を継続検査</span></div>
      </section>

      <SectionHeading>ライフステージからさがす</SectionHeading>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stages.map((s) => (
          <li key={s.label}>
            <Link
              href={`/tools#${s.category}`}
              className="stage-card flex min-h-24 items-center justify-center rounded-card border border-line bg-sand-soft p-4 font-bold"
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>

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
      <ul className="grid gap-3 sm:grid-cols-2">
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
