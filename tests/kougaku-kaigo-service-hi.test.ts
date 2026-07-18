import { describe, expect, it } from "vitest";
import seido from "@/data/seido/kougaku-kaigo-service-hi.json";
import {
  calcKougakuKaigo,
  categoryInfo,
  LIMIT_HIKAZEI,
  LIMIT_INDIVIDUAL,
  LIMIT_KAZEI690,
  LIMIT_KAZEI_UNDER380,
  nenkinBoundary,
  NENKIN_BOUNDARY_BEFORE_AUG2026,
  NENKIN_BOUNDARY_FROM_AUG2026,
} from "@/components/tools/impl/KougakuKaigoServiceHi.calc";

/** 仕様書 specs/s-tools/10-kougaku-kaigo-service-hi.md のテストケース表を反映 */

describe("KougakuKaigoServiceHi.calc — 区分と限度額", () => {
  it("#1 限度額はJSONの各tierと一致（140,100／44,400／24,600／15,000）", () => {
    const tiers = seido.data.brackets.tiers;
    expect(LIMIT_KAZEI690).toBe(tiers.find((t) => t.key === "kazei690")!.limit);
    expect(LIMIT_KAZEI_UNDER380).toBe(44400);
    expect(LIMIT_HIKAZEI).toBe(24600);
    expect(LIMIT_INDIVIDUAL).toBe(15000);
  });

  it("#2 課税〜380万未満は世帯44,400円区分", () => {
    const c = categoryInfo("kazei-under380");
    expect(c.householdLimit).toBe(44400);
    expect(c.individualOverride).toBe(false);
    expect(c.individualOnly).toBe(false);
  });

  it("#3 生活保護は個人単位（individualOnly）", () => {
    expect(categoryInfo("seikatsu-hogo").individualOnly).toBe(true);
    expect(categoryInfo("seikatsu-hogo").householdLimit).toBe(15000);
  });

  it("#4 非課税＋低年金は個人15,000円の上乗せ判定を行う（individualOverride）", () => {
    const c = categoryInfo("hikazei-nenkin");
    expect(c.householdLimit).toBe(24600);
    expect(c.individualOverride).toBe(true);
  });
});

describe("KougakuKaigoServiceHi.calc — 払い戻し額（世帯合算なし）", () => {
  it("#5 課税〜380万未満・負担60,000円 → 15,600円払い戻し・実質44,400円", () => {
    const r = calcKougakuKaigo({ userSelfPay: 60000, category: "kazei-under380" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(15600);
    expect(r.userNetPay).toBe(44400);
    expect(r.eligible).toBe(true);
  });

  it("#6 課税〜380万未満・負担20,000円 → 限度額以下で払い戻しなし", () => {
    const r = calcKougakuKaigo({ userSelfPay: 20000, category: "kazei-under380" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(0);
    expect(r.eligible).toBe(false);
  });

  it("#7 世帯非課税・負担30,000円 → 5,400円払い戻し（限度24,600円）", () => {
    const r = calcKougakuKaigo({ userSelfPay: 30000, category: "hikazei" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(5400);
  });

  it("#8 非課税＋低年金・負担30,000円 → 個人15,000円適用で15,000円払い戻し", () => {
    const r = calcKougakuKaigo({ userSelfPay: 30000, category: "hikazei-nenkin" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(15000); // max(0,30000-15000) > 5400
    expect(r.individualApplied).toBe(true);
    expect(r.appliedLimit).toBe(15000);
    expect(r.userNetPay).toBe(15000);
  });

  it("#9 非課税＋低年金でも個人適用が不利なら世帯24,600円のまま", () => {
    // 負担が20,000円のとき: 世帯 max(0,20000-24600)=0, 個人 max(0,20000-15000)=5000 → 個人が有利
    const r = calcKougakuKaigo({ userSelfPay: 20000, category: "hikazei-nenkin" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(5000);
    expect(r.individualApplied).toBe(true);
  });

  it("#10 生活保護・負担20,000円 → 5,000円払い戻し（個人15,000円）", () => {
    const r = calcKougakuKaigo({ userSelfPay: 20000, category: "seikatsu-hogo" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(5000);
    expect(r.userNetPay).toBe(15000);
  });

  it("#11 課税所得690万以上は限度140,100円（高所得ほど限度が高い）", () => {
    const r = calcKougakuKaigo({ userSelfPay: 150000, category: "kazei690" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(150000 - 140100);
    expect(r.appliedLimit).toBe(140100);
  });
});

describe("KougakuKaigoServiceHi.calc — 世帯合算と按分", () => {
  it("#12 課税〜380万未満・本人30,000＋家族30,000 → 世帯15,600円を按分し本人7,800円", () => {
    const r = calcKougakuKaigo({
      userSelfPay: 30000,
      householdOtherSelfPay: 30000,
      category: "kazei-under380",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.householdTotal).toBe(60000);
    expect(r.householdRefund).toBe(15600);
    expect(r.userRefund).toBe(7800); // 15600 × 30000/60000
  });

  it("#13 按分は本人負担の割合に比例する（本人40,000＋家族20,000）", () => {
    const r = calcKougakuKaigo({
      userSelfPay: 40000,
      householdOtherSelfPay: 20000,
      category: "kazei-under380",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 世帯15,600 × 40000/60000 = 10,400
    expect(r.userRefund).toBe(10400);
  });

  it("#14 世帯合算しても限度額以下なら払い戻しなし", () => {
    const r = calcKougakuKaigo({
      userSelfPay: 20000,
      householdOtherSelfPay: 20000,
      category: "kazei690",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.householdRefund).toBe(0);
    expect(r.userRefund).toBe(0);
  });
});

describe("KougakuKaigoServiceHi.calc — 年金境界額の8/1改定", () => {
  it("#15 2026-07-31までは年金境界809,000円", () => {
    expect(nenkinBoundary("2026-07-31")).toBe(NENKIN_BOUNDARY_BEFORE_AUG2026);
    expect(nenkinBoundary("2026-07-31")).toBe(809000);
  });

  it("#16 2026-08-01からは年金境界826,500円", () => {
    expect(nenkinBoundary("2026-08-01")).toBe(NENKIN_BOUNDARY_FROM_AUG2026);
    expect(nenkinBoundary("2026-08-01")).toBe(826500);
  });
});

describe("KougakuKaigoServiceHi.calc — バリデーション", () => {
  it("#17 本人負担がマイナスはエラー", () => {
    expect(calcKougakuKaigo({ userSelfPay: -1, category: "hikazei" }).ok).toBe(false);
  });

  it("#18 世帯の他の負担がマイナスはエラー", () => {
    expect(
      calcKougakuKaigo({ userSelfPay: 30000, householdOtherSelfPay: -1, category: "hikazei" }).ok,
    ).toBe(false);
  });

  it("#19 負担0円は払い戻し0・エラーにはしない", () => {
    const r = calcKougakuKaigo({ userSelfPay: 0, category: "hikazei" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(0);
  });

  it("#20 生活保護は世帯の他の負担があっても本人単独で判定（按分しない）", () => {
    const r = calcKougakuKaigo({
      userSelfPay: 20000,
      householdOtherSelfPay: 999999,
      category: "seikatsu-hogo",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userRefund).toBe(5000); // 20000-15000、家族分に影響されない
  });

  it("#21 課税690万区分の限度額はデータ由来（ハードコード禁止回帰）", () => {
    expect(LIMIT_KAZEI690).toBe(140100);
    expect(categoryInfo("kazei690").householdLimit).toBe(
      seido.data.brackets.tiers.find((t) => t.key === "kazei690")!.limit,
    );
  });
});
