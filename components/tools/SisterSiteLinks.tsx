import { getCrossLinks } from "@/app/lib/tools/cross-links";
import { SISTER_SITE } from "@/app/lib/site";

/**
 * 姉妹サイト（くらしの計算）への相互送客リンク（docs/05 §6）。
 * 広告枠に見えないよう、案内する理由（context）を必ず添える。
 * 同一運営者のサイトのため sponsored は付けない（紹介料は発生しない）。
 */
export function SisterSiteLinks({ slug }: { slug: string }) {
  const links = getCrossLinks(slug);
  if (links.length === 0) return null;
  return (
    <section aria-label="姉妹サイトの関連ツール" className="mt-8">
      <h2 className="text-base font-bold">
        姉妹サイト「{SISTER_SITE.name}」の関連ツール
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        汎用のお金計算は、同じ運営者の姉妹サイトにあります（同じく無料・登録不要・広告に邪魔されません）。
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              rel="noopener noreferrer"
              target="_blank"
              className="block rounded-card border border-line p-3 text-sm hover:border-brand"
            >
              <span className="font-medium">{l.label}</span>
              <span className="mt-0.5 block text-ink-muted">{l.context}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
