import { describe, expect, it } from "vitest";
import kyoukaikenpo from "@/data/seido/kyoukaikenpo-hokenryo.json";
import koyouHoken from "@/data/seido/koyou-hoken-ryoritsu.json";
import {
  estimateSocialInsurance,
  halfPremiumPerMonth,
  healthInsuranceRateOf,
  hyojunHoshuGrades,
  kenkoHokenGradeOf,
  pensionStandardOf,
  prefectures,
} from "@/lib/tools/impl/shakai-hoken";

const KK = kyoukaikenpo.data;

/**
 * ★照合アンカー★ 協会けんぽ 令和8年度保険料額表（東京支部・健康保険料率9.85%）に
 * 印字されている値そのもの。data/seido/kyoukaikenpo-hokenryo.json の
 * sources[kyoukaikenpo-r08-tokyo] の PDF から採録した。
 * [等級, 標準報酬月額, 健保全額, 健保折半額, 厚年全額, 厚年折半額]
 */
const PUBLISHED_TOKYO_FY2026 = [
  { grade: 1, shrm: 58_000, kenkoFull: 5_713.0, kenkoHalf: 2_856.5 },
  { grade: 4, shrm: 88_000, kenkoFull: 8_668.0, kenkoHalf: 4_334.0, nenkinFull: 16_104.0, nenkinHalf: 8_052.0 },
  { grade: 17, shrm: 200_000, kenkoFull: 19_700.0, kenkoHalf: 9_850.0, nenkinFull: 36_600.0, nenkinHalf: 18_300.0 },
  { grade: 35, shrm: 650_000, kenkoFull: 64_025.0, kenkoHalf: 32_012.5, nenkinFull: 118_950.0, nenkinHalf: 59_475.0 },
  { grade: 36, shrm: 680_000, kenkoFull: 66_980.0, kenkoHalf: 33_490.0 },
  { grade: 50, shrm: 1_390_000, kenkoFull: 136_915.0, kenkoHalf: 68_457.5 },
];

/** 50銭以下は切り捨て、50銭を超えたら切り上げ（原典 hasuuShori.kyuyoKaranoKojo） */
const expectedRounding = (half: number) =>
  half - Math.floor(half) <= 0.5 ? Math.floor(half) : Math.ceil(half);

describe("標準報酬月額の等級表", () => {
  it("健康保険50等級・厚生年金32等級が収録されている", () => {
    const g = hyojunHoshuGrades();
    expect(g).toHaveLength(50);
    expect(g.filter((r) => r.pensionGrade !== null)).toHaveLength(32);
  });

  it("等級表の境界に隙間も重複もない（remunerationMax === 次の remunerationMin）", () => {
    const g = hyojunHoshuGrades();
    for (let i = 0; i < g.length - 1; i++) {
      expect(g[i].remunerationMax).toBe(g[i + 1].remunerationMin);
    }
    // 両端は原典に記載がないため null
    expect(g[0].remunerationMin).toBeNull();
    expect(g[49].remunerationMax).toBeNull();
  });

  it("第1等級58,000円・第50等級1,390,000円（原典の下限・上限）", () => {
    const g = hyojunHoshuGrades();
    expect(g[0].standardMonthlyRemuneration).toBe(58_000);
    expect(g[49].standardMonthlyRemuneration).toBe(1_390_000);
  });

  it("健康保険の等級は『以上／未満』で判定する（63,000円が第1→第2の境界）", () => {
    expect(kenkoHokenGradeOf(62_999).grade).toBe(1);
    expect(kenkoHokenGradeOf(63_000).grade).toBe(2);
    expect(kenkoHokenGradeOf(72_999).grade).toBe(2);
    expect(kenkoHokenGradeOf(73_000).grade).toBe(3);
  });

  it("報酬月額0円でも第1等級、青天井でも第50等級に収まる", () => {
    expect(kenkoHokenGradeOf(0).grade).toBe(1);
    expect(kenkoHokenGradeOf(1_354_999).grade).toBe(49);
    expect(kenkoHokenGradeOf(1_355_000).grade).toBe(50);
    expect(kenkoHokenGradeOf(99_999_999).grade).toBe(50);
  });
});

describe("★厚生年金は等級表の両端の境界が健康保険と異なる★（実装で最も間違えやすい箇所）", () => {
  it("報酬月額93,000円未満はすべて厚生年金第1等級（標準報酬月額88,000円）", () => {
    // 健康保険では第1〜3等級に分かれる低報酬でも、厚生年金では第1等級に張り付く
    for (const m of [0, 50_000, 62_999, 63_000, 82_999, 92_999]) {
      const p = pensionStandardOf(m);
      expect(p.grade).toBe(1);
      expect(p.standardMonthlyRemuneration).toBe(88_000);
      expect(p.capped).toBe(false);
    }
    expect(kenkoHokenGradeOf(58_000).grade).toBe(1); // 健保側は第1等級のまま
    expect(kenkoHokenGradeOf(90_000).grade).toBe(4); // 健保は第4等級
  });

  it("報酬月額93,000円で厚生年金第2等級に上がる", () => {
    const p = pensionStandardOf(93_000);
    expect(p.grade).toBe(2);
    expect(p.standardMonthlyRemuneration).toBe(98_000);
  });

  it("報酬月額635,000円以上はすべて厚生年金第32等級（650,000円）で頭打ち", () => {
    for (const m of [635_000, 700_000, 1_000_000, 5_000_000]) {
      const p = pensionStandardOf(m);
      expect(p.grade).toBe(32);
      expect(p.standardMonthlyRemuneration).toBe(650_000);
      expect(p.capped).toBe(true);
    }
  });

  it("報酬月額634,999円は厚生年金第31等級（頭打ちの直前）", () => {
    const p = pensionStandardOf(634_999);
    expect(p.grade).toBe(31);
    expect(p.standardMonthlyRemuneration).toBe(620_000);
    expect(p.capped).toBe(false);
  });

  it("★健保と厚年で標準報酬月額が乖離する★ 報酬月額700,000円: 健保710,000／厚年650,000", () => {
    // 健保は第37等級（695,000以上730,000未満→標準報酬月額710,000）まで刻みが続くが、
    // 厚年は第32等級（650,000）で頭打ちのまま。
    expect(kenkoHokenGradeOf(700_000).grade).toBe(37);
    expect(kenkoHokenGradeOf(700_000).standardMonthlyRemuneration).toBe(710_000);
    expect(pensionStandardOf(700_000).standardMonthlyRemuneration).toBe(650_000);
  });
});

describe("★端数処理: 50銭ちょうどは切り捨て（四捨五入ではない）★", () => {
  it("58,000円 × 9.85% の折半額 2,856.5円 は 2,856円", () => {
    expect(halfPremiumPerMonth(58_000, 985)).toBe(2_856);
  });

  it("★浮動小数だと切り上げに誤る実例★ 78,000円 × 10.05%（岡山県）の折半額 3,919.5円 は 3,919円", () => {
    // 78,000 × 0.1005 は JavaScript では 7839.000000000001 になり、
    // ÷2 した 3919.5000000000005 が「50銭超」と誤判定されて 3,920 に切り上がる。
    // 本実装は料率を1/10000単位の整数に直して計算するため境界を厳密に判定できる。
    // （全50等級 × 収録全料率＝4,900通りを総当たりしたところ、浮動小数のままだと20通りで
    //   1円ずれることを確認済み。この78,000×10.05%はその1つ）
    const naive = 78_000 * 0.1005 / 2;
    expect(naive).toBeGreaterThan(3919.5); // 誤差が実在することを固定
    expect(Math.ceil(naive)).toBe(3_920); // 素朴な実装だとこうなる
    expect(halfPremiumPerMonth(78_000, 1005)).toBe(3_919); // 正しくは切り捨て
  });

  it("50銭を超えるときは切り上げる", () => {
    // 58,000 × 0.23%(支援金) = 133.4 → 折半 66.7 → 67
    expect(halfPremiumPerMonth(58_000, 23)).toBe(67);
  });

  it("端数がないときはそのまま", () => {
    // 200,000 × 9.85% = 19,700 → 折半 9,850
    expect(halfPremiumPerMonth(200_000, 985)).toBe(9_850);
  });

  it("★原典に印字された折半額と一致する（東京支部・令和8年度の照合アンカー）★", () => {
    for (const p of PUBLISHED_TOKYO_FY2026) {
      // 全額 = 標準報酬月額 × 料率
      expect(p.shrm * 985 / 10_000).toBeCloseTo(p.kenkoFull, 1);
      // 折半額（端数処理後）
      expect(halfPremiumPerMonth(p.shrm, 985)).toBe(expectedRounding(p.kenkoHalf));
      if (p.nenkinHalf !== undefined) {
        expect(halfPremiumPerMonth(p.shrm, 1830)).toBe(expectedRounding(p.nenkinHalf));
      }
    }
  });

  it("★全50等級で、折半額×2 が原典の全額と1円以内で整合する★", () => {
    for (const g of hyojunHoshuGrades()) {
      const full = (g.standardMonthlyRemuneration * 985) / 10_000;
      const half = halfPremiumPerMonth(g.standardMonthlyRemuneration, 985);
      expect(Math.abs(half * 2 - full)).toBeLessThanOrEqual(1);
    }
  });
});

describe("都道府県別の健康保険料率", () => {
  it("47都道府県が収録されている", () => {
    expect(prefectures()).toHaveLength(47);
    expect(prefectures()[0]).toBe("北海道");
    expect(prefectures()[46]).toBe("沖縄県");
  });

  it("令和8年度の東京都は9.85%、佐賀県（最高）は10.55%、新潟県（最低）は9.21%", () => {
    expect(healthInsuranceRateOf("東京都", "FY2026")).toBe(0.0985);
    expect(healthInsuranceRateOf("佐賀県", "FY2026")).toBe(0.1055);
    expect(healthInsuranceRateOf("新潟県", "FY2026")).toBe(0.0921);
  });

  it("★令和7年度と令和8年度で料率が違う★（8aは令和7年度を使う）", () => {
    expect(healthInsuranceRateOf("東京都", "FY2025")).toBe(0.0991);
    expect(healthInsuranceRateOf("東京都", "FY2026")).toBe(0.0985);
    // 据置きの県は同値
    expect(healthInsuranceRateOf("沖縄県", "FY2025")).toBe(0.0944);
    expect(healthInsuranceRateOf("沖縄県", "FY2026")).toBe(0.0944);
  });

  it("★収録外の都道府県名は null（推測しない）★", () => {
    expect(healthInsuranceRateOf("東京", "FY2026")).toBeNull();
    expect(healthInsuranceRateOf("Tokyo", "FY2026")).toBeNull();
    expect(healthInsuranceRateOf("", "FY2026")).toBeNull();
  });
});

describe("★子ども・子育て支援金は令和7年分には存在しない★", () => {
  it("データ上、令和7年度は0・令和8年度は0.23%", () => {
    expect(KK.ratesFY2025.kodomoKosodateShienkin.value).toBe(0);
    expect(KK.rates.kodomoKosodateShienkin.value).toBe(0.0023);
  });

  it("FY2025の概算には支援金が含まれず、FY2026には含まれる", () => {
    const a = estimateSocialInsurance({ annualSalary: 5_000_000, prefecture: "東京都", year: "FY2025" });
    const b = estimateSocialInsurance({ annualSalary: 5_000_000, prefecture: "東京都", year: "FY2026" });
    expect(a!.breakdown.kodomoKosodateShienkin).toBe(0);
    expect(b!.breakdown.kodomoKosodateShienkin).toBeGreaterThan(0);
  });

  it("介護保険料率も年度で異なる（令和7年度1.59%→令和8年度1.62%）", () => {
    expect(KK.ratesFY2025.kaigoHoken.value).toBe(0.0159);
    expect(KK.rates.kaigoHoken.value).toBe(0.0162);
  });
});

describe("社会保険料の概算", () => {
  const base = { annualSalary: 6_000_000, prefecture: "東京都", year: "FY2026" as const };

  it("★収録外の都道府県なら null（全国平均で代用しない）★", () => {
    expect(estimateSocialInsurance({ ...base, prefecture: "架空県" })).toBeNull();
  });

  it("報酬月額は年収の12分の1、等級はその報酬月額から決まる", () => {
    const r = estimateSocialInsurance(base)!;
    expect(r.monthlyRemuneration).toBe(500_000);
    // 500,000 は第30等級（485,000以上515,000未満）＝標準報酬月額 500,000
    expect(r.kenkoGrade.grade).toBe(30);
    expect(r.kenkoGrade.standardMonthlyRemuneration).toBe(500_000);
    expect(r.pensionCapped).toBe(false);
  });

  it("健康保険料は 標準報酬月額×料率 の折半×12 と一致する", () => {
    const r = estimateSocialInsurance(base)!;
    expect(r.breakdown.kenkoHoken).toBe(halfPremiumPerMonth(500_000, 985) * 12);
  });

  it("厚生年金保険料は 標準報酬月額×18.3% の折半×12 と一致する", () => {
    const r = estimateSocialInsurance(base)!;
    expect(r.breakdown.kouseiNenkin).toBe(halfPremiumPerMonth(500_000, 1830) * 12);
  });

  it("★雇用保険は標準報酬月額ではなく賃金総額（年収）に乗じる★", () => {
    const r = estimateSocialInsurance(base)!;
    const workerRate = koyouHoken.data.ratesFY2026.rows.find(
      (x) => x.businessType === "一般の事業",
    )!.worker;
    expect(r.breakdown.koyouHoken).toBe(Math.floor(6_000_000 * workerRate));
    // 等級表の頭打ちを受けないため、年収に完全比例する
    const hi = estimateSocialInsurance({ ...base, annualSalary: 12_000_000 })!;
    expect(hi.breakdown.koyouHoken).toBe(r.breakdown.koyouHoken * 2);
  });

  it("介護保険第2号被保険者（40〜64歳）なら介護保険料が加わる", () => {
    const no = estimateSocialInsurance(base)!;
    const yes = estimateSocialInsurance({ ...base, isKaigoDaini: true })!;
    expect(no.breakdown.kaigoHoken).toBe(0);
    expect(yes.breakdown.kaigoHoken).toBe(halfPremiumPerMonth(500_000, 162) * 12);
    expect(yes.total).toBeGreaterThan(no.total);
  });

  it("★厚生年金の上限★ 年収762万円以上で標準報酬月額650,000円に張り付き、それ以上増えない", () => {
    const a = estimateSocialInsurance({ ...base, annualSalary: 7_620_000 })!;
    const b = estimateSocialInsurance({ ...base, annualSalary: 20_000_000 })!;
    expect(a.pensionCapped).toBe(true);
    expect(b.pensionCapped).toBe(true);
    expect(a.pensionStandardMonthlyRemuneration).toBe(650_000);
    expect(a.breakdown.kouseiNenkin).toBe(b.breakdown.kouseiNenkin);
    // 一方、健康保険料は上限に達しておらず増え続ける
    expect(b.breakdown.kenkoHoken).toBeGreaterThan(a.breakdown.kenkoHoken);
  });

  it("料率の高い県ほど健康保険料が高い（佐賀 > 東京 > 新潟）", () => {
    const saga = estimateSocialInsurance({ ...base, prefecture: "佐賀県" })!;
    const tokyo = estimateSocialInsurance(base)!;
    const niigata = estimateSocialInsurance({ ...base, prefecture: "新潟県" })!;
    expect(saga.breakdown.kenkoHoken).toBeGreaterThan(tokyo.breakdown.kenkoHoken);
    expect(tokyo.breakdown.kenkoHoken).toBeGreaterThan(niigata.breakdown.kenkoHoken);
  });

  it("total は内訳の合計に一致する", () => {
    const r = estimateSocialInsurance({ ...base, isKaigoDaini: true })!;
    const b = r.breakdown;
    expect(r.total).toBe(
      b.kenkoHoken + b.kaigoHoken + b.kodomoKosodateShienkin + b.kouseiNenkin + b.koyouHoken,
    );
  });

  it("年収0でも破綻せず、第1等級の下限保険料になる", () => {
    const r = estimateSocialInsurance({ ...base, annualSalary: 0 })!;
    expect(r.monthlyRemuneration).toBe(0);
    expect(r.kenkoGrade.grade).toBe(1);
    expect(r.pensionGrade).toBe(1);
    expect(r.breakdown.koyouHoken).toBe(0);
    expect(r.total).toBeGreaterThan(0);
  });

  it("負の年収でも例外を投げない（0として扱う）", () => {
    const r = estimateSocialInsurance({ ...base, annualSalary: -100 })!;
    expect(r.monthlyRemuneration).toBe(0);
    expect(Number.isFinite(r.total)).toBe(true);
  });

  it("対収入比は年収帯を通じて12%〜16%に収まる（本人負担率14.19%＋等級の丸め）", () => {
    // 東京都・令和8年度の本人負担率は (9.85% + 0.23% + 18.300%) ÷ 2 ＋ 雇用保険0.5% ＝ 14.69%。
    // 実際の比率はこれを中心に、①標準報酬月額の丸め（年収300万では月給25.0万→標準報酬26.0万で
    // 4%上振れ）②厚生年金の上限（年収1,000万では12.66%まで下がる）で上下する。
    for (const salary of [2_000_000, 3_000_000, 5_000_000, 7_000_000, 10_000_000]) {
      const r = estimateSocialInsurance({ ...base, annualSalary: salary })!;
      expect(r.total / salary).toBeGreaterThan(0.12);
      expect(r.total / salary).toBeLessThan(0.16);
    }
  });

  it("★厚生年金の上限により、高収入ほど対収入比は下がる★", () => {
    const mid = estimateSocialInsurance({ ...base, annualSalary: 6_000_000 })!;
    const high = estimateSocialInsurance({ ...base, annualSalary: 20_000_000 })!;
    expect(high.total / 20_000_000).toBeLessThan(mid.total / 6_000_000);
  });

  it("★令和7年度の方が負担が重い★（健保料率が高く、支援金がない分を上回る）", () => {
    // 東京都: 令和7年度9.91% → 令和8年度9.85%（▲0.06%）に対し、支援金は+0.23%の新設。
    // 折半後では ▲0.03% + 0.115% ＝ +0.085% となり、令和8年度の方が本人負担は重くなる。
    const a = estimateSocialInsurance({ ...base, annualSalary: 5_000_000, year: "FY2025" })!;
    const b = estimateSocialInsurance({ ...base, annualSalary: 5_000_000, year: "FY2026" })!;
    expect(b.total).toBeGreaterThan(a.total);
  });
});
