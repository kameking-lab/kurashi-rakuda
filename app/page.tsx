import Link from "next/link";
import { getLiveTools, tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Callout } from "@/components/ui/Callout";

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
    <div>
      <section aria-label="サイト紹介">
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">
          毎日の「調べもの」を、
          <br className="sm:hidden" />
          その場で解決。
        </h1>
        <p className="mt-3 text-ink-muted">
          妊娠・子育て・家事・お金・仕事・介護の計算と段取りを、すべて無料・登録不要で。広告に答えを邪魔されません。
        </p>
      </section>

      <SectionHeading>ライフステージからさがす</SectionHeading>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stages.map((s) => (
          <li key={s.label}>
            <Link
              href={`/tools#${s.category}`}
              className="flex min-h-16 items-center justify-center rounded-card border border-line bg-sand-soft p-3 font-medium hover:border-brand"
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
              className="inline-flex min-h-12 items-center rounded-card border border-line px-4 text-sm hover:border-brand"
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
              className="block h-full rounded-card border border-line p-4 hover:border-brand"
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
