import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolMeta } from "@/app/lib/tools/types";
import { isHighlighted, isProfileEmpty, sortByAudience, type Profile } from "@/lib/personalize";
import { PERSONALIZATION_KEY, type PersonalizationSettings } from "@/components/personalize/usePersonalization";
import { searchTools, isWeakResult } from "@/lib/search/searchTools";

export interface SearchHit {
  tool: ToolMeta;
  matchedSolve: string | null;
  highlighted: boolean;
}

const catLabel = (c: string) => TOOL_CATEGORIES[c as keyof typeof TOOL_CATEGORIES] ?? c;

function profileSettings(): { profile: Profile | null; relatedOnly: boolean } {
  try {
    const stored = localStorage.getItem(PERSONALIZATION_KEY);
    const settings = stored ? (JSON.parse(stored) as Partial<PersonalizationSettings>) : null;
    const profile = settings?.profile && !isProfileEmpty(settings.profile) ? settings.profile : null;
    return { profile, relatedOnly: settings?.relatedOnly === true };
  } catch {
    return { profile: null, relatedOnly: false };
  }
}

/**
 * 悩み検索の結果（AI-1 の純ロジック lib/search/searchTools に、端末内パーソナライズを重ねる）。
 * かな・話し言葉・同義語を吸収した1段目の検索。外部送信ゼロ。
 */
export function searchSolves(query: string): SearchHit[] {
  const hits = searchTools(query, tools as ToolMeta[], catLabel);
  if (hits.length === 0) return [];
  const bySlug = new Map(hits.map((h) => [h.tool.slug, h]));
  const { profile, relatedOnly } = profileSettings();
  // スコア順を崩さない範囲で、プロフィール一致を安定ソートで前寄せする
  const ordered = sortByAudience(
    hits.map((h) => h.tool),
    profile,
  );
  return ordered
    .filter((tool) => !(relatedOnly && profile) || isHighlighted(profile, tool.audience))
    .slice(0, 8)
    .map((tool) => ({
      tool,
      matchedSolve: bySlug.get(tool.slug)?.matchedSolve ?? null,
      highlighted: !!profile && isHighlighted(profile, tool.audience),
    }));
}

/**
 * 1段目のヒットが弱いか（2段目「AIに聞く」ボタンの表示条件。docs/16 §1 / specs/ai/01 §3）。
 * ★AI-3（検索補助ボタン）実装時にこの判定を参照する★
 */
export function isSearchResultWeak(query: string): boolean {
  return isWeakResult(searchTools(query, tools as ToolMeta[], catLabel));
}
