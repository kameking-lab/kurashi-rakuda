import { tools } from "@/app/lib/tools/registry";
import { TOOL_CATEGORIES, type ToolMeta } from "@/app/lib/tools/types";
import { isHighlighted, isProfileEmpty, sortByAudience, type Profile } from "@/lib/personalize";
import { PERSONALIZATION_KEY, type PersonalizationSettings } from "@/components/personalize/usePersonalization";

export interface SearchHit {
  tool: ToolMeta;
  matchedSolve: string | null;
  highlighted: boolean;
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[ぁ-ゖ]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 0x60))
    .replace(/\s/g, "");
}

function profileSettings(): { profile: Profile | null; relatedOnly: boolean } {
  try {
    const stored = localStorage.getItem(PERSONALIZATION_KEY);
    const settings = stored ? JSON.parse(stored) as Partial<PersonalizationSettings> : null;
    const profile = settings?.profile && !isProfileEmpty(settings.profile) ? settings.profile : null;
    return { profile, relatedOnly: settings?.relatedOnly === true };
  } catch { return { profile: null, relatedOnly: false }; }
}

export function searchSolves(query: string): SearchHit[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const raw = tools.flatMap((tool) => {
    const matchedSolve = tool.solves.find((solve) => normalize(solve).includes(normalized)) ?? null;
    const inTitle = normalize(tool.title).includes(normalized);
    const inDescription = normalize(tool.description).includes(normalized);
    const inCategory = normalize(TOOL_CATEGORIES[tool.category]).includes(normalized);
    if (!matchedSolve && !inTitle && !inDescription && !inCategory) return [];
    return [{ tool, matchedSolve, score: (matchedSolve ? 4 : 0) + (inTitle ? 3 : 0) + (inDescription ? 1 : 0) + 2 }];
  }).sort((a, b) => b.score - a.score);
  const { profile, relatedOnly } = profileSettings();
  const ordered = sortByAudience(raw.map((hit) => hit.tool), profile).map((tool) => raw.find((hit) => hit.tool.slug === tool.slug)!);
  return ordered
    .filter(({ tool }) => !(relatedOnly && profile) || isHighlighted(profile, tool.audience))
    .slice(0, 8)
    .map(({ tool, matchedSolve }) => ({ tool, matchedSolve, highlighted: !!profile && isHighlighted(profile, tool.audience) }));
}
