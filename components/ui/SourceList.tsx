import type { ToolSource } from "@/app/lib/tools/types";

/**
 * 出典3点セット（最終更新日・準拠年度・出典）。全ツール・記事で必須表示
 * （docs/03 §4.2）。E-E-A-T の中核部品。
 */
export function SourceList({
  sources,
  basisYear,
  updated,
}: {
  sources: ToolSource[];
  basisYear: string | null;
  updated: string;
}) {
  return (
    <section aria-label="出典と更新情報" className="mt-8 border-t border-line pt-4 text-sm text-ink-muted">
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex gap-2">
          <dt>最終更新</dt>
          <dd>{updated}</dd>
        </div>
        {basisYear && (
          <div className="flex gap-2">
            <dt>準拠年度</dt>
            <dd>{basisYear}</dd>
          </div>
        )}
      </dl>
      {sources.length > 0 && (
        <ul className="mt-2 list-inside list-disc">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                className="underline decoration-line underline-offset-4 hover:text-ink"
                rel="noopener noreferrer"
                target="_blank"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
