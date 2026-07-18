import { describe, expect, it } from "vitest";
import seido from "@/data/seido/funin-chiryou-hoken-tekiyou.json";
import {
  AGE40_TO43_LIMIT,
  AGE_BOUNDARY,
  calcFuninChiryou,
  COPAYMENT_RATE,
  UNDER40_LIMIT,
  UPPER_AGE_LIMIT,
} from "@/components/tools/impl/FuninChiryouHokenTekiyou.calc";

/** 仕様書 specs/s-tools/14-funin-chiryou-hoken-tekiyou.md のテストケース表を反映 */

describe("FuninChiryouHokenTekiyou.calc — 定数はJSON由来", () => {
  it("#1 年齢上限43・境界40・回数6/3・負担0.3", () => {
    expect(UPPER_AGE_LIMIT).toBe(seido.data.ageRequirement.upperAgeLimit.value);
    expect(UPPER_AGE_LIMIT).toBe(43);
    expect(AGE_BOUNDARY).toBe(40);
    expect(UNDER40_LIMIT).toBe(6);
    expect(AGE40_TO43_LIMIT).toBe(3);
    expect(COPAYMENT_RATE).toBe(0.3);
  });
});

describe("FuninChiryouHokenTekiyou.calc — 年齢による適用可否", () => {
  it("#2 42歳は保険適用対象（43歳未満）", () => {
    const r = calcFuninChiryou({ currentAge: 42, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligibleByAge).toBe(true);
  });

  it("#3 43歳は年齢上限で対象外", () => {
    const r = calcFuninChiryou({ currentAge: 43, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligibleByAge).toBe(false);
    expect(r.canReceiveMore).toBe(false);
  });
});

describe("FuninChiryouHokenTekiyou.calc — 回数上限（初回年齢で決定）", () => {
  it("#4 初回39歳は6回上限", () => {
    const r = calcFuninChiryou({ currentAge: 39, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.countLimit).toBe(6);
    expect(r.remaining).toBe(6);
  });

  it("#5 初回40歳は3回上限", () => {
    const r = calcFuninChiryou({ currentAge: 40, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.countLimit).toBe(3);
  });

  it("#6 初回39歳で開始→現在41歳・4回実施 → 残り2回（上限は初回年齢の6回のまま）", () => {
    const r = calcFuninChiryou({ currentAge: 41, firstAge: 39, priorTransfers: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.countLimit).toBe(6);
    expect(r.remaining).toBe(2);
    expect(r.canReceiveMore).toBe(true);
  });

  it("#7 6回使い切ると残り0・canReceiveMore=false", () => {
    const r = calcFuninChiryou({ currentAge: 39, priorTransfers: 6 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.remaining).toBe(0);
    expect(r.canReceiveMore).toBe(false);
  });

  it("#8 実施回数が上限超過でも残りは0でクランプ", () => {
    const r = calcFuninChiryou({ currentAge: 39, priorTransfers: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.remaining).toBe(0);
  });

  it("#9 初回43歳以上は回数上限0（対象外）", () => {
    const r = calcFuninChiryou({ currentAge: 44, firstAge: 43, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.countLimit).toBe(0);
  });

  it("#10 年齢は対象でも回数を使い切っていれば受けられない", () => {
    const r = calcFuninChiryou({ currentAge: 41, firstAge: 40, priorTransfers: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eligibleByAge).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.canReceiveMore).toBe(false);
  });
});

describe("FuninChiryouHokenTekiyou.calc — 3割窓口負担（任意）", () => {
  it("#11 総額10割50万円 → 3割15万円", () => {
    const r = calcFuninChiryou({ currentAge: 35, priorTransfers: 0, totalTenWari: 500000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.copayment).toBe(150000);
  });

  it("#12 総額未指定なら copayment は null", () => {
    const r = calcFuninChiryou({ currentAge: 35, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.copayment).toBeNull();
  });

  it("#13 端数は切り捨て（10割333,333円→3割99,999円）", () => {
    const r = calcFuninChiryou({ currentAge: 35, priorTransfers: 0, totalTenWari: 333333 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.copayment).toBe(Math.floor(333333 * 0.3));
  });
});

describe("FuninChiryouHokenTekiyou.calc — バリデーション", () => {
  it("#14 年齢マイナスはエラー", () => {
    expect(calcFuninChiryou({ currentAge: -1, priorTransfers: 0 }).ok).toBe(false);
  });
  it("#15 回数マイナスはエラー", () => {
    expect(calcFuninChiryou({ currentAge: 35, priorTransfers: -1 }).ok).toBe(false);
  });
  it("#16 年齢・回数は小数を切り捨て（39.9歳→39歳＝6回）", () => {
    const r = calcFuninChiryou({ currentAge: 39.9, priorTransfers: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.countLimit).toBe(6);
  });
});
