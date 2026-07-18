import Link from "next/link";
import type { Metadata } from "next";
import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolCategory } from "@/app/lib/tools/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "ツール一覧",
  description:
    "妊娠・出産から子育て、家事、お金、仕事、介護まで。すべて無料・登録不要で使える計算ツールの一覧です。",
};

export default function ToolsPage() {
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">ツール一覧</h1>
      <p className="mt-2 text-ink-muted">
        すべて無料・登録不要。準備中のツールも順次公開します。
      </p>
      {categories.map((cat) => {
        const list = tools.filter((t) => t.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <SectionHeading id={cat}>{TOOL_CATEGORIES[cat]}</SectionHeading>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((t) =>
                t.status === "live" ? (
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
                ) : (
                  <li key={t.slug}>
                    <div className="h-full rounded-card border border-dashed border-line p-4 text-ink-muted">
                      <span className="font-medium">{t.title}</span>
                      <span className="mt-1 block text-sm">準備中</span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
