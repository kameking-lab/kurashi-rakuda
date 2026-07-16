import type { Metadata } from "next";
import { tools } from "@/app/lib/tools/registry";

export const metadata: Metadata = {
  title: "出典一覧",
  robots: { index: false },
};

/** 全ツールの出典を一覧表示（registry から自動生成） */
export default function SourcesPage() {
  const withSources = tools.filter((t) => t.sources.length > 0);
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">出典一覧</h1>
      <p className="mt-2 text-ink-muted">
        各ツールが根拠にしている一次情報の一覧です。ツールの追加とともに増えていきます。
      </p>
      <ul className="mt-6 space-y-4">
        {withSources.map((t) => (
          <li key={t.slug}>
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
