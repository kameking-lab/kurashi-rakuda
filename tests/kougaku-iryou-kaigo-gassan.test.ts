import { describe, expect, it } from "vitest";
import seido from "@/data/seido/kougaku-iryou-kaigo-gassan.json";
import {
  calcKougakuGassan,
  groupTiers,
  limitFor,
  MINIMUM_MEDICAL_COST,
  MINIMUM_PAYMENT,
  resolveGroup,
} from "@/components/tools/impl/KougakuIryouKaigoGassan.calc";

/** 仕様書 specs/s-tools/11-kougaku-iryou-kaigo-gassan.md のテストケース表を反映 */

describe("KougakuIryouKaigoGassan.calc — 区分と限度額", () => {
  it("#1 支給基準額501円・医療下限21,000円はJSON由来", () => {
    expect(MINIMUM_PAYMENT).toBe(seido.data.calculationRules.minimumPayment.value);
    expect(MINIMUM_PAYMENT).toBe(501);
    expect(MINIMUM_MEDICAL_COST).toBe(21000);
  });

  it("#2 保険種別・年齢からグループを解決（後期高齢は常に70plus）", () => {
    expect(resolveGroup("kenpo", false)).toBe("kenpoUnder70");
    expect(resolveGroup("kenpo", true)).toBe("kenpo70plus");
    expect(resolveGroup("kokuho", false)).toBe("kokuhoUnder70");
    expect(resolveGroup("kokuho", true)).toBe("kokuho70plus");
    expect(resolveGroup("kourei", false)).toBe("kourei70plus");
    expect(resolveGroup("kourei", true)).toBe("kourei70plus");
  });

  it("#3 限度額はJSONの各tierと一致（国保70+一般=56万円）", () => {
    expect(limitFor("kokuho70plus", "ippan")).toBe(560000);
    expect(limitFor("kourei70plus", "teishotoku-1")).toBe(190000);
    expect(limitFor("kenpoUnder70", "ku-a")).toBe(2120000);
  });

  it("#4 存在しないtierはnull", () => {
    expect(limitFor("kokuho70plus", "no-such")).toBeNull();
  });

  it("#5 groupTiers は5〜6区分を返す", () => {
    expect(groupTiers("kenpoUnder70")).toHaveLength(5);
    expect(groupTiers("kokuho70plus")).toHaveLength(6);
  });
});

describe("KougakuIryouKaigoGassan.calc — 支給額と按分", () => {
  it("#6 国保70+一般・医療40万＋介護30万 → 超過14万・按分（医療8万／介護6万）", () => {
    const r = calcKougakuGassan({
      group: "kokuho70plus",
      tierKey: "ippan",
      annualMedical: 400000,
      annualKaigo: 300000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.combined).toBe(700000);
    expect(r.excess).toBe(140000);
    expect(r.paid).toBe(true);
    expect(r.totalRefund).toBe(140000);
    expect(r.medicalPortion).toBe(80000);
    expect(r.kaigoPortion).toBe(60000);
  });

  it("#7 按分は端数を介護側に寄せて総額を保つ", () => {
    const r = calcKougakuGassan({
      group: "kokuho70plus",
      tierKey: "ippan",
      annualMedical: 300001,
      annualKaigo: 300000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.medicalPortion + r.kaigoPortion).toBe(r.totalRefund);
  });

  it("#8 合算しても基準額以下なら不支給", () => {
    const r = calcKougakuGassan({
      group: "kenpoUnder70",
      tierKey: "ku-u", // 67万円
      annualMedical: 500000,
      annualKaigo: 100000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.excess).toBeLessThan(0);
    expect(r.paid).toBe(false);
    expect(r.totalRefund).toBe(0);
  });
});

describe("KougakuIryouKaigoGassan.calc — 両方負担が必要・支給基準額", () => {
  it("#9 介護の自己負担が0円なら医療単独で限度超でも不支給（bothRequired）", () => {
    const r = calcKougakuGassan({
      group: "kokuho70plus",
      tierKey: "ippan",
      annualMedical: 800000,
      annualKaigo: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bothPresent).toBe(false);
    expect(r.paid).toBe(false);
  });

  it("#10 医療の自己負担が0円なら不支給", () => {
    const r = calcKougakuGassan({
      group: "kokuho70plus",
      tierKey: "ippan",
      annualMedical: 0,
      annualKaigo: 800000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.paid).toBe(false);
  });

  it("#11 超過額が501円未満は不支給（例: 超過500円）", () => {
    const r = calcKougakuGassan({
      group: "kokuho70plus",
      tierKey: "ippan", // 56万
      annualMedical: 560300,
      annualKaigo: 200,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.excess).toBe(500);
    expect(r.paid).toBe(false);
  });

  it("#12 超過額が501円ちょうどは支給", () => {
    const r = calcKougakuGassan({
      group: "kokuho70plus",
      tierKey: "ippan",
      annualMedical: 560301,
      annualKaigo: 200,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.excess).toBe(MINIMUM_PAYMENT);
    expect(r.paid).toBe(true);
    expect(r.totalRefund).toBe(501);
  });
});

describe("KougakuIryouKaigoGassan.calc — バリデーション", () => {
  it("#13 医療自己負担がマイナスはエラー", () => {
    expect(
      calcKougakuGassan({ group: "kokuho70plus", tierKey: "ippan", annualMedical: -1, annualKaigo: 100 }).ok,
    ).toBe(false);
  });

  it("#14 介護自己負担がマイナスはエラー", () => {
    expect(
      calcKougakuGassan({ group: "kokuho70plus", tierKey: "ippan", annualMedical: 100, annualKaigo: -1 }).ok,
    ).toBe(false);
  });

  it("#15 不正なtierはエラー", () => {
    expect(
      calcKougakuGassan({ group: "kokuho70plus", tierKey: "x", annualMedical: 100, annualKaigo: 100 }).ok,
    ).toBe(false);
  });

  it("#16 高所得区分（212万円）は限度が高く払い戻しが出にくい", () => {
    const r = calcKougakuGassan({
      group: "kenpoUnder70",
      tierKey: "ku-a", // 212万
      annualMedical: 1000000,
      annualKaigo: 1000000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.limit).toBe(2120000);
    expect(r.paid).toBe(false); // 200万 < 212万
  });

  it("#17 低所得区分（19万円）は限度が低く払い戻しが出やすい", () => {
    const r = calcKougakuGassan({
      group: "kourei70plus",
      tierKey: "teishotoku-1", // 19万
      annualMedical: 150000,
      annualKaigo: 150000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalRefund).toBe(300000 - 190000);
    expect(r.paid).toBe(true);
  });
});

describe("KougakuIryouKaigoGassan.calc — ハードコード禁止", () => {
  it("#18 全グループの限度額がJSON由来と一致する", () => {
    for (const g of [
      "kenpoUnder70",
      "kenpo70plus",
      "kokuhoUnder70",
      "kokuho70plus",
      "kourei70plus",
    ] as const) {
      const tiers = seido.data.brackets[g].tiers;
      for (const t of tiers) {
        expect(limitFor(g, t.key)).toBe(t.limit);
      }
    }
  });
});
