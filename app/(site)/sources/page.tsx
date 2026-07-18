import type { Metadata } from "next";
import { tools } from "@/app/lib/tools/registry";
import { Rakku } from "@/components/mascot/Rakku";

export const metadata: Metadata = {
  title: "出典一覧",
  robots: { index: false },
};

/** 全ツールの出典を一覧表示（registry から自動生成） */
export default function SourcesPage() {
  const withSources = tools.filter((t) => t.sources.length > 0);
  return (
    <div className="static-page static-sources">
      <header className="static-hero"><div><p className="eyebrow">SOURCES</p><h1>出典一覧</h1><p>
        各ツールが根拠にしている一次情報の一覧です。ツールの追加とともに増えていきます。
      </p></div><Rakku pose="calc" size={160} /></header>
      <ul className="source-directory mt-8 grid gap-4 sm:grid-cols-2">
        {withSources.map((t) => (
          <li key={t.slug} className="rounded-card border border-line bg-paper p-4">
            <h2 className="font-medium">{t.title}</h2>
            <ul className="mt-1 list-inside list-disc text-sm text-ink-muted">
              {t.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    className="underline underline-offset-4 hover:text-ink"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
