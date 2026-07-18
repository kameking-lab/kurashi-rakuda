import { describe, expect, it } from "vitest";
import seido from "@/data/seido/jidou-fuyou-teate.json";
import {
  ADDITIONAL_CHILD_FULL,
  ADDITIONAL_CHILD_PARTIAL_MIN,
  calcJidouFuyouTeate,
  CHILD_SUPPORT_INCOME_RATE,
  FIRST_CHILD_FULL,
  FIRST_CHILD_PARTIAL_MAX,
  FIRST_CHILD_PARTIAL_MIN,
  INCREMENT_PER_ADDITIONAL_DEPENDENT,
  limitsForDependents,
  MONTHS_PER_PAYMENT,
  partialAdditionalChild,
  partialFirstChild,
  roundTo10,
} from "@/components/tools/impl/JidouFuyouTeate.calc";

/** 仕様書 specs/s-tools/08-jidou-fuyou-teate.md のテストケース表を反映 */

describe("JidouFuyouTeate.calc — 支給区分の判定", () => {
  it("#1 児童1人・所得0・扶養0 → 全部支給48,050円/月・年576,600円・1回96,100円", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: 0, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("full");
    expect(r.totalMonthly).toBe(48050);
    expect(r.totalAnnual).toBe(576600);
    expect(r.perPaymentAmount).toBe(96100);
  });

  it("#2 児童3人・全部支給 → 48,050＋11,350×2＝70,750円/月", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 3, recipientIncome: 0, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalMonthly).toBe(70750);
  });

  it("#3 児童2人・全部支給 → 48,050＋11,350＝59,400円/月", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 2, recipientIncome: 0, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalMonthly).toBe(59400);
  });

  it("#4 扶養0・所得＝全部支給限度額69万円ちょうど → 一部支給（本体48,040円・上限）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: 690000, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("partial");
    expect(r.firstChildAmount).toBe(FIRST_CHILD_PARTIAL_MAX);
    expect(r.firstChildAmount).toBe(48040);
  });

  it("#5 扶養0・所得689,999円（限度額未満） → 全部支給", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: 689999, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("full");
  });

  it("#6 扶養0・所得＝一部支給限度額208万円ちょうど → 全部支給停止（0円）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 2, recipientIncome: 2080000, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("fullStop");
    expect(r.totalMonthly).toBe(0);
  });

  it("#7 扶養0・所得2,079,999円（限度額の1円下） → 一部支給・下限（本体11,340円・加算5,680円）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 2, recipientIncome: 2079999, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("partial");
    expect(r.firstChildAmount).toBe(FIRST_CHILD_PARTIAL_MIN);
    expect(r.additionalChildAmount).toBe(ADDITIONAL_CHILD_PARTIAL_MIN);
  });

  it("#8 扶養0・所得100万円・児童2人 → 一部支給（本体39,860＋加算10,080＝49,940円/月）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 2, recipientIncome: 1000000, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("partial");
    expect(r.firstChildAmount).toBe(39860);
    expect(r.additionalChildAmount).toBe(10080);
    expect(r.totalMonthly).toBe(49940);
  });

  it("#9 扶養1・所得150万円・児童3人 → 一部支給（本体36,690＋加算9,590×2＝55,870円/月）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 3, recipientIncome: 1500000, dependentsCount: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("partial");
    expect(r.firstChildAmount).toBe(36690);
    expect(r.additionalChildAmount).toBe(9590);
    expect(r.totalMonthly).toBe(55870);
  });
});

describe("JidouFuyouTeate.calc — 所得制限限度額表", () => {
  it("#10 扶養0〜3人の限度額はデータ表と一致する", () => {
    expect(limitsForDependents(0)).toEqual({
      fullPayment: 690000,
      partialPayment: 2080000,
      dependentObligor: 2360000,
    });
    expect(limitsForDependents(1).fullPayment).toBe(1070000);
    expect(limitsForDependents(2).fullPayment).toBe(1450000);
    expect(limitsForDependents(3).fullPayment).toBe(1830000);
  });

  it("#11 扶養4人＝3人＋38万円加算", () => {
    const l3 = limitsForDependents(3);
    const l4 = limitsForDependents(4);
    expect(l4.fullPayment).toBe(l3.fullPayment + INCREMENT_PER_ADDITIONAL_DEPENDENT);
    expect(l4.partialPayment).toBe(l3.partialPayment + INCREMENT_PER_ADDITIONAL_DEPENDENT);
    expect(l4.dependentObligor).toBe(l3.dependentObligor + INCREMENT_PER_ADDITIONAL_DEPENDENT);
  });

  it("#12 扶養5人＝3人＋38万円×2加算", () => {
    const l3 = limitsForDependents(3);
    const l5 = limitsForDependents(5);
    expect(l5.fullPayment).toBe(l3.fullPayment + INCREMENT_PER_ADDITIONAL_DEPENDENT * 2);
  });
});

describe("JidouFuyouTeate.calc — 扶養義務者・養育費・年金", () => {
  it("#13 扶養義務者の所得が限度額以上 → 本人の所得が低くても支給停止（obligorStop）", () => {
    const r = calcJidouFuyouTeate({
      childrenCount: 1,
      recipientIncome: 0,
      dependentsCount: 0,
      obligorIncome: 2360000, // dependentObligor 限度額ちょうど
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("obligorStop");
    expect(r.totalMonthly).toBe(0);
  });

  it("#14 扶養義務者の所得が限度額の1円下 → 支給停止にならない（全部支給）", () => {
    const r = calcJidouFuyouTeate({
      childrenCount: 1,
      recipientIncome: 0,
      dependentsCount: 0,
      obligorIncome: 2359999,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe("full");
  });

  it("#15 養育費は8割が所得に算入される（年額100万円 → 80万円加算）", () => {
    const r = calcJidouFuyouTeate({
      childrenCount: 1,
      recipientIncome: 300000,
      dependentsCount: 0,
      childSupportAnnual: 1000000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(CHILD_SUPPORT_INCOME_RATE).toBe(0.8);
    expect(r.childSupportIncluded).toBe(800000);
    expect(r.effectiveIncome).toBe(1100000);
  });

  it("#16 養育費8割の算入で全部支給から一部支給に切り替わる", () => {
    const base = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: 600000, dependentsCount: 0 });
    const withCs = calcJidouFuyouTeate({
      childrenCount: 1,
      recipientIncome: 600000,
      dependentsCount: 0,
      childSupportAnnual: 1000000, // +80万 → 実効140万 > 69万
    });
    expect(base.ok && withCs.ok).toBe(true);
    if (!base.ok || !withCs.ok) return;
    expect(base.status).toBe("full");
    expect(withCs.status).toBe("partial");
  });

  it("#17 公的年金受給フラグで併給調整の警告が立つ", () => {
    const r = calcJidouFuyouTeate({
      childrenCount: 1,
      recipientIncome: 0,
      dependentsCount: 0,
      receivingPension: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pensionAdjustmentWarning).toBe(true);
  });
});

describe("JidouFuyouTeate.calc — バリデーションと補助関数", () => {
  it("#18 児童0人はエラー", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 0, recipientIncome: 0, dependentsCount: 0 });
    expect(r.ok).toBe(false);
  });

  it("#19 所得がマイナスはエラー", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: -1, dependentsCount: 0 });
    expect(r.ok).toBe(false);
  });

  it("#20 養育費がマイナスはエラー", () => {
    const r = calcJidouFuyouTeate({
      childrenCount: 1,
      recipientIncome: 0,
      dependentsCount: 0,
      childSupportAnnual: -1,
    });
    expect(r.ok).toBe(false);
  });

  it("#21 扶養親族数がマイナスはエラー", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: 0, dependentsCount: -1 });
    expect(r.ok).toBe(false);
  });

  it("#22 児童数・扶養数は小数を切り捨てる（2.9→2人）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 2.9, recipientIncome: 0, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalMonthly).toBe(48050 + 11350); // 2人分
  });

  it("#23 roundTo10 は10円未満を四捨五入する", () => {
    expect(roundTo10(39855.1)).toBe(39860);
    expect(roundTo10(11334)).toBe(11330);
    expect(roundTo10(11335)).toBe(11340);
  });

  it("#24 partialFirstChild / partialAdditionalChild は下限・上限にクランプされる", () => {
    // 所得が限度額を大きく超える → 下限
    expect(partialFirstChild(9_999_999, 690000)).toBe(FIRST_CHILD_PARTIAL_MIN);
    expect(partialAdditionalChild(9_999_999, 690000)).toBe(ADDITIONAL_CHILD_PARTIAL_MIN);
    // 所得＝限度額 → 上限
    expect(partialFirstChild(690000, 690000)).toBe(FIRST_CHILD_PARTIAL_MAX);
  });

  it("#25 1回あたりの支給額は月額×2（2か月分をまとめて年6回）", () => {
    const r = calcJidouFuyouTeate({ childrenCount: 1, recipientIncome: 0, dependentsCount: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(MONTHS_PER_PAYMENT).toBe(2);
    expect(r.perPaymentAmount).toBe(r.totalMonthly * 2);
    expect(r.paymentMonths).toEqual([1, 3, 5, 7, 9, 11]);
  });
});

describe("JidouFuyouTeate.calc — ハードコード禁止（金額はJSON由来）", () => {
  it("#26 本体額・加算額はdata/seido/jidou-fuyou-teate.jsonと一致する", () => {
    expect(FIRST_CHILD_FULL).toBe(seido.data.monthlyAmounts.firstChildFull.value);
    expect(ADDITIONAL_CHILD_FULL).toBe(seido.data.monthlyAmounts.additionalChildFull.value);
    expect(FIRST_CHILD_PARTIAL_MIN).toBe(seido.data.monthlyAmounts.firstChildPartialMin.value);
  });
});
