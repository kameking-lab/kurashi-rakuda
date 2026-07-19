/**
 * ツール検索の純ロジック（specs/ai/01-fuzzy-search-client.md §3）。
 * クライアント完結・外部送信ゼロ・DOM 非依存の純関数（AI 不使用の1段目）。
 * パーソナライズ（プロフィール強調・並べ替え）は呼び出し側（components/search）が重ねる。
 */
import { normalizeText } from "./normalize";
import synonymData from "@/data/tables/search-synonyms.json";

/** 検索対象の最小形（registry の ToolMeta 互換の部分集合） */
export interface SearchableTool {
  slug: string;
  category: string;
  title: string;
  description: string;
  solves: string[];
  status?: string;
}

export interface ToolSearchHit<T extends SearchableTool = SearchableTool> {
  tool: T;
  /** 一致した solve（表示用）。solve 以外での一致は null */
  matchedSolve: string | null;
  score: number;
}

/** フィールド重み（title > solves > description）。specs/ai/01 §3 */
const FIELD_WEIGHT = { title: 3, solves: 2, description: 1 } as const;
/** 一致品質の段階（完全一致 > 前方一致 > 部分一致）。品質段がフィールド重みより支配的になるよう ×4 する */
const TIER = { exact: 3, prefix: 2, partial: 1, none: 0 } as const;

/**
 * 「ヒットが弱い」の閾値（specs/ai/01 §3・docs/16 §1）。
 * 最高スコアがこの値以下、または 0 件なら「弱い」＝2段目「AIに聞く」ボタンの表示条件。
 * = 部分一致1件分（品質段 partial=1 × 4 ＋ 最強フィールド title=3 ＝ 7）。前方一致以上（≥ 9）なら弱くない。
 * ★AI-3 実装時もこの定数を参照する（閾値の一元管理）★
 */
export const WEAK_HIT_THRESHOLD = TIER.partial * 4 + FIELD_WEIGHT.title;

interface SynonymEntry {
  canonical: string;
  synonyms: string[];
}
const SYNONYM_ENTRIES = (synonymData as { entries: SynonymEntry[] }).entries;

/** クエリを正規化し、同義語辞書で当たる canonical 語を追加した検索語の配列にする */
export function expandQueryTerms(query: string): string[] {
  const q = normalizeText(query);
  if (!q) return [];
  const terms = new Set<string>([q]);
  for (const entry of SYNONYM_ENTRIES) {
    const hit = entry.synonyms.some((s) => {
      const ns = normalizeText(s);
      return ns.length > 0 && (ns.includes(q) || q.includes(ns));
    });
    if (hit) {
      const canonical = normalizeText(entry.canonical);
      if (canonical) terms.add(canonical);
    }
  }
  return [...terms];
}

/** 被検索テキストと検索語群の一致品質段（最良）。0 は不一致 */
function bestTier(haystack: string, terms: string[]): 0 | 1 | 2 | 3 {
  const hay = normalizeText(haystack);
  if (!hay) return 0;
  let best: 0 | 1 | 2 | 3 = 0;
  for (const term of terms) {
    if (!term) continue;
    let t: 0 | 1 | 2 | 3 = 0;
    if (hay === term) t = TIER.exact;
    else if (hay.startsWith(term)) t = TIER.prefix;
    else if (hay.includes(term)) t = TIER.partial;
    if (t > best) best = t;
  }
  return best;
}

const hitScore = (tier: number, weight: number): number => (tier > 0 ? tier * 4 + weight : 0);

/**
 * クエリでツール群を検索し、スコア降順で返す（純関数）。
 * カテゴリ名も部分一致の対象にする（既存挙動の踏襲）が、スコアは description 相当の弱い加点に留める。
 */
export function searchTools<T extends SearchableTool>(
  query: string,
  tools: T[],
  categoryLabel?: (category: string) => string,
): ToolSearchHit<T>[] {
  const terms = expandQueryTerms(query);
  if (terms.length === 0) return [];

  const hits: ToolSearchHit<T>[] = [];
  for (const tool of tools) {
    const titleTier = bestTier(tool.title, terms);
    const descTier = bestTier(tool.description, terms);
    const catTier = categoryLabel ? bestTier(categoryLabel(tool.category), terms) : 0;

    let solveTier: 0 | 1 | 2 | 3 = 0;
    let matchedSolve: string | null = null;
    for (const solve of tool.solves) {
      const t = bestTier(solve, terms);
      if (t > solveTier) {
        solveTier = t;
        matchedSolve = solve;
      }
    }

    const score = Math.max(
      hitScore(titleTier, FIELD_WEIGHT.title),
      hitScore(solveTier, FIELD_WEIGHT.solves),
      hitScore(descTier, FIELD_WEIGHT.description),
      hitScore(catTier, FIELD_WEIGHT.description),
    );
    if (score <= 0) continue;
    hits.push({ tool, matchedSolve: solveTier > 0 ? matchedSolve : null, score });
  }

  return hits.sort((a, b) => b.score - a.score || a.tool.category.localeCompare(b.tool.category));
}

/** 1段目のヒットが弱いか（2段目「AIに聞く」ボタンの表示条件）。docs/16 §1 */
export function isWeakResult(hits: { score: number }[]): boolean {
  if (hits.length === 0) return true;
  return hits[0].score <= WEAK_HIT_THRESHOLD;
}
