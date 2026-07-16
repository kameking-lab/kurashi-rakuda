import registryJson from "./registry.json";
import type { ToolMeta, ToolCategory } from "./types";

/** 全ツール（MVP20本＋今後の追加分）。データ本体は registry.json */
export const tools = registryJson as ToolMeta[];

export function getTool(category: string, slug: string): ToolMeta | undefined {
  return tools.find((t) => t.category === category && t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): ToolMeta[] {
  return tools.filter((t) => t.category === category);
}

export function getLiveTools(): ToolMeta[] {
  return tools.filter((t) => t.status === "live");
}

/**
 * 関連ツール: solves の悩みタグが重なるもの→同カテゴリの順で最大 limit 件。
 * 「同じ悩みの人が次に使うツール」以外の回遊装置は置かない（docs/04 §3.2）。
 */
export function getRelatedTools(current: ToolMeta, limit = 3): ToolMeta[] {
  const candidates = tools.filter(
    (t) => t.slug !== current.slug && t.status === "live",
  );
  const scored = candidates
    .map((t) => {
      const shared = t.solves.filter((s) => current.solves.includes(s)).length;
      const sameCategory = t.category === current.category ? 1 : 0;
      return { tool: t, score: shared * 10 + sameCategory };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.tool);
}

/** 解決できる悩みの一意な総数（Phase 完了条件の計測値） */
export function countUniqueSolves(): number {
  return new Set(tools.flatMap((t) => t.solves)).size;
}
