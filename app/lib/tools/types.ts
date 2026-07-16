/** ツールカテゴリ（docs/02_ツール一覧.md の7カテゴリと1:1） */
export const TOOL_CATEGORIES = {
  pregnancy: "妊娠・出産",
  childcare: "子育て",
  kaji: "家事・料理",
  money: "お金",
  health: "健康・美容",
  career: "仕事・キャリア",
  care: "介護",
} as const;

export type ToolCategory = keyof typeof TOOL_CATEGORIES;

export type ToolStatus = "live" | "planned";

export interface ToolSource {
  label: string;
  url: string;
}

/**
 * ツールのメタデータ。registry.json の1エントリ。
 * solves はフロントマター相当の「解決できる悩み」タグで、
 * .github/scripts/check-solves.mjs が機械集計する（Phase完了条件の計測に使用）。
 */
export interface ToolMeta {
  /** BACKLOG.md のキューID（例: "Q3-14"）。トレーサビリティ用 */
  queueId: string;
  slug: string;
  category: ToolCategory;
  title: string;
  description: string;
  solves: string[];
  /** 準拠年度（制度・データの版。例: "2026年度"）。制度非依存ツールは null */
  basisYear: string | null;
  sources: ToolSource[];
  /** ISO日付。live のツールはロジック・データの最終確認日 */
  updated: string;
  status: ToolStatus;
}

export function isToolCategory(value: string): value is ToolCategory {
  return value in TOOL_CATEGORIES;
}
