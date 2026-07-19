/**
 * 「AIに聞く」クライアント側の送信ヘルパー（specs/ai/02 §3）。
 * ★fetch を書いてよいのは lib/ai 配下のみ（docs/16 §0）。この呼び出しは必ずユーザーの明示クリック起点★
 * サーバー秘密は import しない（型のみ）。クライアントバンドルに載っても安全。
 */
import type { AskRequest, AskResponse } from "./types";

/** クライアント側の公開フラグ（値の秘密性なし）。button の表示可否に使う */
export const AI_CLIENT_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

/** sessionStorage の乱数 ID（レート制限ヘッダ用・永続化しない・プロフィール非送信） */
function sessionId(): string {
  try {
    const KEY = "kurashi-rakuda:ai-session";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export type AskResult =
  | { ok: true; data: AskResponse }
  | { ok: false; status: number; message: string };

/**
 * /api/ai/ask に質問文のみを送る。★プロフィール・個人情報は送らない（body は {kind,text} だけ）★
 * 呼び出しは必ずユーザーがボタンを押した時のみ。
 */
export async function askAi(req: AskRequest): Promise<AskResult> {
  try {
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "content-type": "application/json", "x-session-id": sessionId() },
      body: JSON.stringify({ kind: req.kind, text: req.text }),
    });
    const data = (await res.json().catch(() => ({}))) as AskResponse & { message?: string };
    if (res.ok) return { ok: true, data };
    return { ok: false, status: res.status, message: data.message || "いま応答できません" };
  } catch {
    return { ok: false, status: 0, message: "通信に失敗しました。検索とツールはそのまま使えます" };
  }
}
