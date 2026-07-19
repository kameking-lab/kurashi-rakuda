/**
 * AI「聞く」機能の共有型（specs/ai/02）。クライアント／サーバー両方から import 可能な純型のみ。
 */

export type AskKind = "search" | "consult";

/** クライアント → API のリクエスト body */
export interface AskRequest {
  kind: AskKind;
  text: string;
}

/** サイト内の提案カード（url は実在レジストリと突合済みのもののみ） */
export interface AskItem {
  url: string;
  title: string;
  /** 30字以内の一言理由（URL・HTML を含まない検証済み文字列） */
  reason: string;
}

/** API → クライアントのレスポンス */
export interface AskResponse {
  /** match=提案あり / none=該当なし（記録済み） / refer=専門窓口へ / disabled=機能停止中 */
  code: "match" | "none" | "refer" | "disabled";
  items: AskItem[];
  /** 80字以内の一言（URL・HTML を含まない検証済み。任意） */
  note?: string;
}

/** Gemini に構造化出力させる生スキーマ（検証前） */
export interface RawModelOutput {
  code?: string;
  items?: { url?: string; reason?: string }[];
  note?: string;
}
