import Link from "next/link";
import type { ToolMeta } from "@/app/lib/tools/types";
import { getRelatedTools } from "@/app/lib/tools/registry";

/**
 * 「同じ悩みの人が次に使うツール」最大3件。
 * これ以外の回遊装置（ランキング・レコメンド枠）は置かない（docs/04 §3.2）。 brand-lint-allow
 */
export function RelatedTools({ current }: { current: ToolMeta }) {
  const related = getRelatedTools(current);
  if (related.length === 0) return null;
  return (
    <section aria-label="関連ツール" className="related-tools mt-10">
      <p className="eyebrow">NEXT STEP</p><h2 className="mt-1 text-xl font-bold">同じ悩みの人が次に使うツール</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {related.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/tools/${t.category}/${t.slug}`}
              className="related-tool-link"
            >
              <span>{t.title}</span><b aria-hidden="true">↗</b>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
