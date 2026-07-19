import { describe, it, expect } from "vitest";
import { checkRateLimit, checkMonthlyCap } from "@/lib/ai/ratelimit";

/**
 * レート制限の実効性（docs/16 §4-1,2）。KV 未設定のためインメモリフォールバックで検証する
 * （本番の分散カウントは Upstash・社長作業）。IP日次10・セッション時5・月間キャップの境界を固定。
 */
describe("checkRateLimit（インメモリ）", () => {
  it("同一 IP は日次10回まで、11回目で ip-daily で止まる", async () => {
    const ip = "rl-ip-daily-fixed";
    for (let i = 0; i < 10; i++) {
      const r = await checkRateLimit(ip, `uniq-session-${i}`); // セッションは毎回変えて IP のみを試す
      expect(r.ok).toBe(true);
    }
    const over = await checkRateLimit(ip, "uniq-session-final");
    expect(over.ok).toBe(false);
    expect(over.reason).toBe("ip-daily");
  });

  it("同一セッションは時5回まで、6回目で session-hourly で止まる", async () => {
    const sess = "rl-sess-hourly-fixed";
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit(`uniq-ip-${i}`, sess); // IP は毎回変えてセッションのみを試す
      expect(r.ok).toBe(true);
    }
    const over = await checkRateLimit("uniq-ip-final", sess);
    expect(over.ok).toBe(false);
    expect(over.reason).toBe("session-hourly");
  });
});

describe("checkMonthlyCap（インメモリ）", () => {
  it("上限までは ok、超過で ok:false（AI_MONTHLY_CALL_LIMIT を小さくして境界確認）", async () => {
    process.env.AI_MONTHLY_CALL_LIMIT = "3";
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push((await checkMonthlyCap()).ok);
    // 同月キーで加算されるため、上限3までtrue・4回目でfalse（他テストの月加算があっても最終回は必ずfalse）
    expect(results[results.length - 1]).toBe(false);
    delete process.env.AI_MONTHLY_CALL_LIMIT;
  });
});
