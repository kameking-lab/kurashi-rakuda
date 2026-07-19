/**
 * POST /api/ai/ask — AI 機能の唯一のサーバー面（specs/ai/02 §1・docs/16 §1）。
 * ★このルートは check:ai-boundary が許可する app/api/ai 配下★
 * 明示送信のみ・入力テキストのみを扱う。プロフィールや個人情報は受け取らない。
 */
import { handleAsk } from "@/lib/ai/ask";

// 記事インデックス生成が fs を使うため Node ランタイム（specs/ai/02 §1 は Edge を「可」とするが必須ではない）。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** X-Forwarded-For 等からクライアント IP を推定（ハッシュ化してレート制限にのみ使う） */
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request): Promise<Response> {
  let body: { kind?: unknown; text?: unknown };
  try {
    body = (await req.json()) as { kind?: unknown; text?: unknown };
  } catch {
    return Response.json({ code: "none", message: "JSON が不正です" }, { status: 400 });
  }
  const sessionId = req.headers.get("x-session-id") || "";
  const outcome = await handleAsk(body.kind, body.text, clientIp(req), sessionId);
  return Response.json(outcome.body, { status: outcome.status });
}

/** それ以外のメソッドは 405 */
export function GET(): Response {
  return Response.json({ code: "none", message: "POST のみ対応" }, { status: 405 });
}
