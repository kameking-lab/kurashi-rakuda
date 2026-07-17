import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  simulate,
  judgeFutanWariai,
  resolveTanka,
  calcZaitaku,
  calcKougaku,
  selectKougakuBracket,
  adjustTaxableIncome,
  judgmentBaseYear,
  calcHojokyufu,
  judgeStage,
  resolvePeriod,
  shokuhiPerDay,
  kyojuhiPerDay,
  isStageChangingAtAug2026,
  stage2Stage3aBoundary,
  ninteiDefinition,
  kaigoHokenDataset,
  BASE_GRADE,
  BOUNDARY_STAGE2_3A_BEFORE_AUG2026,
  BOUNDARY_STAGE2_3A_FROM_AUG2026,
  HOJOKYUFU_EFFECTIVE_FROM,
  HIKAZEI_80MAN_THRESHOLD,
  YOUNG_DEPENDENT_UNDER16_DEDUCTION,
  YOUNG_DEPENDENT_16TO18_DEDUCTION,
  CARE_LEVELS,
  GENKAKU_BRACKETS,
  NO_STATE_DEFINITION,
  NINTEI_PROCESS,
  type KaigoInput,
} from "@/lib/tools/impl/kaigo-jikofutan";
import { amendmentEffectiveDate, isDataExpired } from "@/lib/tools/seido";
import raw from "@/data/seido/kaigo-hoken.json";

/**
 * specs/s-tools/05-kaigo-hoken-futan.md §6 のテストケース（T-01〜T-40）を実装。
 *
 * 期待値は仕様書の丸写しではなく、data/seido/kaigo-hoken.json の値からの
 * 導出（＝データの自己整合性の検算）として書いている。
 * 例: T-12 の 108,651円 は levels[key=yokaigo5].units × 10 × 3 ÷ 10 であり、
 * データ側の yenAt10 と一致していなければならない。
 */

const DATA = raw.data;
const B = (rate: number) => DATA.futanWariai.brackets.find((b) => b.rate === rate)!;
const LEVEL = (key: string) => DATA.kubunShikyuGendo.levels.find((l) => l.key === key)!;
const KB = (key: string) => DATA.kougakuKaigoServiceHi.brackets.find((b) => b.key === key)!;
const ROOM = (period: "beforeAug2026" | "fromAug2026", type: string) =>
  DATA.hojokyufu[period].kyojuhi.find((r) => r.type === type)!;

/** 前提: 65歳以上・単身・級地=その他・基準日 2026-07-01・滞在30日（仕様書 §6 の前提） */
const base: KaigoInput = {
  serviceDate: "2026-07-01",
  ageGroup: "age65plus",
  household: "single",
  careLevel: "yokaigo3",
  grade: BASE_GRADE.grade,
  totalIncome: 0,
  pensionPlusOtherIncome: 0,
  taxableIncome: 0,
  taxStatus: "taxed",
  youngDependents: { under16: 0, age16to18: 0 },
  isHouseholder: true,
  mode: "zaitaku",
  usedUnits: null,
  roomType: "ユニット型個室",
  stayDays: 30,
  isShortStay: false,
  savings: 0,
  hojokyufuIncome: 0,
};
const inp = (o: Partial<KaigoInput>): KaigoInput => ({ ...base, ...o });
const rate10 = (o: Partial<KaigoInput>) => judgeFutanWariai(inp(o)).rate10;

// ================================================================ 負担割合（★AND 条件★）

describe("★最重要★ 負担割合は AND 条件（specs §4 ステップ2・§5.1・§6.1）", () => {
  it("データの前提: 3割・2割のしきい値は JSON から読める（仕様書 §4 の実データ表）", () => {
    expect(B(0.3).totalIncomeMin).toBe(2_200_000);
    expect(B(0.3).pensionPlusOtherIncomeMinSingle).toBe(3_400_000);
    expect(B(0.3).pensionPlusOtherIncomeMinCouple).toBe(4_630_000);
    expect(B(0.2).totalIncomeMin).toBe(1_600_000);
    expect(B(0.2).pensionPlusOtherIncomeMinSingle).toBe(2_800_000);
    expect(B(0.2).pensionPlusOtherIncomeMinCouple).toBe(3_460_000);
    // 1割はフォールバック（全しきい値が null）
    expect(B(0.1).totalIncomeMin).toBeNull();
    // ★AND であることがデータの note に書かれている★
    expect(DATA.futanWariai.note).toContain("AND条件");
    expect(DATA.futanWariai.note).toContain("かつ");
  });

  it("T-01 境界ちょうど: 合計所得220万・年金等340万（単身）→ 3割（両方 >= を含む）", () => {
    expect(
      rate10({ totalIncome: B(0.3).totalIncomeMin!, pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle! }),
    ).toBe(3);
  });

  it("T-02 境界−1円: 合計所得220万・年金等3,399,999（単身）→ 2割（3割の第2要件が1円足りない）", () => {
    expect(
      rate10({
        totalIncome: B(0.3).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle! - 1,
      }),
    ).toBe(2);
  });

  it("T-03 境界−1円: 合計所得2,199,999・年金等340万（単身）→ 2割（3割の第1要件が1円足りない）", () => {
    expect(
      rate10({
        totalIncome: B(0.3).totalIncomeMin! - 1,
        pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
      }),
    ).toBe(2);
  });

  it("T-04 境界ちょうど: 合計所得160万・年金等280万（単身）→ 2割", () => {
    expect(
      rate10({ totalIncome: B(0.2).totalIncomeMin!, pensionPlusOtherIncome: B(0.2).pensionPlusOtherIncomeMinSingle! }),
    ).toBe(2);
  });

  it("★★T-05 AND の核心★★ 合計所得160万・年金等2,799,999（単身）→ 1割（OR 実装なら2割と誤る）", () => {
    const r = judgeFutanWariai(
      inp({
        totalIncome: B(0.2).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.2).pensionPlusOtherIncomeMinSingle! - 1,
      }),
    );
    expect(r.rate10).toBe(1);
    // ★第1要件は満たしている（＝OR なら2割になってしまう入力である）ことを固定する★
    expect(r.firstRequirementMet).toBe(true);
    expect(r.secondRequirementMet).toBe(false);
    expect(r.firstOnly).toBe(true);
    // §7: 理由を明示する
    expect(r.reason).toContain("両方");
  });

  it("★★T-06 AND の核心★★ 合計所得1,599,999・年金等500万（単身）→ 1割（第2要件を大きく超えても1割）", () => {
    const r = judgeFutanWariai(
      inp({ totalIncome: B(0.2).totalIncomeMin! - 1, pensionPlusOtherIncome: 5_000_000 }),
    );
    expect(r.rate10).toBe(1);
    expect(r.firstRequirementMet).toBe(false);
    expect(r.firstOnly).toBe(false);
  });

  it("T-07 夫婦: 合計所得220万・年金等463万 → 3割（夫婦のしきい値）", () => {
    expect(
      rate10({
        household: "couple",
        totalIncome: B(0.3).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinCouple!,
      }),
    ).toBe(3);
  });

  it("T-08 夫婦: 合計所得220万・年金等4,629,999 → 2割（2割の夫婦しきい値346万は充足）", () => {
    expect(
      rate10({
        household: "couple",
        totalIncome: B(0.3).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinCouple! - 1,
      }),
    ).toBe(2);
  });

  it("★T-09 AND★ 夫婦: 合計所得160万・年金等3,459,999 → 1割", () => {
    expect(
      rate10({
        household: "couple",
        totalIncome: B(0.2).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.2).pensionPlusOtherIncomeMinCouple! - 1,
      }),
    ).toBe(1);
    // 夫婦のしきい値ちょうどなら2割
    expect(
      rate10({
        household: "couple",
        totalIncome: B(0.2).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.2).pensionPlusOtherIncomeMinCouple!,
      }),
    ).toBe(2);
  });

  it("★T-10 早期リターン★ 40〜64歳は所得にかかわらず一律1割（所得を一切見ない）", () => {
    const r = judgeFutanWariai(
      inp({ ageGroup: "age40to64", totalIncome: 5_000_000, pensionPlusOtherIncome: 10_000_000 }),
    );
    expect(r.rate10).toBe(1);
    expect(r.reason).toContain("所得にかかわらず");
    expect(DATA.futanWariai.description).toContain("40〜64歳（第2号被保険者）は所得にかかわらず一律1割");
    // 3割になる所得でも、年齢区分だけで1割に落ちる
    expect(
      rate10({
        ageGroup: "age40to64",
        totalIncome: B(0.3).totalIncomeMin!,
        pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
      }),
    ).toBe(1);
  });

  it("★罠12★ brackets の並び順に依存しない（rate の降順で評価している）", () => {
    // JSON は 3割 → 2割 → 1割 の順。3割の要件を満たす入力が2割で止まらないこと
    const r = judgeFutanWariai(
      inp({ totalIncome: 9_999_999, pensionPlusOtherIncome: 9_999_999 }),
    );
    expect(r.rate10).toBe(3);
  });
});

// ================================================================ 区分支給限度基準額

describe("区分支給限度基準額（specs §4 ステップ4・§6.2）", () => {
  const zaitaku = (o: Partial<KaigoInput>) => {
    const i = inp(o);
    return calcZaitaku(i, judgeFutanWariai(i).rate10, resolveTanka(i.grade))!;
  };

  it("★データの自己整合性★ §9.1 全8件で units × 10 = yenAt10（データ改変の検知）", () => {
    expect(DATA.kubunShikyuGendo.levels).toHaveLength(8);
    for (const l of DATA.kubunShikyuGendo.levels) {
      expect(l.units * 10, `${l.key} の円換算が単位数と一致しません`).toBe(l.yenAt10);
    }
  });

  it("T-11 要介護3 / 1割 / 限度額いっぱい → 費用270,480円・自己負担27,048円", () => {
    const r = zaitaku({ careLevel: "yokaigo3" });
    expect(r.limitUnits).toBe(LEVEL("yokaigo3").units);
    expect(r.usedUnits).toBe(LEVEL("yokaigo3").units);
    expect(r.totalCost).toBe(LEVEL("yokaigo3").yenAt10);
    expect(r.totalCost).toBe(270_480);
    expect(r.totalFutan).toBe(27_048);
    expect(r.overUnits).toBe(0);
  });

  it("T-12 要介護5 / 3割 / 限度額いっぱい → 費用362,170円・自己負担108,651円", () => {
    const r = zaitaku({
      careLevel: "yokaigo5",
      totalIncome: B(0.3).totalIncomeMin!,
      pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
    });
    expect(r.totalCost).toBe(LEVEL("yokaigo5").yenAt10);
    expect(r.totalFutan).toBe(108_651);
    // ★整数演算★ 0.3 を掛けると 108651.00000000001 になりうる
    expect(Number.isInteger(r.totalFutan)).toBe(true);
  });

  it("T-13 要支援1 / 1割 → 自己負担5,032円（最小の限度額）", () => {
    expect(zaitaku({ careLevel: "yoshien1" }).totalFutan).toBe(5_032);
  });

  it("★T-14 罠10★ 経過的要介護を選択肢から落とさない → 自己負担6,150円（要支援1より高い）", () => {
    const r = zaitaku({ careLevel: "keikateki" });
    expect(r.totalFutan).toBe(6_150);
    expect(CARE_LEVELS.map((l) => l.key)).toContain("keikateki");
    expect(LEVEL("keikateki").units).toBeGreaterThan(LEVEL("yoshien1").units);
  });

  it("★★T-15 罠6★★ 限度額の超過分に負担割合を掛けない（全額自己負担）", () => {
    const r = zaitaku({ careLevel: "yokaigo1", usedUnits: 20_000 });
    const limit = LEVEL("yokaigo1").units; // 16,765
    expect(r.withinUnits).toBe(limit);
    expect(r.overUnits).toBe(20_000 - limit); // 3,235単位
    expect(r.withinFutan).toBe(16_765); // 16,765 × 10 × 1割
    // ★超過分は10割★ 3,235 × 10 = 32,350（3,235 ではない）
    expect(r.overFutan).toBe(32_350);
    expect(r.overFutan).toBe(r.overUnits * BASE_GRADE.yenMax);
    expect(r.totalFutan).toBe(49_115);
    expect(DATA.kubunShikyuGendo.description).toContain("超えた分は全額自己負担");
  });

  it("T-16 境界: 利用単位数が限度額ちょうどなら超過は発生しない", () => {
    const r = zaitaku({ careLevel: "yokaigo1", usedUnits: LEVEL("yokaigo1").units });
    expect(r.overUnits).toBe(0);
    expect(r.overFutan).toBe(0);
    expect(r.totalFutan).toBe(16_765);
    // 1単位超えると超過が出る
    expect(zaitaku({ careLevel: "yokaigo1", usedUnits: LEVEL("yokaigo1").units + 1 }).overUnits).toBe(1);
  });

  it("利用単位数の未入力は「限度額いっぱい」で試算する", () => {
    expect(zaitaku({ careLevel: "yokaigo2", usedUnits: null }).usedUnits).toBe(LEVEL("yokaigo2").units);
  });
});

// ================================================================ 級地（★確定額を出さない★）

describe("★1〜7級地では確定額を出さない★（specs §4 ステップ3・§7・§6.2 T-17）", () => {
  it("既定は上乗せのない地域＝1単位10円。確定額を出せる", () => {
    const t = resolveTanka(BASE_GRADE.grade);
    expect(t.certain).toBe(true);
    expect(t.yen).toBe(10);
    expect(BASE_GRADE.ratioMax).toBe(1);
  });

  it("★T-17★ 1級地は確定額を出さない。計算は10円で行い、11.40円は「上限値」として併記する", () => {
    const t = resolveTanka("1級地");
    expect(t.certain).toBe(false);
    // ★11.40円を掛けた額を確定額として出さない★
    expect(t.yen).toBe(BASE_GRADE.yenMax);
    expect(t.yenMax).toBe(DATA.tanka.grades.find((g) => g.grade === "1級地")!.yenMax);
    expect(t.note).toContain("上限値");
    expect(t.note).toContain("サービスの種類");

    // 自己負担額はその他地域（10円）と同額のまま。11.40円で膨らませない
    const i = inp({ careLevel: "yokaigo3", grade: "1級地" });
    const r = simulate(i);
    expect(r.zaitaku!.totalFutan).toBe(27_048);
    expect(r.tanka.certain).toBe(false);
    expect(r.warnings.some((w) => w.includes("上限値"))).toBe(true);
  });

  it("★『1級地は一律11.40円』は誤り★ とデータが明記している", () => {
    expect(DATA.tanka.note).toContain("『1級地は一律11.40円』は誤り");
    expect(DATA.tanka.note).toContain("上限値にすぎない");
  });

  it("未知の級地は既定（その他地域）にフォールバックする", () => {
    expect(resolveTanka("存在しない級地").grade).toBe(BASE_GRADE.grade);
  });
});

// ================================================================ 高額介護サービス費

describe("高額介護サービス費（specs §4 ステップ5・§5.2・§6.3）", () => {
  const full = (o: Partial<KaigoInput>) => simulate(inp(o));

  it("T-18 要介護5 / 3割 / 課税所得3,799,999 → 上限44,400円・払い戻し64,251円", () => {
    const r = full({
      careLevel: "yokaigo5",
      totalIncome: B(0.3).totalIncomeMin!,
      pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
      taxableIncome: 3_799_999,
    });
    expect(r.kougaku!.bracket.key).toBe("kazei-under380");
    expect(r.kougaku!.limit).toBe(KB("kazei-under380").limit);
    expect(r.kougaku!.limit).toBe(44_400);
    expect(r.kougaku!.target).toBe(108_651);
    expect(r.kougaku!.refund).toBe(64_251);
    expect(r.kougaku!.afterLimit).toBe(44_400);
  });

  it("T-19 境界: 課税所得3,800,000ちょうど → kazei380（上限93,000円・払い戻し15,651円）", () => {
    const r = full({
      careLevel: "yokaigo5",
      totalIncome: B(0.3).totalIncomeMin!,
      pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
      taxableIncome: KB("kazei380").taxableIncomeMin,
    });
    expect(r.kougaku!.bracket.key).toBe("kazei380");
    expect(r.kougaku!.limit).toBe(93_000);
    expect(r.kougaku!.refund).toBe(15_651);
  });

  it("T-20 課税所得6,900,000 → kazei690（上限140,100円）。上限に達せず払い戻しなし", () => {
    const r = full({
      careLevel: "yokaigo5",
      totalIncome: B(0.3).totalIncomeMin!,
      pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
      taxableIncome: KB("kazei690").taxableIncomeMin,
    });
    expect(r.kougaku!.bracket.key).toBe("kazei690");
    expect(r.kougaku!.limit).toBe(140_100);
    expect(r.kougaku!.refund).toBe(0);
    expect(r.kougaku!.afterLimit).toBe(108_651);
    // 境界−1円は kazei380（「690万円未満」＝含まない）
    expect(selectKougakuBracket(inp({ taxableIncome: KB("kazei690").taxableIncomeMin! - 1 })).key).toBe(
      "kazei380",
    );
  });

  it("★★T-21 罠3★★ 世帯非課税は課税所得の入力なしで判定できる（線形探索に落とさない）", () => {
    const r = full({ careLevel: "yokaigo5", taxStatus: "hikazei", hojokyufuIncome: 1_500_000, taxableIncome: 0 });
    // ★課税所得0円で kazei-under380（44,400円）に落ちてはいけない★
    expect(r.kougaku!.bracket.key).toBe("hikazei");
    expect(r.kougaku!.limit).toBe(KB("hikazei").limit);
    expect(r.kougaku!.limit).toBe(24_600);
    expect(r.kougaku!.target).toBe(36_217); // 1割
    expect(r.kougaku!.refund).toBe(11_617);
    // データ構造の根拠: hikazei には taxableIncomeMin/Max が存在しない
    expect("taxableIncomeMin" in KB("hikazei")).toBe(false);
    expect("taxableIncomeMax" in KB("hikazei")).toBe(false);
  });

  it("★T-22 罠9★ 非課税かつ年金等80万円ちょうど → 世帯24,600円／個人15,000円を併記", () => {
    const r = full({ careLevel: "yokaigo5", taxStatus: "hikazei", hojokyufuIncome: HIKAZEI_80MAN_THRESHOLD });
    expect(HIKAZEI_80MAN_THRESHOLD).toBe(800_000);
    expect(r.kougaku!.bracket.key).toBe("hikazei-80man");
    // ★片方だけ表示しない★
    expect(r.kougaku!.limit).toBe(24_600);
    expect(r.kougaku!.limitIndividual).toBe(15_000);
    expect(r.kougaku!.bracket.unit).toBe("世帯/個人 併記");
    // 80万円を1円超えると hikazei（個人の上限なし）
    expect(
      full({ taxStatus: "hikazei", hojokyufuIncome: HIKAZEI_80MAN_THRESHOLD + 1 }).kougaku!.limitIndividual,
    ).toBeNull();
  });

  it("★T-23 年少扶養控除の調整★ 課税所得400万・16歳未満2人 → 334万 → 上限44,400円（93,000円ではない）", () => {
    const i = inp({
      careLevel: "yokaigo3",
      taxableIncome: 4_000_000,
      youngDependents: { under16: 2, age16to18: 0 },
      isHouseholder: true,
    });
    expect(YOUNG_DEPENDENT_UNDER16_DEDUCTION).toBe(330_000);
    expect(adjustTaxableIncome(i)).toBe(3_340_000);
    const r = simulate(i);
    expect(r.kougaku!.bracket.key).toBe("kazei-under380");
    expect(r.kougaku!.limit).toBe(44_400);
    expect(r.kougaku!.adjustedTaxableIncome).toBe(3_340_000);

    // 調整がなければ kazei380（93,000円）だった
    expect(selectKougakuBracket(inp({ taxableIncome: 4_000_000 })).key).toBe("kazei380");
  });

  it("年少扶養控除の調整: 16歳以上19歳未満は12万円。世帯主でなければ適用しない", () => {
    expect(YOUNG_DEPENDENT_16TO18_DEDUCTION).toBe(120_000);
    expect(
      adjustTaxableIncome(inp({ taxableIncome: 4_000_000, youngDependents: { under16: 0, age16to18: 1 } })),
    ).toBe(3_880_000);
    // 世帯主でなければ控除しない
    expect(
      adjustTaxableIncome(
        inp({ taxableIncome: 4_000_000, isHouseholder: false, youngDependents: { under16: 2, age16to18: 0 } }),
      ),
    ).toBe(4_000_000);
  });

  it("★★T-24 罠7★★ 限度額の超過分を高額介護サービス費の上限計算に入れない", () => {
    const r = full({ careLevel: "yokaigo1", usedUnits: 20_000, taxableIncome: 3_000_000 });
    // ★対象は限度額の範囲内の 16,765円のみ★（49,115円ではない）
    expect(r.kougaku!.target).toBe(16_765);
    expect(r.kougaku!.limit).toBe(44_400);
    expect(r.kougaku!.refund).toBe(0);
    // 超過分32,350円は対象外として別に残り、合計は49,115円
    expect(r.zaitaku!.overFutan).toBe(32_350);
    expect(r.monthlyTotal).toBe(49_115);
    expect(DATA.kougakuKaigoServiceHi.note).toContain("区分支給限度基準額を超えた自己負担分は対象外");
  });

  it("生活保護の被保護者は個人15,000円（課税所得では判定しない）", () => {
    const r = full({ careLevel: "yokaigo5", taxStatus: "seikatsuHogo", taxableIncome: 9_999_999 });
    expect(r.kougaku!.bracket.key).toBe("seikatsu-hogo");
    expect(r.kougaku!.limit).toBe(15_000);
    expect(r.kougaku!.bracket.unit).toBe("個人");
  });

  it("★機械判定しない区分★ genkaku-15000 / genkaku-24600 は自動選択されない（§7）", () => {
    expect(GENKAKU_BRACKETS.map((b) => b.key)).toEqual(["genkaku-15000", "genkaku-24600"]);
    // 課税所得・課税状況のどの組合せでも genkaku-* が選ばれないこと
    for (const status of ["taxed", "hikazei", "seikatsuHogo"] as const) {
      for (const x of [0, 3_799_999, 3_800_000, 6_900_000, 9_999_999]) {
        const k = selectKougakuBracket(inp({ taxStatus: status, taxableIncome: x, hojokyufuIncome: x })).key;
        expect(k.startsWith("genkaku-"), `${status}/${x} で ${k} が選ばれました`).toBe(false);
      }
    }
  });

  it("★7月/8月の境界★ 判定の基準年は 1〜7月なら前々年、8月以降は前年", () => {
    expect(judgmentBaseYear("2026-07-31")).toBe(2024);
    expect(judgmentBaseYear("2026-08-01")).toBe(2025);
    expect(judgmentBaseYear("2026-01-01")).toBe(2024);
    expect(judgmentBaseYear("2026-12-31")).toBe(2025);
    expect(DATA.kougakuKaigoServiceHi.judgmentRules.baseYear.value).toContain("前々年");
  });

  it("判定は「月の初日」に行う（データの原文を保持している）", () => {
    expect(DATA.kougakuKaigoServiceHi.judgmentRules.timing.value).toContain("月の初日");
    expect(calcKougaku(inp({ taxableIncome: 0 }), 0).refund).toBe(0);
  });
});

// ================================================================ 補足給付（★2026-08-01★）

describe("★★補足給付は試算対象月で切り替える★★（specs §4 ステップ6・§5.5・§6.4）", () => {
  const shisetsu = (o: Partial<KaigoInput>) => calcHojokyufu(inp({ mode: "shisetsu", ...o }));

  it("★改定日はコードではなく amendments から導出される（2026-08-01）", () => {
    expect(HOJOKYUFU_EFFECTIVE_FROM).toBe("2026-08-01");
    const a = raw.amendments.find((x) => x.effectiveFrom === "2026-08-01" && x.sourceId === "mhlw-vol1481")!;
    expect(amendmentEffectiveDate(a as never)).toBe("2026-08-01");
    expect(a.impact).toContain("ツールは基準日で切り替えること");
  });

  it("★境界★ 2026-07-31 は beforeAug2026、2026-08-01 は fromAug2026（当日を含む）", () => {
    expect(resolvePeriod("2026-07-31").isFromAug2026).toBe(false);
    expect(resolvePeriod("2026-08-01").isFromAug2026).toBe(true);
    expect(resolvePeriod("2026-07-31").period.label).toBe(DATA.hojokyufu.beforeAug2026.label);
    expect(resolvePeriod("2026-08-01").period.label).toBe(DATA.hojokyufu.fromAug2026.label);
  });

  it("★★T-25 / T-26 1日ずれるだけで金額が変わる★★ 第3段階②・ユニット型個室・30日", () => {
    const o = { taxStatus: "hikazei" as const, hojokyufuIncome: 1_500_000, roomType: "ユニット型個室", savings: 3_000_000 };
    const before = shisetsu({ ...o, serviceDate: "2026-07-31" });
    const after = shisetsu({ ...o, serviceDate: "2026-08-01" });

    expect(before.stageResult.stage!.key).toBe("stage3b");
    expect(before.line!.shokuhi).toBe(DATA.hojokyufu.beforeAug2026.shokuhi.stage3b);
    expect(before.line!.shokuhi).toBe(1_360);
    expect(before.line!.kyojuhi).toBe(ROOM("beforeAug2026", "ユニット型個室").stage3b);
    expect(before.line!.kyojuhi).toBe(1_370);
    expect(before.line!.perDay).toBe(2_730);
    expect(before.line!.monthly).toBe(81_900);

    expect(after.line!.shokuhi).toBe(DATA.hojokyufu.fromAug2026.shokuhi.stage3b);
    expect(after.line!.shokuhi).toBe(1_420);
    expect(after.line!.kyojuhi).toBe(ROOM("fromAug2026", "ユニット型個室").stage3b);
    expect(after.line!.kyojuhi).toBe(1_470);
    expect(after.line!.perDay).toBe(2_890);
    expect(after.line!.monthly).toBe(86_700);

    // 差額 +4,800円/月
    expect(after.line!.monthly - before.line!.monthly).toBe(4_800);
  });

  it("★T-27 改正＝全員値上げではない★ 第1段階・第2段階は据置（7/31 と 8/1 で同額）", () => {
    const o = { taxStatus: "hikazei" as const, hojokyufuIncome: 700_000, roomType: "ユニット型個室" };
    const before = shisetsu({ ...o, serviceDate: "2026-07-31" });
    const after = shisetsu({ ...o, serviceDate: "2026-08-01" });
    expect(after.stageResult.stage!.key).toBe("stage2");
    expect(after.line!.shokuhi).toBe(390);
    expect(after.line!.kyojuhi).toBe(880);
    expect(after.line!.monthly).toBe(38_100);
    expect(after.line!.monthly).toBe(before.line!.monthly); // 据置
    expect(DATA.hojokyufu.fromAug2026.shokuhi.note).toContain("第1段階・第2段階は据置");
  });

  it("★★T-28 罠5★★ 多床室（室料を徴収しない老健等）の第3段階②だけ据置（530ではなく430）", () => {
    const type = "多床室（老健・医療院等／室料を徴収しない場合）";
    const r = shisetsu({
      serviceDate: "2026-08-01",
      taxStatus: "hikazei",
      hojokyufuIncome: 1_500_000,
      roomType: type,
    });
    expect(r.stageResult.stage!.key).toBe("stage3b");
    expect(r.line!.shokuhi).toBe(1_420);
    // ★+100円の一般化をしていないこと★
    expect(r.line!.kyojuhi).toBe(430);
    expect(r.line!.kyojuhi).toBe(ROOM("fromAug2026", type).stage3b);
    expect(r.line!.kyojuhi).toBe(ROOM("beforeAug2026", type).stage3b); // 据置
    expect(r.line!.monthly).toBe(55_500);

    // 他の多床室は +100円されている（＝例外であることの対比）
    expect(ROOM("fromAug2026", "多床室（特養等）").stage3b).toBe(530);
    expect(ROOM("beforeAug2026", "多床室（特養等）").stage3b).toBe(430);
    expect(DATA.hojokyufu.fromAug2026.note).toContain("多床室のうち室料を徴収しない老健等を除く");
  });

  it("★T-29 罠8★ 居住費0円を「未設定」と誤らない（多床室・第1段階＝無料）", () => {
    const r = shisetsu({
      serviceDate: "2026-08-01",
      taxStatus: "seikatsuHogo",
      roomType: "多床室（特養等）",
    });
    expect(r.stageResult.stage!.key).toBe("stage1");
    expect(r.line!.shokuhi).toBe(300);
    // ★0 を falsy 判定して基準費用額（915円）に落ちてはいけない★
    expect(r.line!.kyojuhi).toBe(0);
    expect(r.line!.kyojuhi).not.toBe(ROOM("fromAug2026", "多床室（特養等）").kijunHiyou);
    expect(r.line!.monthly).toBe(9_000);
    expect(kyojuhiPerDay(resolvePeriod("2026-08-01").period, "多床室（特養等）", "stage1")).toBe(0);
  });

  it("T-30 / T-31 第4段階（課税世帯）は補足給付の対象外＝基準費用額を全額負担", () => {
    const o = { taxStatus: "taxed" as const, roomType: "ユニット型個室" };
    const after = shisetsu({ ...o, serviceDate: "2026-08-01" });
    expect(after.stageResult.stage!.key).toBe("stage4");
    expect(after.line!.shokuhi).toBe(DATA.hojokyufu.fromAug2026.shokuhi.kijunHiyou);
    expect(after.line!.shokuhi).toBe(1_545);
    expect(after.line!.kyojuhi).toBe(ROOM("fromAug2026", "ユニット型個室").kijunHiyou);
    expect(after.line!.kyojuhi).toBe(2_066);
    expect(after.line!.monthly).toBe(108_330);

    const before = shisetsu({ ...o, serviceDate: "2026-07-31" });
    expect(before.line!.shokuhi).toBe(1_445);
    expect(before.line!.monthly).toBe(105_330);
    // ★改正は基準費用額（第4段階）にも効く★ 食費 +100円/日 = +3,000円/月
    expect(after.line!.monthly - before.line!.monthly).toBe(3_000);
    expect(
      DATA.hojokyufu.userStages.stages.find((s) => s.key === "stage4")!.note,
    ).toContain("補足給付の対象外");
  });

  it("★T-32★ ショートステイの食費は別表（第2段階は390円ではなく600円）", () => {
    const r = shisetsu({
      serviceDate: "2026-08-01",
      taxStatus: "hikazei",
      hojokyufuIncome: 700_000,
      roomType: "多床室（特養等）",
      isShortStay: true,
    });
    expect(r.line!.shokuhi).toBe(DATA.hojokyufu.fromAug2026.shokuhi.shortStay.stage2);
    expect(r.line!.shokuhi).toBe(600);
    expect(r.line!.shokuhi).not.toBe(DATA.hojokyufu.fromAug2026.shokuhi.stage2);
    expect(r.line!.kyojuhi).toBe(430);
    expect(r.line!.monthly).toBe(30_900);
    // 通常入所とショートステイで食費が切り替わること
    const period = resolvePeriod("2026-08-01").period;
    expect(shokuhiPerDay(period, "stage2", true)).toBe(600);
    expect(shokuhiPerDay(period, "stage2", false)).toBe(390);
    // 第4段階は基準費用額（ショートステイの別表を見に行かない）
    expect(shokuhiPerDay(period, "stage4", true)).toBe(1_545);
  });

  it("★T-33★ 預貯金要件を落とさない（第2段階・単身650万円を1円超える → 対象外）", () => {
    const stage2 = DATA.hojokyufu.userStages.stages.find((s) => s.key === "stage2")!;
    const over = shisetsu({
      taxStatus: "hikazei",
      hojokyufuIncome: 700_000,
      savings: stage2.savingsLimitSingle! + 1,
    });
    expect(over.stageResult.overSavings).toBe(true);
    expect(over.stageResult.stage!.key).toBe("stage4"); // 第4段階と同じ扱い
    expect(over.stageResult.reason).toContain("預貯金");

    // 境界ちょうど（650万円）は対象内（「超える」と対象外）
    const ok = shisetsu({
      taxStatus: "hikazei",
      hojokyufuIncome: 700_000,
      savings: stage2.savingsLimitSingle!,
    });
    expect(ok.stageResult.stage!.key).toBe("stage2");
    expect(ok.stageResult.overSavings).toBe(false);

    // 夫婦は1,650万円まで
    expect(
      shisetsu({
        household: "couple",
        taxStatus: "hikazei",
        hojokyufuIncome: 700_000,
        savings: stage2.savingsLimitCouple!,
      }).stageResult.stage!.key,
    ).toBe("stage2");
  });

  it("T-34 / T-35 段階の境界（「以下」は含む・「超」は含まない）", () => {
    const st = (income: number) =>
      judgeStage(inp({ taxStatus: "hikazei", hojokyufuIncome: income })).stage?.key;
    // 809,000ちょうど → 第2段階（「80.9万円以下」＝含む。既定の試算対象月は2026-07）
    expect(st(BOUNDARY_STAGE2_3A_BEFORE_AUG2026)).toBe("stage2");
    // 1,200,000ちょうど → 第3段階①（「120万円以下」＝含む）
    expect(st(1_200_000)).toBe("stage3a");
    // 1,200,001 → 第3段階②
    expect(st(1_200_001)).toBe("stage3b");
    expect(
      DATA.hojokyufu.userStages.stages.find((s) => s.key === "stage3a")!.incomeMax,
    ).toBe(1_200_000);
  });

  it("★★T-36改（2026-07-17 解禁）★★ 80万円台前半は試算対象月で段階が確定する", () => {
    // 2026年7月分まで: 境界80.9万円 → 820,000円は「超」なので第3段階①
    const july = shisetsu({ taxStatus: "hikazei", hojokyufuIncome: 820_000, roomType: "ユニット型個室", serviceDate: "2026-07-31" });
    expect(july.stageResult.stage!.key).toBe("stage3a");
    expect(july.candidateLines).toHaveLength(0);
    expect(july.line!.perDay).toBe(650 + 1_370);

    // 2026年8月分から: 境界82.65万円 → 820,000円は「以下」なので第2段階
    const aug = shisetsu({ taxStatus: "hikazei", hojokyufuIncome: 820_000, roomType: "ユニット型個室", serviceDate: "2026-08-01" });
    expect(aug.stageResult.stage!.key).toBe("stage2");
    // 8月以降の第2段階は据置（食費390円・居住費880円）
    expect(aug.line!.perDay).toBe(390 + 880);

    // 境界ちょうどの包含関係: 826,500円は8月以降「以下」で第2段階、7月までは「超」で第3段階①
    expect(stage2Stage3aBoundary("2026-07-31")).toBe(BOUNDARY_STAGE2_3A_BEFORE_AUG2026);
    expect(stage2Stage3aBoundary("2026-08-01")).toBe(BOUNDARY_STAGE2_3A_FROM_AUG2026);

    // 段階が切り替わる帯には注意書きを出す
    const w = simulate(inp({ mode: "shisetsu", taxStatus: "hikazei", hojokyufuIncome: 820_000 })).warnings;
    expect(w.some((x) => x.includes("8月1日")) || w.some((x) => x.includes("段階が変わります"))).toBe(true);
  });

  it("★境界はデータの2ノードから導出する★（80.9万円=7月まで・82.65万円=8月から）", () => {
    expect(BOUNDARY_STAGE2_3A_BEFORE_AUG2026).toBe(809_000);
    expect(BOUNDARY_STAGE2_3A_FROM_AUG2026).toBe(826_500);
    // 切替帯の判定（80.9万超〜82.65万以下だけが8/1をまたいで段階が変わる）
    expect(isStageChangingAtAug2026(809_000)).toBe(false);
    expect(isStageChangingAtAug2026(809_001)).toBe(true);
    expect(isStageChangingAtAug2026(826_500)).toBe(true);
    expect(isStageChangingAtAug2026(826_501)).toBe(false);
    // stages の静的データは8月以降の境界で書かれている（7月までは実装側で読み替え）
    expect(DATA.hojokyufu.userStages.stages.find((s) => s.key === "stage2")!.incomeMax).toBe(826_500);
    expect(DATA.hojokyufu.userStages.boundaryResolution.value).toContain("決着済み");
  });

  it("★罠16改★ 境界は満額年金そのものではなく百円単位に切り上げた額（826,464→826,500）", () => {
    expect(DATA.hojokyufu.userStages.boundaryBasisRule.note).toContain("826,464円");
    expect(BOUNDARY_STAGE2_3A_FROM_AUG2026 % 100).toBe(0);
  });

  it("★罠14★ 補足給付の所得の定義（非課税年金を含む／世帯分離した配偶者を含む）を保持している", () => {
    expect(DATA.hojokyufu.userStages.note).toContain("非課税年金");
    expect(DATA.hojokyufu.userStages.note).toContain("世帯を分離している配偶者を含む");
  });

  it("存在しない部屋タイプでは金額を出さない（推測しない）", () => {
    const r = shisetsu({ taxStatus: "hikazei", hojokyufuIncome: 700_000, roomType: "存在しない部屋" });
    expect(r.unavailable).toBe(true);
    expect(r.line).toBeNull();
  });

  it("在宅モードでは補足給付を計算しない（食費・居住費は施設の論点）", () => {
    expect(simulate(inp({ mode: "zaitaku" })).hojokyufu).toBeNull();
  });

  it("★データの自己整合性★ shokuhi/kyojuhi は 8月改正で第1・第2段階が据置", () => {
    const b = DATA.hojokyufu.beforeAug2026;
    const a = DATA.hojokyufu.fromAug2026;
    expect(a.shokuhi.stage1).toBe(b.shokuhi.stage1);
    expect(a.shokuhi.stage2).toBe(b.shokuhi.stage2);
    // 第3段階①は+30円、②は+60円（データ側の note と一致すること）
    expect(a.shokuhi.stage3a - b.shokuhi.stage3a).toBe(30);
    expect(a.shokuhi.stage3b - b.shokuhi.stage3b).toBe(60);
    // 基準費用額は+100円
    expect(a.shokuhi.kijunHiyou - b.shokuhi.kijunHiyou).toBe(100);
    // 居住費は第3段階②のみ+100円（室料を徴収しない老健等を除く）
    for (const room of a.kyojuhi) {
      const before = b.kyojuhi.find((r) => r.type === room.type)!;
      expect(room.stage1).toBe(before.stage1);
      expect(room.stage2).toBe(before.stage2);
      expect(room.stage3a).toBe(before.stage3a);
      const diff = room.stage3b - before.stage3b;
      expect(diff === 100 || (diff === 0 && room.type.includes("室料を徴収しない"))).toBe(true);
    }
  });
});

// ================================================================ ★状態像を書かない★

describe("★★要介護度は状態像で説明しない★★（specs §9.2-1・§6.5）", () => {
  /** 法令・告示に根拠のない「状態像」の記述（yokaigoNintei.noStateDefinition） */
  const BANNED_STATE_WORDS = [
    "全面的な介護",
    "全面的介護",
    "部分的な介護",
    "部分的介護",
    "寝たきり",
    "身の回りのことができない",
    "立ち上がりが困難",
    "認知症が進行",
    "自立した生活",
    "介護が必要な状態",
  ];

  it("T-38 要介護3 の表示は要介護認定等基準時間のみ（状態像を含まない）", () => {
    const d = ninteiDefinition("yokaigo3")!;
    expect(d.label).toBe("要介護3");
    expect(d.minutesMin).toBe(70);
    expect(d.minutesMax).toBe(90);
    expect(d.text).toBe("要介護認定等基準時間 70分以上90分未満");
    for (const w of BANNED_STATE_WORDS) {
      expect(d.text, `${w} が表示文言に含まれています`).not.toContain(w);
    }
  });

  it("★T-39★ 要支援2 と 要介護1 は同じ時間帯（32〜50分）であることを明示する", () => {
    const y2 = ninteiDefinition("yoshien2")!;
    const k1 = ninteiDefinition("yokaigo1")!;
    expect(y2.text).toBe("要介護認定等基準時間 32分以上50分未満");
    expect(k1.text).toBe(y2.text);
    // 互いを「同じ時間帯の区分」として提示する
    expect(y2.sameRangeLabels).toEqual(["要介護1"]);
    expect(k1.sameRangeLabels).toEqual(["要支援2"]);
    // 振り分けの根拠（①認知症高齢者の日常生活自立度 ②状態の安定性）
    expect(k1.note).toContain("認知症高齢者の日常生活自立度");
    expect(k1.note).toContain("状態の安定性");
    expect(y2.note).toContain("維持・改善可能性");
  });

  it("非該当・要介護5 の片側開区間を正しく表示する", () => {
    expect(ninteiDefinition("higaitou")!.text).toBe("要介護認定等基準時間 25分未満");
    expect(ninteiDefinition("yokaigo5")!.text).toBe("要介護認定等基準時間 110分以上");
  });

  it("★罠11★ 経過的要介護は基準時間の定義を持たない（join の欠落を扱う）", () => {
    expect(ninteiDefinition("keikateki")).toBeNull();
    expect(simulate(inp({ careLevel: "keikateki" })).nintei).toBeNull();
    // 限度額は存在する（＝落とさない）
    expect(simulate(inp({ careLevel: "keikateki" })).zaitaku!.limitUnits).toBe(6_150);
  });

  it("★★実装に状態像の記述が一切ない★★（コメント・文字列を含む全文を検査）", () => {
    const files = [
      "lib/tools/impl/kaigo-jikofutan.ts",
      "components/tools/impl/KaigoJikofutan.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      for (const w of BANNED_STATE_WORDS) {
        expect(src, `${f} に状態像の記述「${w}」が含まれています`).not.toContain(w);
      }
    }
  });

  it("状態像による定義が存在しないこと・基準時間の但し書きをデータから出している", () => {
    expect(NO_STATE_DEFINITION).toBe("要介護度ごとの「状態像」を定義した公式規定は存在しない");
    expect(DATA.yokaigoNintei.note).toContain("実際に家庭で行われる介護時間とは異なる");
    // T-40: 要介護度を推定せず、認定の仕組みを案内する
    expect(NINTEI_PROCESS).toContain("介護認定審査会");
    expect(NINTEI_PROCESS).toContain("認定調査");
  });
});

// ================================================================ スコープ（★実装しないもの★）

describe("★実装を保留するもの★（specs §2.2・§7・§6.5 T-37）", () => {
  it("T-37 高額医療・高額介護合算療養費は実装しない（現行限度額が未確認）", () => {
    const r = simulate(inp({}));
    expect(Object.keys(r)).not.toContain("gassan");
    expect(DATA.gassan.unconfirmedLimits.note).toContain("ツールへの実装を保留すること");
    // 実装・UI のどこにも合算の数値が出ていないこと
    for (const f of ["lib/tools/impl/kaigo-jikofutan.ts", "components/tools/impl/KaigoJikofutan.tsx"]) {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      expect(src).not.toContain("gassan");
      expect(src).not.toMatch(/\b190[,_]?000\b/); // 合算の第2段階
      expect(src).not.toMatch(/\b310[,_]?000\b/); // 合算の第3段階
    }
  });

  it("2割負担の対象拡大は検討中。具体的な数値を確定値として持たない", () => {
    const a = raw.amendments.find((x) => x.status === "under-review" && x.summary.includes("2割負担"))!;
    expect(a.summary).toContain("特定の数値を採用していない");
    expect(a.impact).toContain("2026年度中は現行基準");
    // 検討中の数値（260万・230万等）が実装に入っていないこと
    const src = readFileSync(resolve(process.cwd(), "lib/tools/impl/kaigo-jikofutan.ts"), "utf8");
    expect(src).not.toMatch(/\b2[,_]?600[,_]?000\b/);
    expect(src).not.toMatch(/\b2[,_]?300[,_]?000\b/);
  });

  it("2027-04-01 の補足給付の段階細分は実装しない（告示未公布）", () => {
    const a = raw.amendments.find((x) => x.effectiveFrom === "2027-04-01")!;
    expect(a.impact).toContain("告示未公布");
    // stages は現行の5段階のまま
    expect(DATA.hojokyufu.userStages.stages.map((s) => s.key)).toEqual([
      "stage1",
      "stage2",
      "stage3a",
      "stage3b",
      "stage4",
    ]);
  });
});

// ================================================================ 総合

describe("総合（simulate）", () => {
  it("在宅の月額合計＝高額介護サービス費の上限適用後 ＋ 限度額の超過分", () => {
    const r = simulate(inp({ careLevel: "yokaigo5", usedUnits: 40_000, taxableIncome: 0 }));
    expect(r.monthlyTotal).toBe(r.kougaku!.afterLimit + r.zaitaku!.overFutan);
  });

  it("要介護度が不正なら金額を出さない（推測しない）", () => {
    const r = simulate(inp({ careLevel: "unknown-level" }));
    expect(r.zaitaku).toBeNull();
    expect(r.kougaku).toBeNull();
    expect(r.monthlyTotal).toBeNull();
  });

  it("★安全弁★ 期限切れ型の amendment があれば金額を止める（データ差し替えで追随）", () => {
    // 現行データには expires 型の amendment がないため期限切れにはならない
    expect(isDataExpired(kaigoHokenDataset, "2030-01-01")).toBe(false);
    // 期限を設定すれば止まる（コード側に日付リテラルが関与しないこと）
    const withExpiry = {
      ...kaigoHokenDataset,
      amendments: [
        { summary: "テスト", status: "expires" as const, expiresOn: "2026-07-31", sourceId: "mhlw-vol1481" },
      ],
    };
    expect(isDataExpired(withExpiry, "2026-08-01")).toBe(true);
    expect(isDataExpired(withExpiry, "2026-07-31")).toBe(false);
  });

  it("負担割合が上がると自己負担も比例して上がる（1割 → 2割 → 3割）", () => {
    const of = (o: Partial<KaigoInput>) => simulate(inp({ careLevel: "yokaigo3", ...o })).zaitaku!.totalFutan;
    const one = of({});
    const two = of({
      totalIncome: B(0.2).totalIncomeMin!,
      pensionPlusOtherIncome: B(0.2).pensionPlusOtherIncomeMinSingle!,
    });
    const three = of({
      totalIncome: B(0.3).totalIncomeMin!,
      pensionPlusOtherIncome: B(0.3).pensionPlusOtherIncomeMinSingle!,
    });
    expect(two).toBe(one * 2);
    expect(three).toBe(one * 3);
    expect([one, two, three].every(Number.isInteger)).toBe(true);
  });
});

// ================================================================ ★ハードコード禁止★

describe("★制度の数値をコードに書かない★（data/seido から読んでいること）", () => {
  it("実装に制度の数値の直書きがない", () => {
    // コメント（解説として数値に言及している箇所）を除いたコードだけを対象にする
    const src = readFileSync(resolve(process.cwd(), "lib/tools/impl/kaigo-jikofutan.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const banned = [
      /\b16[,_]?765\b/, // 要介護1の限度額
      /\b27[,_]?048\b/, // 要介護3
      /\b36[,_]?217\b/, // 要介護5
      /\b6[,_]?150\b/, // 経過的要介護
      /\b140[,_]?100\b/, // 高額介護サービス費の上限
      /\b93[,_]?000\b/,
      /\b44[,_]?400\b/,
      /\b24[,_]?600\b/,
      /\b15[,_]?000\b/,
      /\b1[,_]?445\b/, // 食費の基準費用額（〜7/31）
      /\b1[,_]?545\b/, // 食費の基準費用額（8/1〜）
      /\b1[,_]?360\b/,
      /\b1[,_]?420\b/,
      /\b2[,_]?066\b/, // ユニット型個室の基準費用額
      /\b809[,_]?000\b/, // 補足給付の段階の境界
      /\b826[,_]?500\b/, // 同（解説図の値）
      /\b1[,_]?200[,_]?000\b/,
      /\b2[,_]?200[,_]?000\b/, // 負担割合のしきい値
      /\b1[,_]?600[,_]?000\b/,
      /\b2[,_]?800[,_]?000\b/,
      /\b3[,_]?400[,_]?000\b/,
      /\b4[,_]?630[,_]?000\b/,
      /\b3[,_]?460[,_]?000\b/,
      /\b3[,_]?800[,_]?000\b/, // 課税所得の区分
      /\b6[,_]?900[,_]?000\b/,
      /\b330[,_]?000\b/, // 年少扶養控除の調整
      /\b120[,_]?000\b/,
      /\b800[,_]?000\b/, // 非課税かつ年金等80万円以下
      /\b6[,_]?500[,_]?000\b/, // 預貯金の要件
      /\b11\.4\b/, // 1級地の単価の上限値
      /0\.3\b/, // 負担割合（浮動小数を使わない）
      /0\.2\b/,
      /0\.1\b/,
      /\b2026-0[78]-\d\d\b/, // 改正日の直書き
    ];
    for (const b of banned) {
      expect(src, `${b} が実装に直書きされています`).not.toMatch(b);
    }
  });

  it("データを差し替えれば追随する（しきい値・限度額・施行日はすべて JSON 由来）", () => {
    // 実装が公開している定数がデータと一致していること（＝どちらかを変えれば落ちる）
    expect(BASE_GRADE.yenMax).toBe(DATA.tanka.grades.find((g) => g.grade === "その他")!.yenMax);
    expect(HOJOKYUFU_EFFECTIVE_FROM).toBe(
      raw.amendments.find((a) => a.sourceId === "mhlw-vol1481")!.effectiveFrom,
    );
    expect(HIKAZEI_80MAN_THRESHOLD).toBe(800_000);
    expect(CARE_LEVELS).toHaveLength(DATA.kubunShikyuGendo.levels.length);
  });
});
