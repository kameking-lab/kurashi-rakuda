/**
 * レート制限と月間ハードキャップ（docs/16 §4-1,2・specs/ai/02 §1）。
 * ★fetch は lib/ai のみ許可（docs/16 §0）★
 *
 * ストアは Upstash Redis（KV_REST_API_URL/TOKEN）。未設定なら同一インスタンス内の
 * メモリフォールバック（ベストエフォート）に縮退する（本番の分散カウントには Upstash 必須＝社長作業）。
 * IP ハッシュは TTL 付きキーの一部としてのみ用い、クエリ本文とは決して紐付けない。
 */
import { RATE_LIMITS, monthlyCallLimit } from "./config";

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
export const hasDistributedStore = !!(KV_URL && KV_TOKEN);

// ---- メモリフォールバック（インスタンス内・TTL 付き） ----
const mem = new Map<string, { count: number; expires: number }>();
function memIncr(key: string, ttlSec: number, now: number): number {
  const cur = mem.get(key);
  if (!cur || cur.expires <= now) {
    mem.set(key, { count: 1, expires: now + ttlSec * 1000 });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

// ---- Upstash Redis REST（INCR ＋ 初回のみ EXPIRE） ----
async function kv(path: string): Promise<number | null> {
  if (!hasDistributedStore) return null;
  const res = await fetch(`${KV_URL}/${path}`, {
    headers: { authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV HTTP ${res.status}`);
  const data = (await res.json()) as { result?: number };
  return typeof data.result === "number" ? data.result : null;
}

async function incrWithTtl(key: string, ttlSec: number, now: number): Promise<number> {
  if (!hasDistributedStore) return memIncr(key, ttlSec, now);
  const n = (await kv(`incr/${encodeURIComponent(key)}`)) ?? 1;
  if (n === 1) await kv(`expire/${encodeURIComponent(key)}/${ttlSec}`);
  return n;
}

/** IP を SHA-256 でハッシュ化（生 IP を保持しない）。Web Crypto（Edge 可） */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.AI_IP_SALT || "kurashi-rakuda";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(buf).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function hourKey(d: Date): string {
  return d.toISOString().slice(0, 13);
}
function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export interface RateResult {
  ok: boolean;
  reason?: "ip-daily" | "session-hourly";
}

/** IP日次10・セッション時5 の両方を判定（超過は 429 相当） */
export async function checkRateLimit(ipHash: string, sessionId: string): Promise<RateResult> {
  const now = Date.now();
  const d = new Date(now);
  const ipCount = await incrWithTtl(`ai:ip:${ipHash}:${dayKey(d)}`, 86_400, now);
  if (ipCount > RATE_LIMITS.perIpPerDay) return { ok: false, reason: "ip-daily" };
  const sess = sessionId ? sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : "anon";
  const sessCount = await incrWithTtl(`ai:sess:${sess}:${hourKey(d)}`, 3_600, now);
  if (sessCount > RATE_LIMITS.perSessionPerHour) return { ok: false, reason: "session-hourly" };
  return { ok: true };
}

/** 月間ハードキャップ判定（超過は 503 相当）。増分してから閾値と比較 */
export async function checkMonthlyCap(): Promise<{ ok: boolean }> {
  const now = Date.now();
  const count = await incrWithTtl(`ai:month:${monthKey(new Date(now))}`, 40 * 86_400, now);
  return { ok: count <= monthlyCallLimit() };
}
