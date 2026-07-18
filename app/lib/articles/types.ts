import type { ToolCategory, ToolSource } from "@/app/lib/tools/types";
import type { Audience } from "@/app/lib/audience";

/**
 * 記事は3型のみ（docs/03 §3）。ランキング・レビュー単体・体験談風は型として存在させない。 brand-lint-allow
 * solves は ツールと同じ「解決できる悩み」タグで、check-solves.mjs が機械集計する。
 */
export type ArticleType = "seido" | "heiso" | "dandori";

interface ArticleMetaBase {
  type: ArticleType;
  slug: string;
  title: string;
  /** 結論の要約。記事冒頭に必ず表示される（答えを最初に） */
  lead: string;
  category: ToolCategory;
  solves: string[];
  sources: ToolSource[];
  updated: string;
  /** 対象属性メタ（並べ替え・ハイライト用。docs/12）。非表示には使わない */
  audience: Audience;
}

/** 制度解説型: 準拠年度と次回改定チェック日が必須（改定追随の担保） */
export interface SeidoArticleMeta extends ArticleMetaBase {
  type: "seido";
  basisYear: string;
  nextReviewDate: string;
}

/** ツール併走型: 対応するツールが必須（1ツール1本） */
export interface HeisoArticleMeta extends ArticleMetaBase {
  type: "heiso";
  toolCategory: ToolCategory;
  toolSlug: string;
}

/** 段取り型: 手順ステップで構成 */
export interface DandoriArticleMeta extends ArticleMetaBase {
  type: "dandori";
}

export type ArticleMeta =
  | SeidoArticleMeta
  | HeisoArticleMeta
  | DandoriArticleMeta;

export interface DandoriStep {
  title: string;
  /** 目安時期（例: 「入園希望月の6ヶ月前」） */
  when?: string;
  body: string;
}
