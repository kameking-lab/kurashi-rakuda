/**
 * 未解決クエリの匿名蓄積（specs/ai/03・docs/16 §3）。★fetch は lib/ai のみ許可★
 *
 * 保存するのは質問文・種別・matched・日付（日単位）のみ。IP/UA/プロフィール/詳細時刻は持たない
 * （スキーマで物理的に不可能。specs/ai/03 §1）。Supabase 未設定時は完全 no-op（アダプタ層で無効化）。
 * 書き込み失敗は握りつぶし、ユーザー応答を優先する（ベストエフォート）。
 */
import type { AskKind } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** 蓄積が有効か（env が揃っているか） */
export function isStoreEnabled(): boolean {
  return !!(SUPABASE_URL && SERVICE_ROLE);
}

/**
 * 未解決／相談クエリを記録する。search は matched=false のときのみ、consult は常に記録（docs/16 §3・specs/ai/02 §2）。
 * created_on はサーバー既定（current_date）に委ね、詳細時刻は送らない。
 */
export async function recordQuery(kind: AskKind, text: string, matched: boolean): Promise<void> {
  if (!isStoreEnabled()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/unresolved_queries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SERVICE_ROLE!,
        authorization: `Bearer ${SERVICE_ROLE}`,
        prefer: "return=minimal",
      },
      body: JSON.stringify({ kind, query_text: text.slice(0, 500), matched }),
    });
  } catch {
    // 蓄積はベストエフォート。失敗してもユーザー応答に影響させない
  }
}
