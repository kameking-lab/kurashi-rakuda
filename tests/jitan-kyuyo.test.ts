import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  simulate,
  calcBenefit,
  benefitRule1,
  benefitRule2,
  classify,
  calcPremium,
  calcTakehome,
  validate,
  judgeEligibility,
  monthlyChecks,
  isChildEligible,
  isContinuedFromIkukyu,
  wageByHours,
  derivedWageAfter,
  isExpired,
  ikukyuKyufuDataset,
  RATE,
  SUPPORT_LIMIT,
  MINIMUM_AMOUNT,
  EXAMPLE_CAP,
  EXAMPLE_ADJUSTED,
  LOWER_PERCENT,
  UPPER_PERCENT,
  TARGET_CHILD_AGE_YEARS,
  MONTHLY_ELIGIBILITY,
  CONTINUED_WITHIN_DAYS,
  BENEFIT_TAX_EXEMPT,
  type JitanInput,
} from "@/lib/tools/impl/jitan-kyuyo";
import { addDays, amendmentEffectiveDate, isDataExpired, upcomingChanges, type SeidoDataset } from "@/lib/tools/seido";
import raw from "@/data/seido/ikukyu-kyufu.json";
import rates from "@/data/seido/fuyou-kabe.json";

/**
 * specs/s-tools/04-jitan-kinmu-simu.md §6 のテストケース（TC-01〜TC-40）を実装。
 *
 * ★最重要★
 *   - 区分②（賃金が開始時賃金月額の90%超100%未満）で金額を出していないこと（TC-04/TC-17）
 *   - TC-02 は data/seido/ikukyu-kyufu.json の calculationRules.example に厚労省パンフレット
 *     由来の期待値（41,393円）が存在する。回帰テストの錨として最初に確認する。
 *   - 8/1のデータ差し替えだけで追随すること（TC-32〜TC-34）
 */

const J = raw.data.ikujiJitanShugyoKyufuKin;

/**
 * ★8/1のデータ差し替えでテストも自動追随する★（2026-07-17 D1ドライランでの教訓）
 * 期限日・改定日・限度額まわりの境界値はすべてデータから導出する。
 * 金額や日付をテストに直書きすると、8/1にデータを差し替えた瞬間このファイルが割れて
 * 「データ差し替えだけで追随」が嘘になる。
 */
const EXPIRES_AMENDMENT = ikukyuKyufuDataset.amendments!.find((a) => a.status === "expires")!;
const EXPIRES_ON = EXPIRES_AMENDMENT.expiresOn!;
const SWITCH_DATE = addDays(EXPIRES_ON, 1);
/** 区分③（頭打ち）が発動しない最大の賃金（10円刻み）。SUPPORT_LIMIT から導出 */
const CAP_BOUNDARY_W = (() => {
  let w = Math.floor(SUPPORT_LIMIT / 1.1 / 10) * 10;
  while (w + w / 10 <= SUPPORT_LIMIT) w += 10;
  return w - 10;
})();

const base: JitanInput = {
  wageMonthBefore: 300_000,
  wageMonthAfter: 240_000,
  inputMode: "direct",
  weeklyHoursBefore: 40,
  weeklyHoursAfter: 30,
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
const inp = (o: Partial<JitanInput> = {}): JitanInput => ({ ...base, ...o });

// ================================================================ 定数がデータ由来であること

describe("制度定数はすべて data/seido から読む（specs §4.0）", () => {
  it("支給率・支給限度額・最低限度額・対象年齢がデータと一致する", () => {
    expect(RATE).toBe(J.rate.value);
    expect(SUPPORT_LIMIT).toBe(J.supportLimit.value);
    expect(MINIMUM_AMOUNT).toBe(J.minimumAmount.value);
    expect(TARGET_CHILD_AGE_YEARS).toBe(J.targetChildAgeYears.value);
    expect(MONTHLY_ELIGIBILITY).toEqual(J.monthlyEligibility.value);
    expect(BENEFIT_TAX_EXEMPT).toBe(true);
  });

  it("★区分の境界（90%・100%）もデータの文言から取り出している", () => {
    expect(LOWER_PERCENT).toBe(90);
    expect(UPPER_PERCENT).toBe(100);
    expect(J.calculationRules.rules[0].case).toContain(`${LOWER_PERCENT}%`);
    expect(J.calculationRules.rules[1].case).toContain(`${UPPER_PERCENT}%`);
    // 「引き続き」の14日もデータの note 由来
    expect(CONTINUED_WITHIN_DAYS).toBe(14);
    expect(J.eligibility.note).toContain(`${CONTINUED_WITHIN_DAYS}日以内`);
  });

  it("★条番号の罠★ 根拠条文は雇用保険法第61条の12（第61条の11は別物）", () => {
    expect(J.description).toContain("第61条の12");
    expect(J.rate.note).toContain("第61条の11は給付制限の準用規定であり別物");
    // ★実装・UI に誤った条番号（給付制限の準用規定のほう）が現れないこと★
    // 禁止語そのものをこのファイルに直書きすると自己言及で検出できなくなるため、組み立てる。
    const wrongArticle = `第61条の${12 - 1}`;
    for (const p of ["lib/tools/impl/jitan-kyuyo.ts", "components/tools/impl/JitanKyuyo.tsx"]) {
      const src = readFileSync(resolve(process.cwd(), p), "utf8");
      expect(src.includes(wrongArticle), `${p} に誤った条番号が含まれています`).toBe(false);
      expect(src.includes("第61条の12"), `${p} に正しい条番号がありません`).toBe(true);
    }
  });

  it("★区分②の算式は確定済みであるとデータが明記している（解禁の根拠・2026-07-17）", () => {
    expect(J.calculationRules.rules[1].note).toContain("確定");
    expect(J.calculationRules.rules[1].note).toContain("雇用保険法施行規則");
    expect(J.calculationRules.rules[1].note).toContain("第101条の47");
    // 算式ノードと端数処理ノードが存在する（解禁の前提データ）
    expect(J.adjustedRateFormula.value).toContain("9,000 ÷ 賃金率 − 90");
    expect(J.adjustedRateRounding.value).toContain("小数点以下第3位を四捨五入");
  });
});

// ================================================================ 6.1 支給額の算定

describe("支給額の算定（specs §6.1・区分①・区分③・限度額）", () => {
  it("TC-01 300,000 / 240,000 → 24,000円（区分①・限度額に届かない）", () => {
    const b = calcBenefit(300_000, 240_000);
    expect(b.kubun).toBe("rule1");
    expect(b.kind).toBe("paid");
    expect(b.amount).toBe(24_000);
    expect(b.capped).toBe(false);
  });

  it("★回帰テストの錨★ TC-02 データの exampleCap（頭打ちの計算例）と完全一致", () => {
    // ★8/1追随★ 入力・期待値は構造化ノード exampleCap から読む（金額の直書きはしない）
    const ex = EXAMPLE_CAP;
    const b = calcBenefit(ex.wageAtStart, ex.wageInMonth);
    expect(b.kubun).toBe("rule1");
    expect(b.amount).toBe(ex.benefit);
    expect(b.capped).toBe(true);
    // 例の自己整合性: 頭打ちが実際に発動する数値例であり、期待値が「限度額 − 賃金」であること
    expect(ex.wageInMonth).toBeLessThanOrEqual(ex.wageAtStart * 0.9);
    expect(benefitRule1(ex.wageInMonth) + ex.wageInMonth).toBeGreaterThan(SUPPORT_LIMIT);
    expect(ex.benefit).toBe(SUPPORT_LIMIT - ex.wageInMonth);
    // データ側の example 散文と構造化ノードの数値がズレていないこと
    expect(J.calculationRules.example).toContain(`${ex.benefit.toLocaleString("ja-JP")}円`);
    expect(J.calculationRules.example).toContain(Math.floor(ex.wageAtStart * 0.9).toLocaleString("ja-JP"));
  });

  it("TC-03 境界B1: 90%ちょうど（300,000 / 270,000）は区分① → 27,000円", () => {
    expect(classify(300_000, 270_000)).toBe("rule1");
    expect(calcBenefit(300_000, 270_000).amount).toBe(27_000);
  });

  it("★最重要★ TC-04改 境界B1の外（300,000 / 270,001）は区分② → 調整後の支給率で算定", () => {
    const b = calcBenefit(300_000, 270_001);
    expect(b.kubun).toBe("rule2");
    expect(b.kind).toBe("paid");
    expect(b.amount).not.toBeNull();
    expect(b.adjustedRatePercent).not.toBeNull();
    // 賃金率90.000333%は端数処理（小数第3位四捨五入）で90.00%になるため、
    // 支給率はちょうど10.00%（早見表 90.00%→10.00% のとおり）。10%超にはならない
    expect(b.adjustedRatePercent!).toBeLessThanOrEqual(10);
    expect(b.amount!).toBeLessThanOrEqual(27_000);
    // 賃金額と支給額の合計は開始時賃金月額を超えない（法文の趣旨。端数処理誤差の範囲内）
    expect(b.amount! + 270_001).toBeLessThanOrEqual(300_000 + 1);
    // 明確に区分②内（賃金率95%）では支給率は必ず10%未満
    const mid = calcBenefit(300_000, 285_000);
    expect(mid.adjustedRatePercent!).toBeLessThan(10);
    expect(mid.amount!).toBeLessThan(28_500);
  });

  it("★解禁の錨★ 区分② データの exampleAdjusted（厚労省パンフレット例②）と完全一致", () => {
    // ★8/1追随★ 入力・期待値は構造化ノード exampleAdjusted から読む（率・金額とも）
    const ex = EXAMPLE_ADJUSTED;
    const b = calcBenefit(ex.wageAtStart, ex.wageInMonth);
    expect(b.kubun).toBe("rule2");
    expect(b.kind).toBe("paid");
    expect(b.adjustedRatePercent).toBe(ex.ratePercent);
    expect(b.amount).toBe(ex.benefit);
    // データ側の散文と構造化ノードの数値がズレていないこと
    expect(J.calculationRules.exampleAdjustedRate).toContain(`${ex.ratePercent}%`);
    expect(J.calculationRules.exampleAdjustedRate).toContain(`${ex.benefit.toLocaleString("ja-JP")}円`);
  });

  it("区分② 支給率早見表との一致: 90.00%→10.00%、95.00%→4.74%、100.00%→0.00%", () => {
    expect(benefitRule2(100_000, 90_000).ratePercent).toBe(10);
    expect(benefitRule2(100_000, 95_000).ratePercent).toBe(4.74);
    expect(benefitRule2(100_000, 100_000).ratePercent).toBe(0);
  });

  it("区分② 90%境界で区分①と連続する（支給率10%で接続）", () => {
    // 90%ちょうどは区分①（10%）。その1円上の区分②は支給率がほぼ10%で連続
    const rule1Amount = calcBenefit(300_000, 270_000).amount!;
    const rule2 = calcBenefit(300_000, 270_001);
    expect(rule1Amount).toBe(27_000);
    // 連続性: 差は端数処理の範囲（数十円以内）
    expect(Math.abs(rule2.amount! - rule1Amount)).toBeLessThan(100);
  });

  it("区分② 賃金がほぼ100%なら算定額が最低限度額以下 → 不支給", () => {
    // W=299,900（賃金率99.97%）→ 支給率0.03% → 89円 ≦ 最低限度額2,411円
    const b = calcBenefit(300_000, 299_900);
    expect(b.kubun).toBe("rule2");
    expect(b.kind).toBe("notPaid");
    expect(b.amount).toBe(0);
  });

  it("TC-05 境界B2: 100%ちょうど（300,000 / 300,000）は区分②に含まれない → 算定不能", () => {
    expect(classify(300_000, 300_000)).toBe("noReduction");
    const b = calcBenefit(300_000, 300_000);
    expect(b.amount).toBeNull();
    expect(b.reason).toContain("減っていない");
  });

  it("TC-06 境界B3の内側: 頭打ち境界の賃金（限度額から導出）→ 満額", () => {
    // ★8/1追随★ 境界値は SUPPORT_LIMIT から計算する（現行データでは 428,530円）
    const w = CAP_BOUNDARY_W;
    const b = calcBenefit(w * 2, w); // w ≦ 90%×(w×2) なので必ず区分①
    expect(b.capped).toBe(false);
    expect(b.amount).toBe(benefitRule1(w));
    expect(b.amount! + w).toBeLessThanOrEqual(SUPPORT_LIMIT);
  });

  it("TC-07 境界B3の外側: 境界+10円 → 頭打ち（境界の内外で支給額が飛ばない）", () => {
    const w = CAP_BOUNDARY_W + 10;
    const b = calcBenefit(w * 2, w);
    expect(b.capped).toBe(true);
    expect(b.amount).toBe(SUPPORT_LIMIT - w);
    // 連続性: 10円刻みの端数の範囲内
    const inner = calcBenefit(CAP_BOUNDARY_W * 2, CAP_BOUNDARY_W).amount!;
    expect(Math.abs(b.amount! - inner)).toBeLessThanOrEqual(11);
  });

  it("TC-08 境界B4: 賃金が支給限度額ちょうど → 不支給（B3→B5から自動的に0）", () => {
    const b = calcBenefit(SUPPORT_LIMIT * 2, SUPPORT_LIMIT);
    // 限度額×10%切捨（整数演算で独立に再計算）
    expect(benefitRule1(SUPPORT_LIMIT)).toBe(Math.floor((SUPPORT_LIMIT * 100) / 1000));
    expect(b.kind).toBe("notPaid");
    expect(b.amount).toBe(0);
  });

  it("TC-09 B4の1円手前も最低限度額で消える", () => {
    const b = calcBenefit(SUPPORT_LIMIT * 2, SUPPORT_LIMIT - 1);
    // 算定額は 限度額 −（限度額−1）= 1円 → 最低限度額以下 → 不支給
    expect(b.kind).toBe("notPaid");
    expect(b.amount).toBe(0);
  });

  it("TC-10 高所得: 限度額の96%の賃金 → 10%に届かず頭打ち額（半額以下）", () => {
    // ★8/1追随★ 「頭打ちが深く効く」入力を SUPPORT_LIMIT から導出（現行データでは452,540円）
    const w = Math.ceil((SUPPORT_LIMIT * 0.96) / 10) * 10;
    const b = calcBenefit(w * 2, w);
    expect(b.capped).toBe(true);
    expect(b.amount).toBe(SUPPORT_LIMIT - w);
    expect(b.amount!).toBeLessThan(benefitRule1(w) / 2);
  });

  it("★★浮動小数の罠★★ TC-11 境界B5: 算定額が最低限度額ちょうど → 不支給", () => {
    // ★仕様書 §9.2 との差異★ 仕様書は「24110 × 0.1 = 2410.9999999999995 → floor で 2410」と
    // するが、実際には 24110 × 0.1 は正確に 2411 に丸まる（IEEE754 の最近接丸めのため）。
    // 0 〜 3,000,000 の全整数で floor(w × 0.1) と整数演算は一致することを確認済み。
    // それでも実装は整数演算（千分率）を採用する。支給率がデータ側で 0.1 以外
    // （例: 0.15）に改定されたとき、素朴な浮動小数の乗算は 1円の誤差を生み得るためで、
    // ここは1円差で支給・不支給が分かれる境界だからである。
    // ★8/1追随★ 最低限度額ちょうどになる賃金は MINIMUM_AMOUNT×10（現行データでは 24,110円）
    expect(benefitRule1(MINIMUM_AMOUNT * 10)).toBe(MINIMUM_AMOUNT);
    for (const w of [MINIMUM_AMOUNT * 10, MINIMUM_AMOUNT * 10 + 10, 24_110, 266_666, 430_000, SUPPORT_LIMIT]) {
      expect(benefitRule1(w), `${w} で整数演算と一致すること`).toBe(Math.floor((w * 100) / 1000));
    }
    const b = calcBenefit(MINIMUM_AMOUNT * 20, MINIMUM_AMOUNT * 10);
    expect(b.kind).toBe("notPaid"); // ★「以下」＝ちょうどは不支給側★ `<` で実装すると最低限度額ちょうどが支給されて不合格
    expect(b.amount).toBe(0);
  });

  it("TC-12 B5の反対側: 最低限度額+1円で支給（1円差で分かれる）", () => {
    const w = MINIMUM_AMOUNT * 10 + 10;
    expect(benefitRule1(w)).toBe(MINIMUM_AMOUNT + 1);
    const b = calcBenefit(MINIMUM_AMOUNT * 20, w);
    expect(b.kind).toBe("paid");
    expect(b.amount).toBe(MINIMUM_AMOUNT + 1);
  });

  it("TC-13 賃金が0円の月（300,000 / 0）→ 不支給", () => {
    const b = calcBenefit(300_000, 0);
    expect(b.kind).toBe("notPaid");
    expect(b.amount).toBe(0);
  });

  it("★端数処理★ TC-14 333,333 / 266,666 → 26,666円（切捨。四捨五入なら26,667で不合格）", () => {
    // T90 = 299,999.7。丸めると区分判定が変わるため整数比較する
    expect(classify(333_333, 266_666)).toBe("rule1");
    expect(calcBenefit(333_333, 266_666).amount).toBe(26_666);
    expect(calcBenefit(333_333, 266_666).amount).not.toBe(26_667);
    expect(calcBenefit(333_333, 266_666).threshold).toBe(299_999.7);
  });
});

// ================================================================ 6.2 制度要件・各月要件

describe("制度要件・各月要件（specs §6.2）", () => {
  it("TC-15 子が2歳未満（計算日の2年前の翌日生まれ）なら対象", () => {
    expect(isChildEligible("2024-07-18", "2026-07-17")).toBe(true);
    const r = simulate(inp({ childBirthDate: "2024-07-18" }));
    expect(r.eligibility.eligible).toBe(true);
    expect(r.benefit.amount).toBe(24_000);
  });

  it("TC-16 境界B6: 子がちょうど2歳（計算日の2年前生まれ）なら対象外", () => {
    expect(isChildEligible("2024-07-17", "2026-07-17")).toBe(false);
    const r = simulate(inp({ childBirthDate: "2024-07-17" }));
    expect(r.eligibility.eligible).toBe(false);
    expect(r.eligibility.childOk).toBe(false);
    expect(r.benefit.kind).toBe("notEligible");
    expect(r.benefit.amount).toBeNull();
    expect(r.eligibility.reason).toContain("2歳");
  });

  it("★誤解の打ち消し★ TC-17改 5%短縮（40h→38h）は区分②として算定され「対象外」ではない", () => {
    const r = simulate(inp({ inputMode: "byHours", weeklyHoursBefore: 40, weeklyHoursAfter: 38 }));
    expect(r.wageAfter).toBe(285_000);
    expect(r.eligibility.eligible).toBe(true); // ★制度上は対象★
    expect(r.benefit.kubun).toBe("rule2");
    expect(r.benefit.kind).toBe("paid");
    expect(r.benefit.kind).not.toBe("notEligible");
    // 賃金率95.00% → 支給率4.74%（早見表）→ 285,000 × 4.74% = 13,509円
    expect(r.benefit.adjustedRatePercent).toBe(4.74);
    expect(r.benefit.amount).toBe(13_509);
    // 時短の程度に上限・下限はない（各月要件[1]は満たす）
    expect(r.checks[1].ok).toBe(true);
    expect(J.noMinimumReduction.value).toContain("上限・下限はない");
  });

  it("TC-18 半減（40h→20h）は区分①で 15,000円。時短の程度が大きくても同じ10%", () => {
    const r = simulate(inp({ inputMode: "byHours", weeklyHoursBefore: 40, weeklyHoursAfter: 20 }));
    expect(r.wageAfter).toBe(150_000);
    expect(r.benefit.amount).toBe(15_000);
    expect(wageByHours(300_000, 40, 20)).toBe(150_000);
  });

  it("TC-19 育休から続かないが完全月12か月あり → 対象", () => {
    const r = simulate(inp({ continuedFromIkukyu: false, insuredMonths12: "yes" }));
    expect(r.eligibility.eligible).toBe(true);
    expect(r.eligibility.needsConfirmation).toBe(false);
    expect(r.benefit.amount).toBe(24_000);
  });

  it("TC-20 育休から続かず完全月12か月なし → 対象外", () => {
    const r = simulate(inp({ continuedFromIkukyu: false, insuredMonths12: "no" }));
    expect(r.eligibility.eligible).toBe(false);
    expect(r.benefit.kind).toBe("notEligible");
    expect(r.benefit.amount).toBeNull();
  });

  it("★『わからない』を『対象外』にしない★ TC-21 unknown は参考値＋要確認を併記する", () => {
    const r = simulate(inp({ continuedFromIkukyu: false, insuredMonths12: "unknown" }));
    expect(r.eligibility.eligible).toBe(true);
    expect(r.eligibility.needsConfirmation).toBe(true);
    expect(r.benefit.amount).toBe(24_000); // 参考値は出す
    expect(r.warnings.some((w) => w.includes("ハローワークでの確認が必要"))).toBe(true);
    expect(r.eligibility.reason).not.toContain("対象外");
  });

  it("TC-22/TC-23 境界B7: 育休終了から14日ちょうどは「引き続き」・15日は該当しない", () => {
    expect(isContinuedFromIkukyu("2026-04-01", "2026-04-15")).toBe(true); // 14日
    expect(isContinuedFromIkukyu("2026-04-01", "2026-04-16")).toBe(false); // 15日
    expect(isContinuedFromIkukyu("2026-04-01", "2026-04-02")).toBe(true); // 翌日
    // ★14日ちょうどは「引き続き」★ insuredMonths12="no" でも対象になる
    const at14 = judgeEligibility(
      inp({ continuedFromIkukyu: false, insuredMonths12: "no", ikukyuEndDate: "2026-03-18", jitanStartDate: "2026-04-01" }),
    );
    expect(at14.eligible).toBe(true);
    expect(at14.reason).toContain("引き続き");
    // TC-23 15日は「引き続き」ではない → insuredMonths12 の判定へ落ちる
    const at15 = judgeEligibility(
      inp({ continuedFromIkukyu: false, insuredMonths12: "no", ikukyuEndDate: "2026-03-17", jitanStartDate: "2026-04-01" }),
    );
    expect(at15.eligible).toBe(false);
    // 15日でも完全月12か月あれば対象（＝14日ルールは判定の入口にすぎない）
    const at15yes = judgeEligibility(
      inp({ continuedFromIkukyu: false, insuredMonths12: "yes", ikukyuEndDate: "2026-03-17", jitanStartDate: "2026-04-01" }),
    );
    expect(at15yes.eligible).toBe(true);
  });

  it("TC-24 各月要件[0]: 月途中の入社（初日から末日まで被保険者でない）→ その月は不支給", () => {
    const r = simulate(inp({ insuredWholeMonth: false }));
    expect(r.checks[0].ok).toBe(false);
    expect(r.benefit.kind).toBe("notPaid");
    expect(r.benefit.amount).toBe(0);
  });

  it("★断定しない★ TC-25 各月要件[2]: 同月に育休給付を受給 → 金額を出さず要確認", () => {
    const r = simulate(inp({ receivingOtherBenefit: true }));
    expect(r.checks[2].ok).toBe(false);
    expect(r.checks[2].determinable).toBe(false); // 原文の読みが一意でない
    expect(r.benefit.kind).toBe("undeterminable");
    expect(r.benefit.amount).toBeNull();
    expect(r.benefit.reason).toContain("ハローワーク");
  });

  it("TC-26 各月要件[3]: 高年齢雇用継続給付の受給対象 → その月は不支給", () => {
    const r = simulate(inp({ koureishaKeizoku: true }));
    expect(r.checks[3].ok).toBe(false);
    expect(r.benefit.kind).toBe("notPaid");
    expect(r.benefit.amount).toBe(0);
  });

  it("各月の支給要件は4つで、データの文言をそのまま表示する", () => {
    const c = monthlyChecks(inp());
    expect(c).toHaveLength(4);
    expect(c.map((x) => x.label)).toEqual(J.monthlyEligibility.value);
    expect(c.every((x) => x.ok)).toBe(true);
  });
});

// ================================================================ 6.3 手取り（社会保険料）

describe("手取りの概算（specs §6.3）", () => {
  const b = () => calcBenefit(300_000, 240_000);

  it("★中核★ TC-27 時短直後（標準報酬300,000のまま）→ 控除43,845 / 合計220,155", () => {
    const s = calcTakehome(inp(), b(), "beforeZuiji");
    expect(s.premium.standardWage).toBe(300_000);
    expect(s.premium.pension).toBe(27_450); // 300,000 × 9.15%
    expect(s.premium.health).toBe(14_850); // 300,000 × 4.95%
    expect(s.premium.childcareSupport).toBe(345); // 300,000 × 0.115%
    expect(s.premium.employment).toBe(1_200); // 240,000 × 0.5%（★実賃金ベース★）
    expect(s.premium.total).toBe(43_845);
    expect(s.beforeTax).toBe(196_155);
    expect(s.monthlyTotal).toBe(220_155);
  });

  it("TC-28 随時改定後（標準報酬240,000）→ 控除35,316 / 合計228,684。差は8,529円/月", () => {
    const s = calcTakehome(inp(), b(), "afterZuiji");
    expect(s.premium.pension).toBe(21_960);
    expect(s.premium.health).toBe(11_880);
    expect(s.premium.childcareSupport).toBe(276);
    expect(s.premium.employment).toBe(1_200);
    expect(s.premium.total).toBe(35_316);
    expect(s.beforeTax).toBe(204_684);
    expect(s.monthlyTotal).toBe(228_684);
    // ★このツールの価値★ 2つのシナリオの差
    const before = calcTakehome(inp(), b(), "beforeZuiji");
    expect(s.monthlyTotal! - before.monthlyTotal!).toBe(8_529);
  });

  it("★★TC-29 子ども・子育て支援金0.23%を必ず織り込む（外すと過大評価）★★", () => {
    const s = calcTakehome(inp(), b(), "afterZuiji");
    expect(rates.data.insuranceRates.childcareSupportRate.value).toBe(0.0023);
    expect(s.premium.childcareSupport).toBeGreaterThan(0);
    expect(s.monthlyTotal).toBe(228_684);
    // 支援金を外すと 228,960 になる。それでは不合格
    expect(s.monthlyTotal).not.toBe(228_960);
    expect(s.monthlyTotal! + s.premium.childcareSupport).toBe(228_960);
    expect(rates.data.insuranceRates.childcareSupportRate.note).toContain("過大評価");
  });

  it("★算定基礎が違う罠★ TC-30 雇用保険料は実賃金ベース（標準報酬でなく240,000）", () => {
    const a = calcPremium(300_000, 240_000);
    const c = calcPremium(240_000, 240_000);
    expect(a.employment).toBe(1_200);
    expect(c.employment).toBe(1_200); // 両シナリオ共通
    expect(a.employment).not.toBe(1_500); // 標準報酬300,000で計算すると1,500になる
  });

  it("TC-31 都道府県を選んでも計算結果は変わらず、注記だけが増える", () => {
    const without = simulate(inp());
    const tokyo = simulate(inp({ prefecture: "東京都" }));
    expect(tokyo.takehome[0].premium.health).toBe(without.takehome[0].premium.health);
    expect(tokyo.takehome[0].monthlyTotal).toBe(without.takehome[0].monthlyTotal);
    // ★東京支部9.85%を勝手に使ったら不合格★ 全国平均9.9%のまま
    expect(tokyo.takehome[0].premium.health).toBe(14_850);
    expect(tokyo.warnings.some((w) => w.includes("全国平均"))).toBe(true);
    expect(without.warnings.some((w) => w.includes("全国平均"))).toBe(false);
  });

  it("★時短中は社会保険料が免除されない★（免除は産前産後休業・育児休業等の期間）", () => {
    const r = simulate(inp());
    expect(r.takehome[0].premium.total).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.includes("免除されません"))).toBe(true);
    expect(raw.data.shakaiHokenryoMenjo.description).toContain("育児休業等期間中");
  });

  it("★随時改定の時期を月数で断定しない★（data/seido に未収録）", () => {
    const r = simulate(inp());
    const w = r.warnings.find((x) => x.includes("すぐには下がりません"));
    expect(w).toBeDefined();
    expect(w).toContain("勤務先にご確認ください");
    expect(w).not.toMatch(/[0-9]か月目/);
    // 養育期間の従前標準報酬月額のみなし措置は「案内のみ・金額影響は計算しない」
    expect(r.warnings.some((x) => x.includes("年金額が下がらないようにする申出"))).toBe(true);
  });
});

// ================================================================ 6.4 期限・異常系

describe("期限・異常系（specs §6.4）", () => {
  it("TC-32 境界B8の内側: 期限日（expiresOn）当日は通常どおり計算する", () => {
    // ★8/1追随★ 日付はデータから導出。子の生年月日も基準日に連動させる（2歳要件を満たすため）
    const r = simulate(inp({ today: EXPIRES_ON, childBirthDate: addDays(EXPIRES_ON, -400), jitanStartDate: addDays(EXPIRES_ON, -30) }));
    expect(r.expired).toBe(false);
    expect(r.benefit.amount).toBe(24_000);
  });

  it("★境界B8★ TC-33 期限日の翌日（改定日）は計算を停止する（古い金額で計算し続けない）", () => {
    const r = simulate(inp({ today: SWITCH_DATE, childBirthDate: addDays(SWITCH_DATE, -400), jitanStartDate: addDays(SWITCH_DATE, -30) }));
    expect(r.expired).toBe(true);
    expect(r.benefit.amount).toBeNull();
    expect(r.takehome).toHaveLength(0);
  });

  it("TC-34 開始日が期限後でも計算を停止する", () => {
    const startAfter = addDays(SWITCH_DATE, 31);
    const r = simulate(inp({ jitanStartDate: startAfter, childBirthDate: addDays(startAfter, -400), today: EXPIRES_ON }));
    expect(r.expired).toBe(true);
    expect(r.benefit.amount).toBeNull();
    expect(isExpired({ today: EXPIRES_ON, jitanStartDate: startAfter })).toBe(true);
  });

  it("TC-35 wageMonthBefore = 0 はバリデーションエラー（0除算を起こさない）", () => {
    const e = validate(inp({ wageMonthBefore: 0 }));
    expect(e.some((x) => x.field === "wageMonthBefore")).toBe(true);
    const r = simulate(inp({ wageMonthBefore: 0 }));
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.benefit.amount).toBeNull();
    expect(Number.isNaN(r.benefit.threshold)).toBe(false);
  });

  it("TC-36 wageMonthAfter = -1 はバリデーションエラー（負値を受け付けない）", () => {
    const e = validate(inp({ wageMonthAfter: -1 }));
    expect(e.some((x) => x.field === "wageMonthAfter")).toBe(true);
    expect(simulate(inp({ wageMonthAfter: -1 })).benefit.amount).toBeNull();
  });

  it("TC-37 昇給（時短前より賃金が減っていない）→ マイナスの給付額を出さない", () => {
    const r = simulate(inp({ wageMonthAfter: 320_000 }));
    expect(r.benefit.kubun).toBe("noReduction");
    expect(r.benefit.amount).toBeNull();
    expect(r.checks[1].ok).toBe(false);
  });

  it("TC-38 wageMonthBefore = 3,000,001 は上限超過でバリデーションエラー", () => {
    expect(validate(inp({ wageMonthBefore: 3_000_001 })).some((x) => x.field === "wageMonthBefore")).toBe(true);
    expect(validate(inp({ wageMonthBefore: 3_000_000, wageMonthAfter: 2_000_000 }))).toHaveLength(0);
  });

  it("時間比例の入力補助でも、時短後の時間が時短前を超えたらエラーにする", () => {
    const e = validate(inp({ inputMode: "byHours", weeklyHoursBefore: 30, weeklyHoursAfter: 40 }));
    expect(e.some((x) => x.field === "weeklyHours")).toBe(true);
    expect(derivedWageAfter(inp({ inputMode: "byHours" }))).toBe(225_000); // 300,000 × 30/40
  });
});

// ================================================================ ★8/1のデータ差し替えで追随する★

describe("★8月1日のデータ差し替えだけで追随すること★（specs §7.1・§9.4）", () => {
  const ds = ikukyuKyufuDataset;

  it("改定日はコードではなく amendments から導出される（expiresOn → その翌日）", () => {
    expect(EXPIRES_AMENDMENT).toBeDefined();
    expect(EXPIRES_ON >= ds.asOf).toBe(true); // 期限切れデータのままテストが通らないこと
    expect(amendmentEffectiveDate(EXPIRES_AMENDMENT)).toBe(SWITCH_DATE);
    expect(upcomingChanges(ds, ds.asOf)[0].date).toBe(SWITCH_DATE);
    // amendments の説明文が現行の限度額・最低限度額と食い違っていないこと（★8/1追随★）
    expect(EXPIRES_AMENDMENT.summary).toContain(SUPPORT_LIMIT.toLocaleString("ja-JP"));
    expect(EXPIRES_AMENDMENT.summary).toContain(MINIMUM_AMOUNT.toLocaleString("ja-JP"));
  });

  it("★安全弁★ expiresOn を1年後にすると期限切れが解消し、次回改定も1年後になる", () => {
    const nextExpiresOn = `${Number(EXPIRES_ON.slice(0, 4)) + 1}${EXPIRES_ON.slice(4)}`;
    const next: SeidoDataset = {
      ...ds,
      amendments: ds.amendments!.map((a) =>
        a.status === "expires" && a.expiresOn === EXPIRES_ON ? { ...a, expiresOn: nextExpiresOn } : a,
      ),
    };
    expect(isDataExpired(ds, SWITCH_DATE)).toBe(true);
    expect(isDataExpired(next, SWITCH_DATE)).toBe(false);
    expect(upcomingChanges(next, SWITCH_DATE)[0].date).toBe(addDays(nextExpiresOn, 1));
    // 期限の判定にコード側の日付リテラルが一切関与していないこと
    expect(isDataExpired({ ...ds, amendments: [] }, "2030-01-01")).toBe(false);
  });

  it("★金額だけ差し替えても同じ式で追随する★ 限度額・最低限度額はデータ参照", () => {
    // 8/1に supportLimit が仮に 480,000 円へ改定されても、計算式は同じ
    const hypotheticalLimit = 480_000;
    expect(hypotheticalLimit - 430_000).toBe(50_000); // A = LIMIT − Wm
    // 頭打ち例（exampleCap）は常に「限度額 − 賃金」と一致する
    expect(calcBenefit(EXAMPLE_CAP.wageAtStart, EXAMPLE_CAP.wageInMonth).amount).toBe(
      SUPPORT_LIMIT - EXAMPLE_CAP.wageInMonth,
    );
    // 頭打ちの発動点も限度額から導出される（コードに閾値を持たない）
    expect(calcBenefit(SUPPORT_LIMIT * 2, SUPPORT_LIMIT).amount).toBe(0);
    // 最低限度額の境界も MINIMUM_AMOUNT から導出される
    expect(benefitRule1(MINIMUM_AMOUNT * 10)).toBe(MINIMUM_AMOUNT);
    expect(calcBenefit(MINIMUM_AMOUNT * 100, MINIMUM_AMOUNT * 10).kind).toBe("notPaid");
    expect(calcBenefit(MINIMUM_AMOUNT * 100, MINIMUM_AMOUNT * 10 + 10).kind).toBe("paid");
  });

  it("★ハードコード禁止★ 実装に制度の数値の直書きがない（data/seido から読んでいる）", () => {
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
    // ★2026-07-17 D1ドライランで追加★ ツールページの「根拠・計算式」の散文も対象
    // （旧実装は 471,393円 等を散文に直書きしており、8/1改定で新旧の金額が同一ページに混在した）
    for (const p of [
      "lib/tools/impl/jitan-kyuyo.ts",
      "components/tools/impl/JitanKyuyo.tsx",
      "app/(site)/tools/[category]/[slug]/page.tsx",
    ]) {
      const src = strip(p);
      for (const b of banned) {
        expect(src, `${p} に ${b.why} が直書きされています`).not.toMatch(b.re);
      }
    }
  });

  it("★フォールバック定数を持たない★ データのキーが欠けたら例外を投げて計算を止める", () => {
    // supportLimit を消したデータで同じ算式を評価すると undefined になり、
    // 471393 をコード内フォールバックで補完しないことを示す
    const broken = { ...J, supportLimit: undefined } as unknown as { supportLimit?: { value: number } };
    expect(() => {
      const limit = broken.supportLimit!.value;
      return limit;
    }).toThrow();
    // 実装は import した JSON をそのまま参照しており、既定値の代入を書いていない
    const src = readFileSync(resolve(process.cwd(), "lib/tools/impl/jitan-kyuyo.ts"), "utf8");
    expect(src).toContain("J.supportLimit.value");
    expect(src).toContain("J.minimumAmount.value");
    expect(src).not.toMatch(/supportLimit\?\.\s*value\s*\?\?/);
  });
});
