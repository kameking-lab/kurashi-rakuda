/**
 * AI プロンプトのコンテキスト（サイト内の既存ツール・記事の軽量インデックス）と、
 * 応答 URL の実在検証に使う許可 URL 集合を生成する（specs/ai/02 §2）。
 * ★サーバー専用★（レジストリ・記事ローダーを参照）。全文は渡さず title/solves のみ。
 */
import { getLiveTools } from "@/app/lib/tools/registry";
import { getAllArticles } from "@/app/lib/articles/loader";

export interface ContextEntry {
  url: string;
  title: string;
  /** ツールは solves、記事は空配列 */
  solves: string[];
}

let cache: { entries: ContextEntry[]; allowedUrls: Set<string> } | null = null;

/** サイト内の提案候補（ツール＋公開記事）。プロセス内でキャッシュ（ビルド済みデータ由来で不変） */
export function siteContext(): { entries: ContextEntry[]; allowedUrls: Set<string> } {
  if (cache) return cache;
  const entries: ContextEntry[] = [];

  for (const t of getLiveTools()) {
    entries.push({
      url: `/tools/${t.category}/${t.slug}`,
      title: t.title,
      solves: Array.isArray(t.solves) ? t.solves.slice(0, 4) : [],
    });
  }
  for (const a of getAllArticles()) {
    entries.push({ url: `/guide/${a.category}/${a.slug}`, title: a.title, solves: [] });
  }

  const allowedUrls = new Set(entries.map((e) => e.url));
  cache = { entries, allowedUrls };
  return cache;
}

/** プロンプトに載せる軽量 JSON テキスト（url/title/solves のみ） */
export function contextForPrompt(): string {
  const { entries } = siteContext();
  return JSON.stringify(
    entries.map((e) => (e.solves.length ? { url: e.url, title: e.title, solves: e.solves } : { url: e.url, title: e.title })),
  );
}

/** url が実在するサイト内 URL か（幻覚 URL の遮断） */
export function isKnownUrl(url: string): boolean {
  return siteContext().allowedUrls.has(url);
}

export function titleForUrl(url: string): string | null {
  return siteContext().entries.find((e) => e.url === url)?.title ?? null;
}
