import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  simulate,
  validateHoikuryo,
  MAX_HOIKURYO_INPUT,
  BENEFIT_TAX_EXEMPT_NOTE,
  ikukyuKyufuDataset,
  type FukushokuInput,
} from "@/lib/tools/impl/fukushoku-tedori";
import { simulate as simulateJitan } from "@/lib/tools/impl/jitan-kyuyo";
import { addDays } from "@/lib/tools/seido";
import ikukyu from "@/data/seido/ikukyu-kyufu.json";

/**
 * 復職後の手取りシミュレーター（P2-T01 / #56）のテスト。
 * specs/s-tools/07-fukushoku-tedori-simu.md §6。
 *
 * ★このツールの計算の骨格（賃金・社会保険料・育児時短就業給付・8/1改定での停止）は
 *   検証済みの jitan-kyuyo エンジンに委譲している★。したがって本テストは
 *   「保育料を正しく差し引いているか」「委譲が壊れていないか」を主眼に置く
 *   （区分判定・端数処理・限度額そのものは tests/jitan-kyuyo.test.ts が担保）。
 */

const base: FukushokuInput = {
  wageMonthBefore: 300_000,
  wageMonthAfter: 240_000,
  inputMode: "direct",
  weeklyHoursBefore: 40,
  weeklyHoursAfter: 30,
  hoikuryoMonthly: 40_000,
  childBirthDate: "2025-04-01",
  jitanStartDate: "2026-04-01",
  continuedFromIkukyu: true,
  insuredMonths12: "unknown",
  receivingOtherBenefit: false,
  koureishaKeizoku: false,
  insuredWholeMonth: true,
  prefecture: null,
  today: "2026-07-17",
};
const inp = (o: Partial<FukushokuInput> = {}): FukushokuInput => ({ ...base, ...o });

// ================================================================ 委譲（jitan エンジン）が壊れていないこと

describe("jitan-kyuyo エンジンへの委譲（§6.1）", () => {
  it("給付・各シナリオの手取り（保育料を引く前）は jitan-kyuyo と完全一致する", () => {
    const f = simulate(inp());
    const j = simulateJitan(inp());
    expect(f.benefit).toEqual(j.benefit);
    expect(f.takehome).toEqual(j.takehome);
    expect(f.beforeJitanTakehome).toBe(j.beforeJitanTakehome);
    expect(f.checks).toEqual(j.checks);
  });

  it("基本形（300,000→240,000）で給付24,000円・2シナリオが返る", () => {
    const f = simulate(inp());
    expect(f.benefit.amount).toBe(24_000);
    expect(f.scenarios).toHaveLength(2);
    expect(f.scenarios[0].base.scenario).toBe("beforeZuiji");
    expect(f.scenarios[1].base.scenario).toBe("afterZuiji");
  });

  it("区分②（5%短縮）の逓減も委譲で正しく効く", () => {
    const f = simulate(inp({ inputMode: "byHours", weeklyHoursBefore: 40, weeklyHoursAfter: 38 }));
    expect(f.wageAfter).toBe(285_000);
    expect(f.benefit.kubun).toBe("rule2");
    expect(f.benefit.adjustedRatePercent).toBe(4.74);
    expect(f.benefit.amount).toBe(13_509);
  });
});

// ================================================================ 保育料の差し引き

describe("保育料を差し引いた手元に残る額（§6.2）", () => {
  it("★中核★ 時短直後: 保育料を引く前 220,155円 −40,000 → 180,155円", () => {
    const f = simulate(inp());
    const before = f.scenarios[0];
    expect(before.base.monthlyTotal).toBe(220_155);
    expect(before.hoikuryo).toBe(40_000);
    expect(before.net).toBe(180_155);
  });

  it("★中核★ 随時改定後: 保育料を引く前 228,684円 −40,000 → 188,684円", () => {
    const f = simulate(inp());
    const after = f.scenarios[1];
    expect(after.base.monthlyTotal).toBe(228_684);
    expect(after.net).toBe(188_684);
  });

  it("net は必ず『保育料を引く前の合計 − 保育料』に一致する", () => {
    for (const h of [0, 10_000, 40_000, 55_500, MAX_HOIKURYO_INPUT]) {
      const f = simulate(inp({ hoikuryoMonthly: h }));
      for (const s of f.scenarios) {
        expect(s.net).toBe((s.base.monthlyTotal as number) - h);
      }
    }
  });

  it("保育料0円なら net は保育料を引く前の合計と等しい", () => {
    const f = simulate(inp({ hoikuryoMonthly: 0 }));
    expect(f.scenarios[0].net).toBe(f.scenarios[0].base.monthlyTotal);
    expect(f.scenarios[1].net).toBe(f.scenarios[1].base.monthlyTotal);
  });

  it("保育料が社会保険料の時間差より大きいと、時短直後と随時改定後の差は保育料に依らず一定（8,529円）", () => {
    const f = simulate(inp({ hoikuryoMonthly: 55_000 }));
    const diff = (f.scenarios[1].net as number) - (f.scenarios[0].net as number);
    expect(diff).toBe(8_529); // 随時改定で社会保険料が下がった分。保育料は両シナリオ同額のため相殺
  });

  it("保育料の小数入力は円未満切り捨てで差し引く", () => {
    const f = simulate(inp({ hoikuryoMonthly: 40_000.9 }));
    expect(f.hoikuryoMonthly).toBe(40_000);
    expect(f.scenarios[0].net).toBe(180_155);
  });

  it("beforeJitanNet = 時短前（フルタイム）の税引前手取り − 保育料", () => {
    const f = simulate(inp());
    // 300,000 − 社保44,145 = 255,855。−40,000 → 215,855
    expect(f.beforeJitanTakehome).toBe(255_855);
    expect(f.beforeJitanNet).toBe(215_855);
  });

  it("時短後（随時改定後）の手元残額は、時短前フルタイムより増えることがある（給付＋社保軽減の効果の可視化）", () => {
    const f = simulate(inp());
    // これがこのツールの気づき: 賃金は減っても、給付と社保・保育料の総合で手元がどうなるかを示す
    expect(typeof f.scenarios[1].net).toBe("number");
    expect(typeof f.beforeJitanNet).toBe("number");
  });
});

// ================================================================ 給付が算定できない月

describe("給付が算定できない月は net も算定できない（§6.3）", () => {
  it("同月に育休給付を受給（要確認）→ 手取りが算定不能なので net も null", () => {
    const f = simulate(inp({ receivingOtherBenefit: true }));
    expect(f.benefit.kind).toBe("undeterminable");
    // takehome は空（jitan が errors/undeterminable 時は takehome を出さない設計ではないが、
    // benefit.amount が null のため monthlyTotal が null → net も null）
    for (const s of f.scenarios) {
      expect(s.base.monthlyTotal).toBeNull();
      expect(s.net).toBeNull();
    }
  });

  it("賃金が減っていない（昇給）→ 給付は算定不能、net も null", () => {
    const f = simulate(inp({ wageMonthAfter: 320_000 }));
    expect(f.benefit.kubun).toBe("noReduction");
    expect(f.benefit.amount).toBeNull();
    for (const s of f.scenarios) expect(s.net).toBeNull();
  });

  it("子が2歳以上（対象外）→ 給付なし・net も null（保育料だけ引いた額は出さない）", () => {
    const f = simulate(inp({ childBirthDate: "2024-07-17" }));
    expect(f.eligibility.eligible).toBe(false);
    for (const s of f.scenarios) expect(s.net).toBeNull();
  });
});

// ================================================================ 保育料入力のバリデーション

describe("保育料入力のバリデーション（§6.4）", () => {
  it("負の保育料はエラー（0円未満を受け付けない）", () => {
    expect(validateHoikuryo(-1)).toHaveLength(1);
    const f = simulate(inp({ hoikuryoMonthly: -1 }));
    expect(f.hoikuryoErrors.length).toBeGreaterThan(0);
    // エラー時は保育料を0扱いにして誤差し引きしない
    expect(f.hoikuryoMonthly).toBe(0);
  });

  it("上限超過の保育料はエラー", () => {
    expect(validateHoikuryo(MAX_HOIKURYO_INPUT + 1)).toHaveLength(1);
    expect(validateHoikuryo(MAX_HOIKURYO_INPUT)).toHaveLength(0);
  });

  it("0円・妥当な額はエラーなし", () => {
    expect(validateHoikuryo(0)).toHaveLength(0);
    expect(validateHoikuryo(40_000)).toHaveLength(0);
  });

  it("NaN（未入力）はエラー", () => {
    expect(validateHoikuryo(Number.NaN)).toHaveLength(1);
  });
});

// ================================================================ 期限・データ駆動

describe("8/1のデータ期限切れ・データ駆動（§6.5）", () => {
  const EXPIRES_ON = ikukyuKyufuDataset.amendments!.find((a) => a.status === "expires")!.expiresOn!;
  const SWITCH_DATE = addDays(EXPIRES_ON, 1);

  it("期限日（当日）は通常どおり手元残額まで計算する", () => {
    const f = simulate(
      inp({ today: EXPIRES_ON, childBirthDate: addDays(EXPIRES_ON, -400), jitanStartDate: addDays(EXPIRES_ON, -30) }),
    );
    expect(f.expired).toBe(false);
    expect(f.scenarios.length).toBe(2);
    expect(f.scenarios[0].net).not.toBeNull();
  });

  it("★改定日は計算を停止し、シナリオを出さない（古い金額で手取りを出し続けない）", () => {
    const f = simulate(
      inp({ today: SWITCH_DATE, childBirthDate: addDays(SWITCH_DATE, -400), jitanStartDate: addDays(SWITCH_DATE, -30) }),
    );
    expect(f.expired).toBe(true);
    expect(f.scenarios).toHaveLength(0);
  });

  it("非課税ノートは data/seido 由来で、保育料の算定基礎に入らない旨を含む", () => {
    expect(BENEFIT_TAX_EXEMPT_NOTE).toBe(ikukyu.data.handoriJuwariSoutou.taxExempt.note);
    expect(BENEFIT_TAX_EXEMPT_NOTE).toContain("保育料");
  });
});

// ================================================================ ハードコード禁止

describe("ハードコード禁止（§6.6）", () => {
  it("★合成レイヤーに制度の数値の直書きがない（jitan/データ層へ委譲している）", () => {
    const strip = (p: string) =>
      readFileSync(resolve(process.cwd(), p), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    const banned = [
      { re: /\b471[,_]?393\b/, why: "supportLimit" },
      { re: /\b2[,_]?411\b/, why: "minimumAmount" },
      { re: /\b0\.183\b/, why: "厚生年金保険料率" },
      { re: /\b0\.0915\b/, why: "厚生年金の本人負担率" },
      { re: /\b0\.099\b/, why: "健康保険料率" },
      { re: /\b0\.0495\b/, why: "健康保険の本人負担率" },
      { re: /\b0\.0023\b/, why: "子ども・子育て支援金率" },
      { re: /\b0\.005\b/, why: "雇用保険料率" },
      { re: /\b2026-0[78]-\d\d\b/, why: "改定日の直書き" },
    ];
    for (const p of [
      "lib/tools/impl/fukushoku-tedori.ts",
      "components/tools/impl/FukushokuTedori.tsx",
    ]) {
      const src = strip(p);
      for (const b of banned) {
        expect(src, `${p} に ${b.why} が直書きされています`).not.toMatch(b.re);
      }
    }
  });
});
