import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ToolCategory, ToolSource } from "@/app/lib/tools/types";
import { isToolCategory, TOOL_CATEGORIES } from "@/app/lib/tools/types";
import { tools } from "@/app/lib/tools/registry";
import type { ArticleType } from "./types";

/**
 * content/articles/ の記事（記事工場出力。JSONフロントマター＋Markdown本文）を
 * ビルド時に読み込む。実行はすべて generateStaticParams / SSG 時のみ。
 */

/** 記事工場の type → 表示テンプレート3型（docs/03 §3）の対応 */
const TYPE_MAP: Record<string, ArticleType> = {
  "seido-kaisetsu": "seido",
  "tool-narisou": "heiso",
  dandori: "dandori",
};

/** 記事工場のカテゴリ（日本語）→ URLカテゴリ */
const CATEGORY_MAP: Record<string, ToolCategory> = Object.fromEntries(
  (Object.entries(TOOL_CATEGORIES) as [ToolCategory, string][]).map(
    ([slug, label]) => [label, slug],
  ),
);

interface FactorySource {
  url: string;
  title: string;
  org: string;
  accessed?: string;
}

/** 記事工場フロントマター（factory/schema/article-frontmatter.schema.json） */
interface FactoryFrontmatter {
  id: string;
  title: string;
  summary: string;
  type: string;
  category: string;
  tool_ref?: string;
  revision_year?: number;
  sources: FactorySource[];
  solves?: string[];
  last_updated: string;
  next_check_due?: string;
}

export interface LoadedArticle {
  slug: string;
  category: ToolCategory;
  type: ArticleType;
  title: string;
  /** 結論の要約（記事冒頭に表示） */
  lead: string;
  /** 併走ツールの registry slug（実在するもののみ） */
  toolSlug?: string;
  basisYear: string | null;
  nextReviewDate: string | null;
  solves: string[];
  sources: ToolSource[];
  updated: string;
  /** Markdown本文（フロントマターを除く） */
  body: string;
}

const ARTICLES_DIR = join(process.cwd(), "content", "articles");

function parseArticle(filename: string): LoadedArticle {
  const raw = readFileSync(join(ARTICLES_DIR, filename), "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`記事のフロントマターを読み取れません: ${filename}`);
  }
  const fm = JSON.parse(match[1]) as FactoryFrontmatter;
  const type = TYPE_MAP[fm.type];
  if (!type) throw new Error(`未知の記事型 "${fm.type}": ${filename}`);
  const category = CATEGORY_MAP[fm.category];
  if (!category) throw new Error(`未知のカテゴリ "${fm.category}": ${filename}`);

  const toolSlug =
    fm.tool_ref && tools.some((t) => t.slug === fm.tool_ref)
      ? fm.tool_ref
      : undefined;

  return {
    slug: fm.id,
    category,
    type,
    title: fm.title,
    lead: fm.summary,
    toolSlug,
    basisYear: fm.revision_year ? `${fm.revision_year}年度` : null,
    nextReviewDate: fm.next_check_due ?? null,
    solves: fm.solves ?? [],
    sources: fm.sources.map((s) => ({
      label: `${s.org}「${s.title}」`,
      url: s.url,
    })),
    updated: fm.last_updated,
    body: match[2],
  };
}

let cache: LoadedArticle[] | null = null;

/** 全記事（ファイル名順）。ビルド時に一度だけ読む */
export function getAllArticles(): LoadedArticle[] {
  if (!cache) {
    cache = readdirSync(ARTICLES_DIR)
      .filter((f) => f.endsWith(".md"))
      .map(parseArticle);
  }
  return cache;
}

export function getArticle(
  category: string,
  slug: string,
): LoadedArticle | undefined {
  if (!isToolCategory(category)) return undefined;
  return getAllArticles().find(
    (a) => a.category === category && a.slug === slug,
  );
}

export function getArticlesByCategory(category: ToolCategory): LoadedArticle[] {
  return getAllArticles().filter((a) => a.category === category);
}
