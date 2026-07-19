/**
 * 「AIに聞く」オーケストレーション（specs/ai/02 §1）。
 * レート制限 → 月間キャップ → Gemini → 応答検証 → 蓄積 → 返却。★fetch は lib/ai のみ★
 */
import { MAX_QUERY_CHARS, isAiEnabled } from "./config";
import { checkMonthlyCap, checkRateLimit, hashIp } from "./ratelimit";
import { askGemini } from "./gemini";
import { validateModelOutput } from "./validate";
import { recordQuery } from "./store";
import type { AskKind, AskResponse } from "./types";

export type AskOutcome =
  | { status: 200; body: AskResponse }
  | { status: 400 | 429 | 502 | 503; body: { code: AskResponse["code"]; message: string } };

/** kind の妥当性 */
function normalizeKind(kind: unknown): AskKind | null {
  return kind === "search" || kind === "consult" ? kind : null;
}

/**
 * リクエストを処理して結果を返す（HTTP ステータスとボディ）。
 * ip/sessionId は route から渡す（ここでは生 IP を保持せずハッシュのみ扱う）。
 */
export async function handleAsk(
  rawKind: unknown,
  rawText: unknown,
  ip: string,
  sessionId: string,
): Promise<AskOutcome> {
  if (!isAiEnabled()) {
    return { status: 503, body: { code: "disabled", message: "AI機能は現在停止中です" } };
  }
  const kind = normalizeKind(rawKind);
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (!kind || !text) return { status: 400, body: { code: "none", message: "入力が不正です" } };
  if (text.length > MAX_QUERY_CHARS) {
    return { status: 400, body: { code: "none", message: `入力は${MAX_QUERY_CHARS}文字以内にしてください` } };
  }

  // レート制限（IP日次・セッション時）
  const ipHash = await hashIp(ip || "unknown");
  const rate = await checkRateLimit(ipHash, sessionId);
  if (!rate.ok) {
    return { status: 429, body: { code: "none", message: "本日の上限に達しました。検索・ツールは引き続き使えます" } };
  }
  // 月間ハードキャップ
  const cap = await checkMonthlyCap();
  if (!cap.ok) {
    return { status: 503, body: { code: "disabled", message: "本日のAI応答は上限に達しました" } };
  }

  // Gemini 呼び出し（失敗は 502）
  let response: AskResponse;
  try {
    const raw = await askGemini(kind, text);
    response = validateModelOutput(raw);
  } catch {
    return { status: 502, body: { code: "none", message: "いま応答できません。検索とツールはそのまま使えます" } };
  }

  // 蓄積: consult は常に、search は該当なし（none）のときに記録（docs/16 §3）
  const matched = response.code === "match";
  if (kind === "consult" || !matched) {
    await recordQuery(kind, text, matched);
  }

  return { status: 200, body: response };
}
