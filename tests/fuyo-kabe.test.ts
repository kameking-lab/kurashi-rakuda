import { describe, it, expect } from "vitest";
import {
  salaryIncome,
  kisoKoujo,
  taxableIncome,
  kazeiSaiteiGen,
  kyuyoKoujoMinimum,
  isFuyoKoujoEligible,
  isKinroGakuseiEligible,
  tokuteiShinzokuKoujo,
  haiguushaTokubetsuKoujo,
  judgeShaho,
  judgeDependent,
  isWageRequirementActive,
  socialInsurancePremium,
  simulate,
  type FuyoInput,
} from "@/lib/tools/impl/fuyo-kabe";

/**
 * specs/s-tools/02-fuyou-kabe-simu.md §6 のテストケースを実装。
 *
 * 期待値は仕様書から書き写すのではなく、仕様書 §6「検算」に記載された
 * 原典（国税庁あらまし・財務省大綱）との突き合わせを再現している。
 */

const base: FuyoInput = {
  salary: 0,
  age: 30,
  target: "spouse",
  isStudent: false,
  employerSize: "51plus",
  weeklyHours: 20,
  overTwoMonths: true,
  supporterSalary: 6_000_000,
  sameHousehold: true,
  baseMonth: "2026-06",
};
const inp = (o: Partial<FuyoInput>): FuyoInput => ({ ...base, ...o });

describe("原典との検算（specs §6）", () => {
  it("課税最低限は178万円＝給与所得控除74万＋基礎控除104万（財務省大綱と一致）", () => {
    expect(kyuyoKoujoMinimum()).toBe(740_000);
    expect(kisoKoujo(1_040_000)).toBe(1_040_000);
    expect(kyuyoKoujoMinimum() + 1_040_000).toBe(1_780_000);
    expect(kazeiSaiteiGen()).toBe(1_780_000);
  });

  it("給与136万円 − 74万円 = 合計所得62万円＝扶養親族の所得要件と一致", () => {
    expect(salaryIncome(1_360_000)).toBe(620_000);
  });

  it("給与206万円 − 74万円 = 132万円＝基礎控除表の132万円と一致", () => {
    expect(salaryIncome(2_060_000)).toBe(1_320_000);
  });
});

describe("給与所得（specs §4.0 Step1）", () => {
  it("TC-01 740,000円 → 給与所得0（741,000円未満）", () => {
    expect(salaryIncome(740_000)).toBe(0);
  });

  it("TC-02 741,000円 → 1,000円（境界ちょうど。S=0 から S>0 に変わる点）", () => {
    expect(salaryIncome(741_000)).toBe(1_000);
  });

  it("TC-03 1,000,000円 → 260,000円、課税所得0", () => {
    expect(salaryIncome(1_000_000)).toBe(260_000);
    expect(taxableIncome(1_000_000, { isStudent: false })).toBe(0);
  });

  it("TC-17 2,191,000円 → 定額1,451,000円", () => {
    expect(salaryIncome(2_191_000)).toBe(1_451_000);
  });

  it("TC-18 2,193,000円 → 定額1,453,000円", () => {
    expect(salaryIncome(2_193_000)).toBe(1_453_000);
  });

  it("TC-19 2,196,000円 → 定額1,456,000円", () => {
    expect(salaryIncome(2_196_000)).toBe(1_456_000);
  });

  it("TC-20改（2026-07-17 解禁）2,200,000円 → 給与所得1,460,000円（控除74万円と連続）", () => {
    // 速算表の連続性: 220万×30%＋8万 = 74万 で第1区分と一致（データの検算noteどおり）
    expect(salaryIncome(2_200_000)).toBe(1_460_000);
    expect(simulate(inp({ salary: 2_200_000 })).outOfRange).toBe(false);
  });

  it("★解禁の錨★ 220万円以上660万円未満は収入を4,000円単位に切り捨ててから速算表を適用（別表第五）", () => {
    // 3,000,000円: 切捨て後3,000,000（4,000の倍数）→ ×30%＋8万 = 98万 → 所得202万
    expect(salaryIncome(3_000_000)).toBe(2_020_000);
    // 3,001,999円: 切捨て後3,000,000 → 同じ所得202万（区分内は同額）
    expect(salaryIncome(3_001_999)).toBe(2_020_000);
    // 3,004,000円: 切捨て後3,004,000 → ×30%＋8万 = 981,200 → 所得2,022,800
    expect(salaryIncome(3_004_000)).toBe(2_022_800);
    // 5,000,000円: ×20%＋44万 = 144万 → 所得356万
    expect(salaryIncome(5_000_000)).toBe(3_560_000);
  });

  it("★660万円以上は切り捨てない★（別表第五の適用外）", () => {
    // 7,000,001円: ×10%＋110万 → 所得 floor(7,000,001×0.9) − 1,100,000 = 5,200,000
    expect(salaryIncome(7_000_001)).toBe(5_200_000);
    // 8,500,000円超は控除上限195万円
    expect(salaryIncome(10_000_000)).toBe(8_050_000);
    // 基礎控除表との整合（データの検算note）: 給与665万5,556円 → 合計所得489万円
    expect(salaryIncome(6_655_556)).toBe(4_890_000);
    // 850万円 → 合計所得655万円
    expect(salaryIncome(8_500_000)).toBe(6_550_000);
  });

  it("TC-35 0円 → 0（エラーにしない）", () => {
    expect(salaryIncome(0)).toBe(0);
  });
});

describe("基礎控除（specs §4.0 Step2）", () => {
  it("合計所得489万円以下は104万円（大綱「489万円以下 42万円」の裏取り）", () => {
    expect(kisoKoujo(1_320_000)).toBe(1_040_000);
    expect(kisoKoujo(3_360_000)).toBe(1_040_000);
    expect(kisoKoujo(4_890_000)).toBe(1_040_000);
  });

  it("489万円超655万円以下は67万円（62万＋加算5万）", () => {
    expect(kisoKoujo(4_890_001)).toBe(670_000);
    expect(kisoKoujo(6_550_000)).toBe(670_000);
  });

  it("655万円超2,350万円以下は62万円（加算なし）", () => {
    expect(kisoKoujo(6_550_001)).toBe(620_000);
    expect(kisoKoujo(23_500_000)).toBe(620_000);
  });

  it("2,350万円超は未収集のため null", () => {
    expect(kisoKoujo(23_500_001)).toBeNull();
  });
});

describe("178万円の壁（specs §5 主役）", () => {
  it("TC-13 1,780,000円ちょうど → 課税所得0（所得税セーフ）", () => {
    expect(salaryIncome(1_780_000)).toBe(1_040_000);
    expect(taxableIncome(1_780_000, { isStudent: false })).toBe(0);
  });

  it("TC-14 1,780,001円 → 課税所得1円（所得税が発生）", () => {
    expect(taxableIncome(1_780_001, { isStudent: false })).toBe(1);
  });

  it("TC-04 1,030,000円（旧103万円の壁）→ 課税所得0。何も起きない", () => {
    expect(taxableIncome(1_030_000, { isStudent: false })).toBe(0);
  });
});

describe("扶養控除・配偶者控除の壁 136万円（specs §5）", () => {
  it("TC-05 1,360,000円ちょうど → セーフ（62万円以下＝境界を含む）", () => {
    expect(isFuyoKoujoEligible(1_360_000)).toBe(true);
  });

  it("TC-06 1,360,001円 → アウト", () => {
    expect(isFuyoKoujoEligible(1_360_001)).toBe(false);
  });
});

describe("勤労学生控除の壁 163万円", () => {
  it("TC-11 1,630,000円ちょうど → セーフ", () => {
    expect(isKinroGakuseiEligible(1_630_000)).toBe(true);
  });

  it("TC-12 1,630,001円 → アウト", () => {
    expect(isKinroGakuseiEligible(1_630_001)).toBe(false);
  });
});

describe("配偶者特別控除（坂であることの確認）", () => {
  it("TC-07 1,500,000円 → 38万円（満額）", () => {
    expect(haiguushaTokubetsuKoujo(1_500_000, 6_000_000)).toBe(380_000);
  });

  it("TC-08 1,590,000円ちょうど → 38万円（満額の上限）", () => {
    expect(haiguushaTokubetsuKoujo(1_590_000, 6_000_000)).toBe(380_000);
  });

  it("TC-31 扶養者の年収1,200万円 → 0円（給与1,195万円超＝合計所得1,000万円超で適用なし）", () => {
    expect(haiguushaTokubetsuKoujo(1_500_000, 12_000_000)).toBe(0);
  });

  it("TC-31b 扶養者の年収1,100万円 → 26万円（合計所得905万円。1,000万円超ではない）", () => {
    // 1,100万 − 給与所得控除195万（上限） = 905万円 → 900万超950万以下の区分
    expect(haiguushaTokubetsuKoujo(1_500_000, 11_000_000)).toBe(260_000);
  });

  it("控除額は段階的に逓減する（崖にならない）", () => {
    const seq = [1_500_000, 1_700_000, 1_800_000, 1_900_000, 2_000_000, 2_060_000].map((s) =>
      haiguushaTokubetsuKoujo(s, 6_000_000),
    );
    // 単調非増加であること＝手取りが逆転する崖が生じない
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeLessThanOrEqual(seq[i - 1]);
    expect(seq[0]).toBe(380_000);
    expect(seq[seq.length - 1]).toBe(30_000);
  });

  it("207万円超 → 0円", () => {
    expect(haiguushaTokubetsuKoujo(2_070_001, 6_000_000)).toBe(0);
  });
});

describe("特定親族特別控除（19〜23歳・坂）", () => {
  it("TC-15 1,970,000円ちょうど → 3万円", () => {
    expect(tokuteiShinzokuKoujo(1_970_000, 21)).toBe(30_000);
  });

  it("TC-16 1,970,001円 → 0円（控除の消滅）", () => {
    expect(tokuteiShinzokuKoujo(1_970_001, 21)).toBe(0);
  });

  it("136万円超159万円以下 → 63万円（満額）", () => {
    expect(tokuteiShinzokuKoujo(1_500_000, 21)).toBe(630_000);
  });

  it("19歳未満・23歳以上は対象外", () => {
    expect(tokuteiShinzokuKoujo(1_500_000, 18)).toBe(0);
    expect(tokuteiShinzokuKoujo(1_500_000, 23)).toBe(0);
  });
});

describe("130万円の壁（社保の被扶養者）— 税と境界の向きが逆", () => {
  it("TC-09 1,299,999円 → セーフ（130万円未満）", () => {
    expect(judgeDependent(inp({ salary: 1_299_999, supporterSalary: 6_000_000 })).isDependent).toBe(true);
  });

  it("TC-10 1,300,000円ちょうど → アウト（「以下」ではなく「未満」）", () => {
    expect(judgeDependent(inp({ salary: 1_300_000, supporterSalary: 6_000_000 })).isDependent).toBe(false);
  });

  it("★税と社保で境界の向きが逆★ 136万ちょうどは扶養内、130万ちょうどは扶養外", () => {
    expect(isFuyoKoujoEligible(1_360_000)).toBe(true); // 税は「以下」
    expect(judgeDependent(inp({ salary: 1_300_000 })).isDependent).toBe(false); // 社保は「未満」
  });

  it("TC-28 年齢21・親の扶養・140万円 → セーフ（19〜23歳は150万円未満）", () => {
    const r = judgeDependent(inp({ salary: 1_400_000, age: 21, target: "parent", supporterSalary: 6_000_000 }));
    expect(r.threshold).toBe(1_500_000);
    expect(r.isDependent).toBe(true);
  });

  it("TC-29 年齢25・親の扶養・140万円 → アウト（同じ年収でも年齢で反転）", () => {
    const r = judgeDependent(inp({ salary: 1_400_000, age: 25, target: "parent", supporterSalary: 6_000_000 }));
    expect(r.threshold).toBe(1_300_000);
    expect(r.isDependent).toBe(false);
  });

  it("TC-30 年齢62・170万円 → セーフ（60歳以上は180万円未満）", () => {
    const r = judgeDependent(inp({ salary: 1_700_000, age: 62, supporterSalary: 6_000_000 }));
    expect(r.threshold).toBe(1_800_000);
    expect(r.isDependent).toBe(true);
  });

  it("TC-32 同一世帯・扶養者1,100万円・本人120万円 → セーフ（130万円未満かつ2分の1未満）", () => {
    const r = judgeDependent(inp({ salary: 1_200_000, supporterSalary: 11_000_000, sameHousehold: true }));
    expect(r.isDependent).toBe(true);
    expect(r.failedHalfRule).toBe(false);
  });

  it("TC-32b 同一世帯の2分の1要件で外れる（130万円未満でも扶養者の半分以上）", () => {
    const r = judgeDependent(inp({ salary: 1_200_000, supporterSalary: 2_000_000, sameHousehold: true }));
    expect(r.isDependent).toBe(false);
    expect(r.failedHalfRule).toBe(true);
  });

  it("★2分の1要件はAND条件★ 130万円以上なら2分の1を満たしても扶養外", () => {
    const r = judgeDependent(inp({ salary: 1_500_000, supporterSalary: 11_000_000, sameHousehold: true }));
    expect(r.isDependent).toBe(false);
  });
});

describe("106万円の壁と2026年10月の賃金要件撤廃（specs §4.3）", () => {
  it("賃金要件は2026年9月まで有効、10月から撤廃", () => {
    expect(isWageRequirementActive("2026-09")).toBe(true);
    expect(isWageRequirementActive("2026-10")).toBe(false);
    expect(isWageRequirementActive("2027-01")).toBe(false);
  });

  it("TC-21 年収120万（月10万）・2026-09 → 加入する（月8.8万円以上）", () => {
    expect(judgeShaho(inp({ salary: 1_200_000, baseMonth: "2026-09" })).enrolled).toBe(true);
  });

  it("TC-22 年収100万（月83,333円）・2026-09 → 加入しない（月8.8万円未満）", () => {
    expect(judgeShaho(inp({ salary: 1_000_000, baseMonth: "2026-09" })).enrolled).toBe(false);
  });

  it("TC-23 ★同一入力で2026-10は反転★ 年収100万・2026-10 → 加入する", () => {
    expect(judgeShaho(inp({ salary: 1_000_000, baseMonth: "2026-10" })).enrolled).toBe(true);
  });

  it("TC-24 週19時間・2026-10 → 加入しない（週20時間要件は残る）", () => {
    expect(judgeShaho(inp({ salary: 1_000_000, weeklyHours: 19, baseMonth: "2026-10" })).enrolled).toBe(false);
  });

  it("TC-25 学生・2026-10 → 加入しない（適用除外）", () => {
    expect(judgeShaho(inp({ salary: 1_000_000, isStudent: true, baseMonth: "2026-10" })).enrolled).toBe(false);
  });

  it("TC-26 企業規模51人未満・2026-10 → 加入しない", () => {
    expect(judgeShaho(inp({ salary: 1_000_000, employerSize: "under51", baseMonth: "2026-10" })).enrolled).toBe(false);
  });

  it("TC-27 企業規模 unknown → unknown（両方の結果を併記するため）", () => {
    expect(judgeShaho(inp({ salary: 1_000_000, employerSize: "unknown", baseMonth: "2026-10" })).enrolled).toBe("unknown");
  });

  it("2か月を超える雇用見込みがない → 加入しない", () => {
    expect(judgeShaho(inp({ salary: 1_200_000, overTwoMonths: false })).enrolled).toBe(false);
  });
});

describe("手取り概算 — 子ども・子育て支援金（令和8年4月新設）の織り込み", () => {
  it("保険料は厚年9.15%＋健保4.95%＋支援金0.115%＋雇用0.5% で計算される", () => {
    const salary = 1_500_000;
    const expected = Math.round(salary * (0.183 / 2 + 0.099 / 2 + 0.0023 / 2 + 0.005));
    expect(socialInsurancePremium(salary)).toBe(expected);
  });

  it("★支援金0.23%を外すと過小になる★ 含む場合との差が生じること", () => {
    const salary = 1_500_000;
    const without = Math.round(salary * (0.183 / 2 + 0.099 / 2 + 0.005));
    expect(socialInsurancePremium(salary)).toBeGreaterThan(without);
  });
});

describe("壁の一覧（表示ロジック）", () => {
  it("住民税の壁は確定値を出さない（級地により異なるため）", () => {
    const w = simulate(inp({ salary: 1_000_000 })).walls.find((x) => x.key === "juuminzei");
    expect(w?.amount).toBeNull();
    expect(w?.status).toBe("unknown");
  });

  it("配偶者特別控除・特定親族特別控除は「坂」として扱う", () => {
    const spouse = simulate(inp({ salary: 1_500_000 })).walls.find((x) => x.key === "haiguusha-tokubetsu");
    expect(spouse?.isSlope).toBe(true);
    const parent = simulate(inp({ salary: 1_500_000, target: "parent", age: 21 })).walls.find(
      (x) => x.key === "tokutei-shinzoku",
    );
    expect(parent?.isSlope).toBe(true);
  });

  it("壁は金額の小さい順に並ぶ（越えていく順）", () => {
    const walls = simulate(inp({ salary: 1_500_000 })).walls;
    const amounts = walls.map((w) => w.amount).filter((a): a is number => a !== null);
    const sorted = [...amounts].sort((a, b) => a - b);
    expect(amounts).toEqual(sorted);
  });

  it("扶養に入っていない場合は扶養控除の壁を出さない", () => {
    const walls = simulate(inp({ salary: 1_500_000, target: "none" })).walls;
    expect(walls.find((w) => w.key === "fuyou-koujo")).toBeUndefined();
  });
});

describe("TC-34 異常系", () => {
  it("負の年収は給与所得0として扱い、落ちない", () => {
    expect(salaryIncome(-1)).toBe(0);
  });

  it("simulate は 220万円以上でも課税所得を返す（2026-07-17 解禁）。207万円の壁も扱える", () => {
    const r = simulate(inp({ salary: 3_000_000 }));
    expect(r.outOfRange).toBe(false);
    expect(r.salaryIncome).toBe(2_020_000);
    expect(r.walls.length).toBeGreaterThan(0);
  });

  it("合計所得2,350万円超（基礎控除の区分外）のみ outOfRange=true を維持", () => {
    // 給与2,600万円 → 控除上限195万 → 合計所得2,405万円 > 2,350万円
    const r = simulate(inp({ salary: 26_000_000 }));
    expect(r.outOfRange).toBe(true);
  });
});
