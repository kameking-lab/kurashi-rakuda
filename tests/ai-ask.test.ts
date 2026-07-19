import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * handleAsk のオーケストレーション（specs/ai/02 §4）。
 * ★Gemini・レート制限・蓄積はモック（CI から実 API を叩かない）★。
 * フィーチャーフラグ OFF/入力長/レート超過/上限/幻覚除去の分岐を固定する。
 */
vi.mock("@/lib/ai/gemini", () => ({ askGemini: vi.fn() }));
vi.mock("@/lib/ai/ratelimit", () => ({
  hashIp: vi.fn(async () => "hash"),
  checkRateLimit: vi.fn(async () => ({ ok: true })),
  checkMonthlyCap: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/ai/store", () => ({ recordQuery: vi.fn(async () => {}), isStoreEnabled: () => false }));

import { handleAsk } from "@/lib/ai/ask";
import { askGemini } from "@/lib/ai/gemini";
import { checkRateLimit, checkMonthlyCap } from "@/lib/ai/ratelimit";
import { recordQuery } from "@/lib/ai/store";

const REAL_TOOL = "/tools/childcare/hoikuryo";

function enableAi() {
  process.env.AI_FEATURE_ENABLED = "true";
  process.env.GEMINI_API_KEY = "test-key-not-real";
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_FEATURE_ENABLED;
  delete process.env.GEMINI_API_KEY;
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (checkMonthlyCap as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
});

describe("handleAsk", () => {
  it("AI_FEATURE_ENABLED でない（または鍵なし）とき常に 503 disabled", async () => {
    const r = await handleAsk("search", "保育料", "1.2.3.4", "sess");
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("disabled");
    expect(askGemini).not.toHaveBeenCalled();
  });

  it("不正な kind / 空文字は 400", async () => {
    enableAi();
    expect((await handleAsk("nope", "x", "ip", "s")).status).toBe(400);
    expect((await handleAsk("search", "   ", "ip", "s")).status).toBe(400);
  });

  it("500字超の入力は 400", async () => {
    enableAi();
    const r = await handleAsk("search", "あ".repeat(501), "ip", "s");
    expect(r.status).toBe(400);
    expect(askGemini).not.toHaveBeenCalled();
  });

  it("レート超過は 429", async () => {
    enableAi();
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, reason: "ip-daily" });
    const r = await handleAsk("search", "保育料", "ip", "s");
    expect(r.status).toBe(429);
    expect(askGemini).not.toHaveBeenCalled();
  });

  it("月間上限超過は 503", async () => {
    enableAi();
    (checkMonthlyCap as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const r = await handleAsk("search", "保育料", "ip", "s");
    expect(r.status).toBe(503);
  });

  it("Gemini 失敗は 502（本体は無影響のメッセージ）", async () => {
    enableAi();
    (askGemini as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const r = await handleAsk("search", "保育料", "ip", "s");
    expect(r.status).toBe(502);
  });

  it("正常時は 200・実在 URL の match を返し、search かつ match は記録しない", async () => {
    enableAi();
    (askGemini as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "match",
      items: [{ url: REAL_TOOL, reason: "保育料を計算" }],
    });
    const r = await handleAsk("search", "保育料", "ip", "s");
    expect(r.status).toBe(200);
    expect(r.body.code).toBe("match");
    expect(recordQuery).not.toHaveBeenCalled();
  });

  it("search で該当なし（none）のときは未解決クエリを記録する", async () => {
    enableAi();
    (askGemini as ReturnType<typeof vi.fn>).mockResolvedValue({ code: "none", items: [] });
    const r = await handleAsk("search", "存在しない相談", "ip", "s");
    expect(r.status).toBe(200);
    expect(r.body.code).toBe("none");
    expect(recordQuery).toHaveBeenCalledWith("search", "存在しない相談", false);
  });

  it("consult は match でも記録する", async () => {
    enableAi();
    (askGemini as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "match",
      items: [{ url: REAL_TOOL, reason: "計算できます" }],
    });
    await handleAsk("consult", "お金の相談", "ip", "s");
    expect(recordQuery).toHaveBeenCalledWith("consult", "お金の相談", true);
  });
});
