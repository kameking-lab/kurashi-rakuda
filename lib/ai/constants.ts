/**
 * AI 機能のクライアント／サーバー共有の定数（秘密を含まない・process.env を読まない）。
 * ★クライアントから import しても安全★（config.ts のような秘密読み取りを client に混ぜないための分離）。
 */

/** 入力テキストの最大長（specs/ai/02 §1）。超過は 400 */
export const MAX_QUERY_CHARS = 500;

/** 応答の最大トークン（docs/16 §2）。最安運用のため短く絞る */
export const MAX_OUTPUT_TOKENS = 512;

/** レート制限（docs/16 §4-1）。IPハッシュ 10/日・セッション 5/時 */
export const RATE_LIMITS = {
  perIpPerDay: 10,
  perSessionPerHour: 5,
} as const;
