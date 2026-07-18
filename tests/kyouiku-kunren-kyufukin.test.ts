import { describe, expect, it } from "vitest";
import {
  calculateKyouikuKunrenKyufukin,
  evaluateKyouikuKunrenKyufukin,
  isShienKyufukinProvisionalExpired,
  IPPAN_BENEFIT_RATE,
  IPPAN_BENEFIT_CAP,
  IPPAN_ELIGIBILITY_YEARS,
  IPPAN_ELIGIBILITY_YEARS_FIRST_TIME,
  TOKUTEI_IPPAN_BENEFIT_RATE,
  TOKUTEI_IPPAN_BENEFIT_CAP,
  TOKUTEI_IPPAN_BENEFIT_RATE_AFTER,
  TOKUTEI_IPPAN_BENEFIT_CAP_AFTER,
  TOKUTEI_IPPAN_ELIGIBILITY_YEARS,
  SENMON_JISSEN_ELIGIBILITY_YEARS,
  SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME,
  MINIMUM_BENEFIT_AMOUNT,
  LEAVER_GRACE_YEARS,
  type CategoryKey,
} from "@/components/tools/impl/KyouikuKunrenKyufukin.calc";

/*
 * 資格・学び直し 費用と給付金（教育訓練給付）チェック（P3-T03）のテスト。
 * 制度データは data/seido/kyouiku-kunren-kyufukin.json を正とする。
 * テストケース表は specs/b-tools/p3-t03-kyouiku-kunren-kyufukin.md と対応する。
 */

function statusOf(result: ReturnType<typeof evaluateKyouikuKunrenKyufukin>, key: CategoryKey) {
  return result.categories.find((c) => c.key === key)!.status;
}

const TODAY_IN_FORCE = "2026-07-18"; // 教育訓練支援給付金の暫定措置期限（2027-03-31）より前

describe("calculateKyouikuKunrenKyufukin", () => {
  it("#1 被保険者期間が全区分の要件を満たす通常ケース（在職中・通算3年・講座わからない）", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "ippan")).toBe("target");
    expect(statusOf(r.result, "tokuteiIppan")).toBe("target");
    expect(statusOf(r.result, "senmonJissen")).toBe("target");
    // 教育訓練支援給付金は在職中のため対象外（専門実践の要件は満たしていても失業状態でない）
    expect(statusOf(r.result, "shienKyufukin")).toBe("notTarget");
    // 教育訓練休暇給付金は在職中・被保険者期間3年（>=1年の近似要件①を満たす）で対象
    expect(statusOf(r.result, "kyuukaKyufukin")).toBe("target");
  });

  it("#2 被保険者期間が短く全区分の要件を満たさない場合は対象外（anyTarget=false）", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 0.5,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "ippan")).toBe("notTarget");
    expect(statusOf(r.result, "tokuteiIppan")).toBe("notTarget");
    expect(statusOf(r.result, "senmonJissen")).toBe("notTarget");
    expect(statusOf(r.result, "kyuukaKyufukin")).toBe("notTarget");
    expect(r.result.anyTarget).toBe(false);
  });

  it(`#3 初めて受給する場合、一般・特定一般は${IPPAN_ELIGIBILITY_YEARS_FIRST_TIME}年で対象になるが専門実践は対象外（境界値: ${IPPAN_ELIGIBILITY_YEARS_FIRST_TIME}年）`, () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: IPPAN_ELIGIBILITY_YEARS_FIRST_TIME,
      isFirstTime: true,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "ippan")).toBe("target");
    expect(statusOf(r.result, "tokuteiIppan")).toBe("target");
    // 専門実践の初回要件（SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME=2年）は満たさない
    expect(statusOf(r.result, "senmonJissen")).toBe("notTarget");
  });

  it(`#4 専門実践は初めて受給する場合${SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME}年で境界を満たす`, () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME,
      isFirstTime: true,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "senmonJissen")).toBe("target");
  });

  it(`#5 初めてでない場合は通算${TOKUTEI_IPPAN_ELIGIBILITY_YEARS}年未満だと特定一般は対象外（初回特例が使えない）`, () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 2,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "tokuteiIppan")).toBe("notTarget");
  });

  it(`#6 離職者は猶予期間（${LEAVER_GRACE_YEARS}年）以内なら一般・特定一般・専門実践すべて対象`, () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "leftJob",
      monthsSinceLeaving: LEAVER_GRACE_YEARS * 12,
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "ippan")).toBe("target");
    expect(statusOf(r.result, "tokuteiIppan")).toBe("target");
    expect(statusOf(r.result, "senmonJissen")).toBe("target");
  });

  it(`#7 離職者は猶予期間（${LEAVER_GRACE_YEARS}年）を1か月でも超えると一般・特定一般・専門実践すべて対象外`, () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "leftJob",
      monthsSinceLeaving: LEAVER_GRACE_YEARS * 12 + 1,
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "ippan")).toBe("notTarget");
    expect(statusOf(r.result, "tokuteiIppan")).toBe("notTarget");
    expect(statusOf(r.result, "senmonJissen")).toBe("notTarget");
    const ippan = r.result.categories.find((c) => c.key === "ippan")!;
    expect(ippan.notes.join("")).toMatch(/離職/);
  });

  it("#8 講座の種類を一般教育訓練に指定すると、特定一般・専門実践は「対象区分外」になる", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "ippan",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "ippan")).toBe("target");
    expect(statusOf(r.result, "tokuteiIppan")).toBe("notApplicable");
    expect(statusOf(r.result, "senmonJissen")).toBe("notApplicable");
    expect(statusOf(r.result, "shienKyufukin")).toBe("notApplicable");
  });

  it("#9 専門実践を選択し離職・被保険者期間3年なら教育訓練支援給付金も対象になる", () => {
    const r = calculateKyouikuKunrenKyufukin(
      {
        insuredYears: 3,
        isFirstTime: false,
        employmentStatus: "leftJob",
        monthsSinceLeaving: 3,
        courseType: "senmonJissen",
      },
      TODAY_IN_FORCE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "senmonJissen")).toBe("target");
    expect(statusOf(r.result, "shienKyufukin")).toBe("target");
  });

  it("#10 専門実践を受講予定でも在職中なら教育訓練支援給付金は対象外", () => {
    const r = calculateKyouikuKunrenKyufukin(
      {
        insuredYears: 3,
        isFirstTime: false,
        employmentStatus: "employed",
        courseType: "senmonJissen",
      },
      TODAY_IN_FORCE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "shienKyufukin")).toBe("notTarget");
  });

  it("#11 教育訓練支援給付金の暫定措置の期限（2027-03-31）を過ぎると対象外になる", () => {
    const input = {
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "leftJob" as const,
      monthsSinceLeaving: 3,
      courseType: "senmonJissen" as const,
    };
    const before = calculateKyouikuKunrenKyufukin(input, "2027-03-31");
    const after = calculateKyouikuKunrenKyufukin(input, "2027-04-01");
    expect(before.ok).toBe(true);
    expect(after.ok).toBe(true);
    if (!before.ok || !after.ok) return;
    expect(statusOf(before.result, "shienKyufukin")).toBe("target");
    expect(statusOf(after.result, "shienKyufukin")).toBe("notTarget");
  });

  it("#12 isShienKyufukinProvisionalExpired はJSONのexpiresOnを基準に判定する", () => {
    expect(isShienKyufukinProvisionalExpired("2027-03-31")).toBe(false);
    expect(isShienKyufukinProvisionalExpired("2027-04-01")).toBe(true);
  });

  it("#13 教育訓練休暇給付金は離職者では対象外（在職者向けの給付）", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 10,
      isFirstTime: false,
      employmentStatus: "leftJob",
      monthsSinceLeaving: 1,
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kyuukaKyufukin")).toBe("notTarget");
  });

  it("#14 教育訓練休暇給付金は要件②（5年以上）だけを満たしても対象になる", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 5,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kyuukaKyufukin")).toBe("target");
  });

  it("#15 教育訓練休暇給付金は要件①・②のいずれも満たさないと対象外（0.9年）", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 0.9,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kyuukaKyufukin")).toBe("notTarget");
  });

  it("#16 一般教育訓練の概算給付額は給付率・上限額がJSONの値と一致する（受講費用100万円→上限10万円）", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "ippan",
      trainingCost: 1_000_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ippan = r.result.categories.find((c) => c.key === "ippan")!;
    expect(IPPAN_BENEFIT_RATE).toBe(0.2);
    expect(IPPAN_BENEFIT_CAP).toBe(100_000);
    expect(ippan.estimatedBenefit).toBe(IPPAN_BENEFIT_CAP);
  });

  it("#17 一般教育訓練の受講費用が少額だと支給下限額（4,000円）以下で0円になる", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "ippan",
      trainingCost: 10_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ippan = r.result.categories.find((c) => c.key === "ippan")!;
    // 10,000円 × 20% = 2,000円 <= 4,000円（MINIMUM_BENEFIT_AMOUNT）のため支給されない
    expect(2_000).toBeLessThanOrEqual(MINIMUM_BENEFIT_AMOUNT);
    expect(ippan.estimatedBenefit).toBe(0);
    expect(ippan.notes.join("")).toMatch(/4[,，]?000円/);
  });

  it("#18 特定一般教育訓練の概算給付額は基本40%と資格取得後50%の両方がJSONの値と一致する", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "tokuteiIppan",
      trainingCost: 500_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const tokutei = r.result.categories.find((c) => c.key === "tokuteiIppan")!;
    expect(TOKUTEI_IPPAN_BENEFIT_RATE).toBe(0.4);
    expect(TOKUTEI_IPPAN_BENEFIT_CAP).toBe(200_000);
    expect(TOKUTEI_IPPAN_BENEFIT_RATE_AFTER).toBe(0.5);
    expect(TOKUTEI_IPPAN_BENEFIT_CAP_AFTER).toBe(250_000);
    expect(tokutei.estimatedBenefit).toBe(TOKUTEI_IPPAN_BENEFIT_CAP);
    expect(tokutei.notes.join("")).toMatch(/25万|250,000円|250000円/);
  });

  it("#19 専門実践教育訓練は受講費用を入力しても概算給付額を計算しない（複雑な精算方式のため）", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      courseType: "senmonJissen",
      trainingCost: 1_000_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const senmon = r.result.categories.find((c) => c.key === "senmonJissen")!;
    expect(senmon.estimatedBenefit).toBeUndefined();
    expect(senmon.notes.join("")).toMatch(/概算給付額の計算は行っていません/);
  });

  it("#20 evaluateKyouikuKunrenKyufukin は5件の結果を常に同じ順序・キーで返す", () => {
    const result = evaluateKyouikuKunrenKyufukin({
      insuredYears: 3,
      isFirstTime: false,
      employmentStatus: "employed",
      monthsSinceLeaving: 0,
      courseType: "unsure",
    });
    expect(result.categories.map((c) => c.key)).toEqual([
      "ippan",
      "tokuteiIppan",
      "senmonJissen",
      "shienKyufukin",
      "kyuukaKyufukin",
    ]);
  });

  it("#21 被保険者期間の未入力は入力エラー", () => {
    const r = calculateKyouikuKunrenKyufukin({
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/被保険者期間/);
  });

  it("#22 在職/離職の未選択は入力エラー", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      courseType: "unsure",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/在職|離職/);
  });

  it("#23 離職者なのに経過期間未入力は入力エラー", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      employmentStatus: "leftJob",
      courseType: "unsure",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/経過期間/);
  });

  it("#24 講座の種類の未選択は入力エラー", () => {
    const r = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      employmentStatus: "employed",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/講座/);
  });

  it("#25 被保険者期間・受講費用に負の値を入れると入力エラー", () => {
    const negativeYears = calculateKyouikuKunrenKyufukin({
      insuredYears: -1,
      employmentStatus: "employed",
      courseType: "unsure",
    });
    expect(negativeYears.ok).toBe(false);

    const negativeCost = calculateKyouikuKunrenKyufukin({
      insuredYears: 3,
      employmentStatus: "employed",
      courseType: "unsure",
      trainingCost: -100,
    });
    expect(negativeCost.ok).toBe(false);
  });
});
