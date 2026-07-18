import { describe, expect, it } from "vitest";
import {
  calcIryouhiKoujo,
  validateIryouhiKoujoInput,
  fmtYen,
  MAX_DEDUCTION,
  THRESHOLD_FIXED,
  THRESHOLD_RATE,
  THRESHOLD_SWITCH_INCOME,
  SELF_MEDICATION_THRESHOLD,
  SELF_MEDICATION_MAX_DEDUCTION,
  SELF_MEDICATION_IS_EXCLUSIVE_CHOICE,
  SHUSSAN_TEATEKIN_SHOULD_DEDUCT,
  PER_EXPENSE_LIMIT_RULE_NOTE,
  ELIGIBLE_ITEMS,
  KOSODATE_BOOLEAN_TOPICS,
  KOSODATE_CONDITIONAL_TOPICS,
  EXCLUDED_ITEMS,
  type IryouhiKoujoInput,
} from "@/components/tools/impl/IryouhiKoujoKodomo.calc";
import rawSeido from "@/data/seido/iryouhi-koujo-kodomo.json";

/** 仕様書 specs/b-tools/p3-t04-iryouhi-koujo-kodomo.md のテストケース表を反映 */

const TODAY = "2026-07-18"; // 基準日（データのasOfと同じ。expiresOn=2026-12-31より前）

function input(overrides: Partial<IryouhiKoujoInput> = {}): IryouhiKoujoInput {
  return {
    otherMedicalExpenses: 0,
    shussanHiyou: 0,
    shussanIchijikin: 0,
    otherReimbursement: 0,
    totalIncome: 0,
    otcExpenses: 0,
    ...overrides,
  };
}

function calc(overrides: Partial<IryouhiKoujoInput> = {}, today = TODAY) {
  const r = calcIryouhiKoujo(input(overrides), today);
  if (!r.ok) throw new Error(`expected ok result but got: ${JSON.stringify(r)}`);
  return r;
}

describe("IryouhiKoujoKodomo.calc — 控除額の基本計算", () => {
  it("#1 医療費30万円・補てんなし・総所得300万円（10万円足切り）", () => {
    const r = calc({ otherMedicalExpenses: 300_000, totalIncome: 3_000_000 });
    expect(r.threshold).toBe(100_000);
    expect(r.deductionAmount).toBe(200_000);
    expect(r.isLowIncomeBracket).toBe(false);
  });

  it("#2 総所得ちょうど200万円は5%と10万円が一致する境界値", () => {
    const r = calc({ otherMedicalExpenses: 300_000, totalIncome: 2_000_000 });
    expect(r.threshold).toBe(100_000);
    expect(r.isLowIncomeBracket).toBe(false); // 200万円ちょうどは「未満」に該当しない
  });

  it("#3 総所得100万円は5%基準（10万円より低い足切り）", () => {
    const r = calc({ otherMedicalExpenses: 300_000, totalIncome: 1_000_000 });
    expect(r.threshold).toBe(50_000);
    expect(r.isLowIncomeBracket).toBe(true);
    expect(r.deductionAmount).toBe(250_000);
  });

  it("#4 総所得500万円は10万円固定足切り", () => {
    const r = calc({ otherMedicalExpenses: 300_000, totalIncome: 5_000_000 });
    expect(r.threshold).toBe(100_000);
    expect(r.isLowIncomeBracket).toBe(false);
  });

  it("#5 医療費が足切り額以下なら控除額は0円", () => {
    const r = calc({ otherMedicalExpenses: 50_000, totalIncome: 5_000_000 });
    expect(r.deductionAmount).toBe(0);
  });
});

describe("IryouhiKoujoKodomo.calc — 補てん額の個別対応（按分）", () => {
  it("#6 出産育児一時金が出産費用を上回っても余りは他の医療費に波及しない", () => {
    const r = calc({
      shussanHiyou: 450_000,
      shussanIchijikin: 500_000,
      otherMedicalExpenses: 200_000,
      totalIncome: 5_000_000,
    });
    expect(r.shussanCompensationApplied).toBe(450_000);
    expect(r.shussanIchijikinExcess).toBe(50_000);
    expect(r.otherCompensationApplied).toBe(0);
    // 出産費用は全額相殺（0円）、出産費用以外の20万円だけが差引後の医療費として残る
    expect(r.netMedicalExpense).toBe(200_000);
  });

  it("#7 出産費用が出産育児一時金を上回る場合は差額が控除対象に残る", () => {
    const r = calc({
      shussanHiyou: 500_000,
      shussanIchijikin: 450_000,
      totalIncome: 5_000_000,
    });
    expect(r.shussanCompensationApplied).toBe(450_000);
    expect(r.shussanIchijikinExcess).toBe(0);
    expect(r.netMedicalExpense).toBe(50_000);
  });

  it("#8 出産費用以外への補てん額が対応する医療費を上回っても他へ波及しない", () => {
    const r = calc({
      otherMedicalExpenses: 100_000,
      otherReimbursement: 300_000,
      shussanHiyou: 400_000,
      shussanIchijikin: 0,
      totalIncome: 5_000_000,
    });
    expect(r.otherCompensationApplied).toBe(100_000);
    expect(r.otherReimbursementExcess).toBe(200_000);
    // 出産費用400,000円はそのまま残り、出産費用以外は0円に相殺される
    expect(r.netMedicalExpense).toBe(400_000);
  });

  it("#9 出産手当金は差し引く必要がない制度であることがデータに明記されている", () => {
    expect(SHUSSAN_TEATEKIN_SHOULD_DEDUCT).toBe(false);
  });
});

describe("IryouhiKoujoKodomo.calc — 200万円の上限", () => {
  it("#10 控除額が上限を超える場合は200万円で頭打ちになる", () => {
    const r = calc({ otherMedicalExpenses: 2_500_000, totalIncome: 5_000_000 });
    expect(r.deductionBeforeCap).toBe(2_400_000);
    expect(r.deductionAmount).toBe(2_000_000);
    expect(r.isCapped).toBe(true);
  });

  it("#11 控除額がちょうど200万円ならisCappedはfalse（超えてはいない）", () => {
    const r = calc({ otherMedicalExpenses: 2_100_000, totalIncome: 5_000_000 });
    expect(r.deductionBeforeCap).toBe(2_000_000);
    expect(r.deductionAmount).toBe(2_000_000);
    expect(r.isCapped).toBe(false);
  });
});

describe("IryouhiKoujoKodomo.calc — 入力バリデーション", () => {
  it("#12 負の医療費はエラー", () => {
    const v = validateIryouhiKoujoInput(input({ otherMedicalExpenses: -1000 }));
    expect(v.ok).toBe(false);
  });

  it("#13 非数値（NaN）の入力はエラー", () => {
    const v = validateIryouhiKoujoInput(input({ shussanIchijikin: NaN }));
    expect(v.ok).toBe(false);
  });

  it("#14 総所得金額等が負数の場合はエラー", () => {
    const v = validateIryouhiKoujoInput(input({ totalIncome: -1 }));
    expect(v.ok).toBe(false);
  });

  it("#15 calcIryouhiKoujoもバリデーションエラーをそのまま返す", () => {
    const r = calcIryouhiKoujo(input({ otherMedicalExpenses: -1 }), TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok && !r.expired) {
      expect(r.error).toContain("0円以上");
    } else {
      throw new Error("expected validation error result");
    }
  });
});

describe("IryouhiKoujoKodomo.calc — セルフメディケーション税制（選択制）", () => {
  it("#16 購入費がちょうど12,000円は対象外（『超える』に該当しない）", () => {
    const r = calc({ otcExpenses: 12_000 });
    expect(r.selfMedicationEligible).toBe(false);
    expect(r.selfMedicationDeduction).toBe(0);
  });

  it("#17 購入費12,001円は1円が対象", () => {
    const r = calc({ otcExpenses: 12_001 });
    expect(r.selfMedicationEligible).toBe(true);
    expect(r.selfMedicationDeduction).toBe(1);
  });

  it("#18 購入費が高額でも控除限度額88,000円で頭打ち", () => {
    const r = calc({ otcExpenses: 200_000 });
    expect(r.selfMedicationDeduction).toBe(88_000);
  });

  it("#19 控除額が0円・セルフメディケーションも0円ならrecommendedChoiceは'none'", () => {
    const r = calc({ totalIncome: 3_000_000 });
    expect(r.deductionAmount).toBe(0);
    expect(r.selfMedicationDeduction).toBe(0);
    expect(r.recommendedChoice).toBe("none");
  });

  it("#20 通常の医療費控除額とセルフメディケーション控除額が同額なら'either'", () => {
    const r = calc({
      otherMedicalExpenses: 150_000,
      totalIncome: 2_000_000, // threshold = 100,000
      otcExpenses: 62_000, // (62,000-12,000) = 50,000
    });
    expect(r.deductionAmount).toBe(50_000);
    expect(r.selfMedicationDeduction).toBe(50_000);
    expect(r.recommendedChoice).toBe("either");
  });

  it("#21 通常の医療費控除額の方が大きい場合は'normal'", () => {
    const r = calc({
      otherMedicalExpenses: 500_000,
      totalIncome: 2_000_000,
      otcExpenses: 50_000,
    });
    expect(r.deductionAmount).toBe(400_000);
    expect(r.selfMedicationDeduction).toBe(38_000);
    expect(r.recommendedChoice).toBe("normal");
  });

  it("#22 セルフメディケーション控除額の方が大きい場合は'selfMedication'", () => {
    const r = calc({
      otherMedicalExpenses: 150_000,
      totalIncome: 2_000_000,
      otcExpenses: 150_000,
    });
    expect(r.deductionAmount).toBe(50_000);
    expect(r.selfMedicationDeduction).toBe(88_000);
    expect(r.recommendedChoice).toBe("selfMedication");
  });

  it("#23 選択制（併用不可）であることがデータに明記されている", () => {
    expect(SELF_MEDICATION_IS_EXCLUSIVE_CHOICE).toBe(true);
  });
});

describe("IryouhiKoujoKodomo.calc — セルフメディケーション税制の適用期限（データ期限切れ）", () => {
  it("#24 期限日（2026-12-31）当日はまだ有効", () => {
    const r = calcIryouhiKoujo(input({ otherMedicalExpenses: 300_000, totalIncome: 3_000_000 }), "2026-12-31");
    expect(r.ok).toBe(true);
  });

  it("#25 期限翌日（2027-01-01）以降はデータ更新待ちとして計算を停止する", () => {
    const r = calcIryouhiKoujo(input({ otherMedicalExpenses: 300_000, totalIncome: 3_000_000 }), "2027-01-01");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.expired).toBe(true);
    }
  });
});

describe("IryouhiKoujoKodomo.calc — SSOTデータとの整合（ハードコード禁止の検査）", () => {
  it("MAX_DEDUCTION・THRESHOLD_FIXED・THRESHOLD_RATE・THRESHOLD_SWITCH_INCOMEはJSONの値と一致する", () => {
    expect(MAX_DEDUCTION).toBe(rawSeido.data.calculation.maxDeduction.value);
    expect(THRESHOLD_FIXED).toBe(rawSeido.data.calculation.thresholdFixed.value);
    expect(THRESHOLD_RATE).toBe(rawSeido.data.calculation.thresholdRate.value);
    expect(THRESHOLD_SWITCH_INCOME).toBe(rawSeido.data.calculation.thresholdSwitchIncome.value);
    expect(MAX_DEDUCTION).toBe(2_000_000);
  });

  it("thresholdSwitchIncome（200万円）はthresholdFixed÷thresholdRateと数学的に一致する", () => {
    expect(THRESHOLD_FIXED / THRESHOLD_RATE).toBe(THRESHOLD_SWITCH_INCOME);
  });

  it("セルフメディケーション税制の定数はJSONの値と一致する", () => {
    expect(SELF_MEDICATION_THRESHOLD).toBe(rawSeido.data.selfMedication.threshold.value);
    expect(SELF_MEDICATION_MAX_DEDUCTION).toBe(rawSeido.data.selfMedication.maxDeduction.value);
  });

  it("補てん額の個別対応ルールの文言はJSONからそのまま引用されている（ハードコードしていない）", () => {
    expect(PER_EXPENSE_LIMIT_RULE_NOTE).toBe(rawSeido.data.compensationDeduction.perExpenseLimitRule.value);
    expect(PER_EXPENSE_LIMIT_RULE_NOTE).toContain("他の医療費からは差し引かない");
  });

  it("対象となる医療費の類型は12件、対象外は4件、子育て論点は真偽値9件・条件文2件をすべてデータから読み込んでいる", () => {
    expect(ELIGIBLE_ITEMS).toHaveLength(12);
    expect(EXCLUDED_ITEMS).toHaveLength(4);
    expect(KOSODATE_BOOLEAN_TOPICS).toHaveLength(9);
    expect(KOSODATE_CONDITIONAL_TOPICS).toHaveLength(2);
  });

  it("対象となる医療費の類型のうち関連度highは4件（診療・医薬品・分べん介助・通院費）", () => {
    const highCount = ELIGIBLE_ITEMS.filter((i) => i.relevance === "high").length;
    expect(highCount).toBe(4);
  });

  it("子育て論点の真偽値はJSONの値とすべて一致する", () => {
    const KT = rawSeido.data.kosodateTopics;
    const byKey = new Map(KOSODATE_BOOLEAN_TOPICS.map((t) => [t.key, t.isEligible]));
    expect(byKey.get("shussanTeikikenshin")).toBe(KT.shussanTeikikenshin.value);
    expect(byKey.get("jikkaKisei")).toBe(KT.jikkaKisei.value);
    expect(byKey.get("minomawarihin")).toBe(KT.minomawarihin.value);
    expect(byKey.get("funinChiryou")).toBe(KT.funinChiryou.value);
  });
});

describe("IryouhiKoujoKodomo.calc — fmtYen", () => {
  it("千円区切りで円表示する", () => {
    expect(fmtYen(1_234_567)).toBe("1,234,567");
  });

  it("小数は四捨五入する", () => {
    expect(fmtYen(1000.6)).toBe("1,001");
  });
});
