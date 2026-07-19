/**
 * AI 機能の設定・フィーチャーフラグ（docs/16 §4・specs/ai/02 §1）。
 * ★サーバー専用★（GEMINI_API_KEY 等の秘密を読む。クライアントに import しないこと）。
 * 環境変数が未設定でも壊れないよう、すべて安全側（無効）に倒す。
 */

/** モデル: 最安クラスの Gemini Flash-Lite（docs/16 §2）。env で上書き可 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/** AI 機能全体の緊急停止スイッチ。"true" 以外なら常に無効（既定 OFF＝インフラ未整備でも本体無影響） */
export function isAiEnabled(): boolean {
  return process.env.AI_FEATURE_ENABLED === "true" && !!process.env.GEMINI_API_KEY;
}

export function geminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

/** 月間ハードキャップ（呼び出し回数）。超過で 503。既定 10,000 */
export function monthlyCallLimit(): number {
  const n = Number(process.env.AI_MONTHLY_CALL_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 10_000;
}

/** レート制限（docs/16 §4-1）。IPハッシュ 10/日・セッション 5/時 */
export const RATE_LIMITS = {
  perIpPerDay: 10,
  perSessionPerHour: 5,
} as const;

/** 入力テキストの最大長（specs/ai/02 §1）。超過は 400 */
export const MAX_QUERY_CHARS = 500;

/** 応答の最大トークン（docs/16 §2）。最安運用のため短く絞る */
export const MAX_OUTPUT_TOKENS = 512;
