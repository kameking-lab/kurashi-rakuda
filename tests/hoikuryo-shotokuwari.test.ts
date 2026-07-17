import { describe, expect, it } from "vitest";
import juuminzei from "@/data/seido/juuminzei.json";
import kyuyoKoujo from "@/data/seido/kyuyo-shotoku-koujo.json";
import {
  chouseiKoujo,
  estimateShotokuwari,
  estimateSocialInsurance,
  estimateTier,
  fuyouKoujo,
  haiguushaKoujo,
  kisoKoujo,
  kyuyoShotokuKoujoFY2025,
  personalDeductionDifference,
  requiresPreprocessing,
  salaryIncomeFY2025,
  shotokuwariNonTaxableLimit,
  type ShotokuwariInput,
} from "@/lib/tools/impl/hoikuryo-shotokuwari";
import { getMunicipality } from "@/lib/tools/impl/hoikuryo";

/**
 * 保育料 年収→階層推計（8a）のテスト。specs/s-tools/01 §3.2、BACKLOG Q3-09。
 *
 * ★実装者 ≠ 検算者★（docs/08 の YMYL 方針）。本ファイルは実装者が書いたテストであり、
 * 検算は別セッションが data/seido/*.json から独立に再計算して行う。
 *
 * ★照合アンカー（自治体の公式計算例）★
 *   一次資料に「年収→所得割額→階層→保育料月額」を一本で繋いだモデルケースは
 *   12自治体のいずれにも存在しなかった（下記「アンカーの限界」参照）。
 *   代わりに、自治体が公表している【住民税の計算例】3件を全段の照合アンカーとして使う。
 *   いずれも令和8年度（＝令和7年分所得）であり、保育料の階層判定と同じ税年度・同じ表を使う。
 *
 *   A. 大阪市「市民税・府民税・森林環境税の計算例（給与所得者の場合）」（令和8年度）★政令指定都市8%★
 *   B. 名古屋市「市民税・県民税の計算例」（令和8年度）★政令指定都市だが市民税減税で7.7%★
 *   C. 調布市「個人住民税が算出されるまでの計算例」（令和8年度）★非指定都市6%★
 *
 *   これら3件は給与収入・給与所得・所得控除の内訳・課税総所得金額・所得割額・調整控除の
 *   すべてが公表されているため、モジュールの各段の中間値をそのまま突き合わせられる。
 */

const ANCHORS = {
  /** 大阪市 令和8年度 https://www.city.osaka.lg.jp/zaisei/page/0000384109.html */
  osaka: {
    url: "https://www.city.osaka.lg.jp/zaisei/page/0000384109.html",
    // 前提: 妻46歳、子17歳（高校生）、子13歳（中学生）
    salary: 5_436_629,
    salaryIncome: 3_908_800,
    shakaiHoken: 543_663,
    seimeiHoken: 70_000,
    jishinHoken: 22_000,
    haiguusha: 330_000,
    fuyou: 330_000,
    kiso: 430_000,
    iryouhi: 11_530,
    taxableIncome: 2_171_000,
    shiminzeiShotokuwari: 173_680, // 2,171,000 × 8%
    chouseiKoujo: 2_000,
  },
  /** 名古屋市 令和8年度 https://www.city.nagoya.jp/kurashi/zeikin/1037356/1011880/1011883/1011891.html */
  nagoya: {
    url: "https://www.city.nagoya.jp/kurashi/zeikin/1037356/1011880/1011883/1011891.html",
    // 前提: 夫婦子ども3人（妻、子19歳・16歳・12歳は所得なし）
    salary: 5_505_000,
    salaryIncome: 3_963_200,
    shakaiHoken: 825_600,
    seimeiHoken: 35_000,
    haiguusha: 330_000,
    fuyou: 780_000, // 特定扶養45万（19歳）＋一般扶養33万（16歳）
    kiso: 430_000,
    koujoTotal: 2_400_600,
    taxableIncome: 1_562_000,
    chouseiKoujo: 13_200, // ★市民税減税7.7%でも調整控除は指定都市の4%★
  },
  /** 調布市 令和8年度 https://www.city.chofu.lg.jp/030010/p014019.html */
  chofu: {
    url: "https://www.city.chofu.lg.jp/030010/p014019.html",
    // 前提: 本人52歳・配偶者50歳・子ども3人（20歳、17歳、14歳）
    salary: 6_543_200,
    salaryIncome: 4_792_000,
    koujoTotal: 2_098_200,
    taxableIncome: 2_693_000,
    shiminzeiShotokuwari: 161_580, // 2,693,000 × 6%
    chouseiKoujo: 1_500,
  },
} as const;

/** 社会保険料の実額を渡す既定入力（推計モードの誤差を持ち込まないため） */
function withActual(amount: number, rest: Omit<ShotokuwariInput, "socialInsurance">): ShotokuwariInput {
  return { ...rest, socialInsurance: { kind: "actual", amount } };
}

describe("8a — ① 給与所得（令和7年分＝令和8年度課税。最低保障額65万円）", () => {
  it("★令和8年分の74万円の表を使っていない★ 190万円以下の給与所得控除は65万円", () => {
    expect(kyuyoShotokuKoujoFY2025(1_900_000)).toBe(650_000);
    // 令和8年分（tableFY2026）なら74万円。取り違えると保育料の階層がずれる
    expect(kyuyoKoujo.data.tableFY2026.rows[0].deduction).toBe(740_000);
  });

  it("給与所得控除の速算表の各区分の境界", () => {
    expect(kyuyoShotokuKoujoFY2025(1_900_001)).toBe(650_000); // 1,900,001×30%+80,000 = 650,000
    expect(kyuyoShotokuKoujoFY2025(3_600_000)).toBe(1_160_000); // 3,600,000×30%+80,000
    expect(kyuyoShotokuKoujoFY2025(3_600_001)).toBe(1_160_000); // 3,600,001×20%+440,000 = 1,160,000
    expect(kyuyoShotokuKoujoFY2025(6_600_000)).toBe(1_760_000); // 6,600,000×20%+440,000
    expect(kyuyoShotokuKoujoFY2025(6_600_001)).toBe(1_760_000); // 6,600,001×10%+1,100,000
    expect(kyuyoShotokuKoujoFY2025(8_500_000)).toBe(1_950_000); // 8,500,000×10%+1,100,000 = 上限と一致
    expect(kyuyoShotokuKoujoFY2025(8_500_001)).toBe(1_950_000); // 上限（定額）
    expect(kyuyoShotokuKoujoFY2025(20_000_000)).toBe(1_950_000);
  });

  it("収入が給与所得控除の最低保障額未満なら給与所得は0（控除額＝収入額）", () => {
    expect(salaryIncomeFY2025(0)).toBe(0);
    expect(salaryIncomeFY2025(500_000)).toBe(0);
    expect(salaryIncomeFY2025(650_000)).toBe(0);
    expect(salaryIncomeFY2025(650_001)).toBe(1);
  });

  it("★別表第五の罠★ 220万円以上660万円未満は4,000円単位に切り捨ててから速算表を適用する", () => {
    // 5,436,629 → 5,436,000 に切り捨て → 5,436,000 − (5,436,000×20%+440,000) = 3,908,800
    expect(salaryIncomeFY2025(5_436_629)).toBe(3_908_800);
    // 切り捨てないと 3,909,303 になり、公表値と 503円 ずれる
    expect(5_436_629 - (Math.floor(5_436_629 * 0.2) + 440_000)).not.toBe(3_908_800);
  });

  it("★660万円以上は切り捨てない★（別表第五の適用がないため）", () => {
    // 6,600,001 を4,000円切捨てすると 6,600,000 になり区分が変わってしまう
    expect(salaryIncomeFY2025(6_600_001)).toBe(6_600_001 - 1_760_000);
    expect(salaryIncomeFY2025(6_602_000)).toBe(6_602_000 - (Math.floor(6_602_000 * 0.1) + 1_100_000));
  });

  it("切り捨ての境界: 220万円ちょうどから切り捨てが効く", () => {
    // 190万円超なので控除は「収入×30%＋80,000」。65万円の定額ではない
    // 2,199,999（切り捨てなし）→ 控除 659,999+80,000=739,999 → 所得 1,460,000
    expect(salaryIncomeFY2025(2_199_999)).toBe(1_460_000);
    // 2,201,000 → 2,200,000 へ切り捨て → 控除 660,000+80,000=740,000 → 所得 1,460,000
    expect(salaryIncomeFY2025(2_201_000)).toBe(1_460_000);
    // 切り捨てが実際に効いていること（220万〜220.4万は同じ給与所得に丸まる）
    expect(salaryIncomeFY2025(2_203_999)).toBe(salaryIncomeFY2025(2_200_000));
    expect(salaryIncomeFY2025(2_204_000)).toBeGreaterThan(salaryIncomeFY2025(2_203_999)!);
  });
});

describe("8a — ②〜⑥ 各段の中間値（自治体の公式計算例で照合）", () => {
  it("★アンカーA 大阪市（政令指定都市8%）★ 給与所得・課税総所得・所得割額・調整控除が公表値と一致", () => {
    const a = ANCHORS.osaka;
    expect(salaryIncomeFY2025(a.salary)).toBe(a.salaryIncome);

    // 所得控除の合計（大阪市の内訳をそのまま合算）
    const koujoTotal =
      a.shakaiHoken + a.seimeiHoken + a.jishinHoken + a.haiguusha + a.fuyou + a.kiso + a.iryouhi;
    const taxable = Math.floor((a.salaryIncome - koujoTotal) / 1000) * 1000;
    expect(taxable).toBe(a.taxableIncome);

    // 所得割額（税額控除前）
    expect(Math.floor((a.taxableIncome * 8) / 100)).toBe(a.shiminzeiShotokuwari);

    // 人的控除額の差: 5万（基礎）＋5万（配偶者）＋5万（一般扶養＝17歳）。13歳は年少で加算なし
    const diff = personalDeductionDifference(a.salaryIncome, {
      hasSpouse: true,
      dependents: { general: 1, under16: 1 },
    });
    expect(diff).toBe(150_000);
    // 合計課税所得200万円超 → {150,000 −(2,171,000−2,000,000)} = −21,000 < 5万 → 5万 × 4%（指定都市）
    expect(chouseiKoujo(a.taxableIncome, diff, true)).toBe(a.chouseiKoujo);

    // 配偶者控除・扶養控除の額もデータから引いて一致する
    expect(haiguushaKoujo(a.salaryIncome, { hasSpouse: true })).toBe(a.haiguusha);
    expect(fuyouKoujo({ general: 1, under16: 1 })).toBe(a.fuyou);
    expect(kisoKoujo()).toBe(a.kiso);
  });

  it("★アンカーA 大阪市★ モジュール全体を通しても公表値どおりの中間値になる", () => {
    const a = ANCHORS.osaka;
    // 大阪市の例の生命保険料70,000＋地震保険料22,000＋医療費11,530 は本モジュールが推計しない控除。
    // 社会保険料の実額のみを渡すと、推計は「それらを引く前」＝範囲の上限側に立つ
    const r = estimateShotokuwari(
      withActual(a.shakaiHoken, {
        salary: a.salary,
        hasSpouse: true,
        dependents: { general: 1, under16: 1 },
        isDesignatedCity: true,
      }),
    );
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    const b = r.breakdown;
    expect(b.salaryIncome).toBe(a.salaryIncome);
    expect(b.socialInsuranceDeduction).toBe(a.shakaiHoken);
    expect(b.deductionTotal).toBe(a.shakaiHoken + a.kiso + a.haiguusha + a.fuyou);
    // 3,908,800 − 1,633,663 = 2,275,137 → 1,000円未満切捨て → 2,275,000
    expect(b.taxableIncome).toBe(2_275_000);
    // 公表値との差は、本モジュールが推計しない控除（生保7万＋地震2.2万＋医療費11,530＝103,530）に由来する。
    // ★推計は上限側に立つ（未推計の控除は所得割を下げる方向にしか働かない）ことの実証★
    expect(b.taxableIncome).toBeGreaterThan(a.taxableIncome);
    expect(b.taxableIncome - a.taxableIncome).toBe(104_000); // 103,530 の切捨て後の差
    expect(b.personalDeductionDifference).toBe(150_000);
    expect(b.chouseiKoujo).toBe(a.chouseiKoujo);
    expect(b.shotokuwari).toBe(b.shotokuwariBeforeCredit - a.chouseiKoujo);
  });

  it("★アンカーB 名古屋市（子19歳=特定扶養・16歳=一般扶養・12歳=年少）★ 全段が公表値と一致", () => {
    const a = ANCHORS.nagoya;
    expect(salaryIncomeFY2025(a.salary)).toBe(a.salaryIncome);

    // 扶養控除 780,000 = 特定扶養45万（19歳）＋ 一般扶養33万（16歳）。12歳は年少で控除なし
    expect(fuyouKoujo({ specific: 1, general: 1, under16: 1 })).toBe(a.fuyou);

    const koujoTotal = a.shakaiHoken + a.seimeiHoken + a.haiguusha + a.fuyou + a.kiso;
    expect(koujoTotal).toBe(a.koujoTotal);
    expect(Math.floor((a.salaryIncome - koujoTotal) / 1000) * 1000).toBe(a.taxableIncome);

    // 人的控除額の差: 5万（基礎）＋5万（配偶者）＋18万（特定扶養）＋5万（一般扶養）＝33万
    const diff = personalDeductionDifference(a.salaryIncome, {
      hasSpouse: true,
      dependents: { specific: 1, general: 1, under16: 1 },
    });
    expect(diff).toBe(330_000);
    // 合計課税所得200万円以下 → min(330,000, 1,562,000) × 4%（指定都市）＝13,200
    expect(chouseiKoujo(a.taxableIncome, diff, true)).toBe(a.chouseiKoujo);
  });

  it("★アンカーC 調布市（非指定都市6%）★ 給与所得・課税総所得・所得割額・調整控除が公表値と一致", () => {
    const a = ANCHORS.chofu;
    expect(salaryIncomeFY2025(a.salary)).toBe(a.salaryIncome);
    expect(Math.floor((a.salaryIncome - a.koujoTotal) / 1000) * 1000).toBe(a.taxableIncome);
    expect(Math.floor((a.taxableIncome * 6) / 100)).toBe(a.shiminzeiShotokuwari);
    // 合計課税所得200万円超・人的控除差が小さく下限5万が効く → 50,000 × 3%（非指定都市）＝1,500
    expect(chouseiKoujo(a.taxableIncome, 150_000, false)).toBe(a.chouseiKoujo);
  });

  it("★指定都市の判別が効いている★ 同じ課税所得でも税率6%/8%・調整控除3%/4%が変わる", () => {
    const base = { salary: 5_000_000, hasSpouse: false, dependents: {}, isDesignatedCity: false };
    const normal = estimateShotokuwari(withActual(700_000, base));
    const designated = estimateShotokuwari(withActual(700_000, { ...base, isDesignatedCity: true }));
    expect(normal.kind).toBe("estimated");
    expect(designated.kind).toBe("estimated");
    if (normal.kind !== "estimated" || designated.kind !== "estimated") return;
    expect(designated.breakdown.taxableIncome).toBe(normal.breakdown.taxableIncome);
    // 8/6 の比になる
    expect(designated.breakdown.shotokuwariBeforeCredit).toBe(
      Math.floor((normal.breakdown.taxableIncome * 8) / 100),
    );
    expect(designated.breakdown.chouseiKoujo).toBeGreaterThan(normal.breakdown.chouseiKoujo);
  });
});

describe("8a — 調整控除（地方税法第314条の6）", () => {
  it("合計課税所得200万円以下: min(人的控除差, 課税所得) × 3%", () => {
    expect(chouseiKoujo(2_000_000, 150_000, false)).toBe(4_500); // min(150,000, 2,000,000)×3%
    expect(chouseiKoujo(100_000, 150_000, false)).toBe(3_000); // 課税所得の方が小さい → 100,000×3%
  });

  it("合計課税所得200万円超: {人的控除差 −（課税所得 − 200万円）} × 3%。下限5万円", () => {
    expect(chouseiKoujo(2_100_000, 300_000, false)).toBe(6_000); // {300,000−100,000}=200,000 ×3%
    expect(chouseiKoujo(2_300_000, 300_000, false)).toBe(1_500); // {300,000−300,000}=0 → 下限50,000 ×3%
    expect(chouseiKoujo(9_000_000, 300_000, false)).toBe(1_500); // 大きく超えても下限50,000 が効く
  });

  it("200万円の境界（以下／超）で式が切り替わる", () => {
    expect(chouseiKoujo(2_000_000, 300_000, false)).toBe(9_000); // 以下 → min(300,000, 2,000,000)×3%
    expect(chouseiKoujo(2_000_001, 300_000, false)).toBe(8_999); // 超 → {300,000−1}=299,999×3%=8,999.97→8,999
  });

  it("★指定都市は3%ではなく4%★（所得割の税率が6%→8%になっていることに対応）", () => {
    expect(chouseiKoujo(1_000_000, 150_000, true)).toBe(6_000); // 150,000×4%
    expect(chouseiKoujo(2_300_000, 300_000, true)).toBe(2_000); // 下限50,000×4%
  });

  it("人的控除額の差: 基礎5万を出発点に、扶養の区分ごとに加算する", () => {
    expect(personalDeductionDifference(3_000_000, {})).toBe(50_000); // 単身＝基礎の5万のみ
    expect(personalDeductionDifference(3_000_000, { hasSpouse: true })).toBe(100_000); // ＋配偶者5万
    expect(personalDeductionDifference(3_000_000, { spouseIsElderly: true, hasSpouse: true })).toBe(150_000); // ＋老人配偶者10万
    expect(personalDeductionDifference(3_000_000, { dependents: { specific: 2 } })).toBe(410_000); // 5万＋18万×2
    expect(personalDeductionDifference(3_000_000, { dependents: { elderly: 1 } })).toBe(150_000); // ＋10万
    expect(personalDeductionDifference(3_000_000, { dependents: { elderlyCohabiting: 1 } })).toBe(180_000); // ＋13万
  });

  it("★年少扶養親族（16歳未満）は人的控除差にも扶養控除にも加算しない★", () => {
    expect(personalDeductionDifference(3_000_000, { dependents: { under16: 3 } })).toBe(50_000);
    expect(fuyouKoujo({ under16: 3 })).toBe(0);
  });
});

describe("8a — 所得控除（住民税の額。★所得税の額を流用しないこと★）", () => {
  it("基礎控除は43万円（所得税の令和8年分62万円＋加算とは全く異なる）", () => {
    expect(kisoKoujo()).toBe(430_000);
  });

  it("配偶者控除は所得者の合計所得金額で3段階に逓減し、1,000万円超は適用なし", () => {
    expect(haiguushaKoujo(9_000_000, { hasSpouse: true })).toBe(330_000);
    expect(haiguushaKoujo(9_000_001, { hasSpouse: true })).toBe(220_000);
    expect(haiguushaKoujo(9_500_000, { hasSpouse: true })).toBe(220_000);
    expect(haiguushaKoujo(9_500_001, { hasSpouse: true })).toBe(110_000);
    expect(haiguushaKoujo(10_000_000, { hasSpouse: true })).toBe(110_000);
    expect(haiguushaKoujo(10_000_001, { hasSpouse: true })).toBe(0);
    expect(haiguushaKoujo(3_000_000, { hasSpouse: false })).toBe(0);
  });

  it("老人控除対象配偶者（70歳以上）は額が上がる", () => {
    expect(haiguushaKoujo(9_000_000, { hasSpouse: true, spouseIsElderly: true })).toBe(380_000);
  });

  it("扶養控除は区分ごとの額をデータから引く（一般33万・特定45万・老人38万・同居直系尊属45万）", () => {
    expect(fuyouKoujo({ general: 1 })).toBe(330_000);
    expect(fuyouKoujo({ specific: 1 })).toBe(450_000);
    expect(fuyouKoujo({ elderly: 1 })).toBe(380_000);
    expect(fuyouKoujo({ elderlyCohabiting: 1 })).toBe(450_000);
    expect(fuyouKoujo({ general: 2, specific: 1 })).toBe(330_000 * 2 + 450_000);
    expect(fuyouKoujo({})).toBe(0);
  });
});

describe("8a — 所得割の非課税限度額（★全国一律45万円。級地に依存しない★）", () => {
  it("単身は45万円（35万×1＋10万）", () => {
    expect(shotokuwariNonTaxableLimit({})).toBe(450_000);
  });

  it("同一生計配偶者・扶養親族がいる場合は 35万×(人数+1)＋10万＋32万", () => {
    expect(shotokuwariNonTaxableLimit({ hasSpouse: true })).toBe(350_000 * 2 + 100_000 + 320_000); // 1,120,000
    expect(shotokuwariNonTaxableLimit({ dependents: { general: 1 } })).toBe(1_120_000);
    expect(shotokuwariNonTaxableLimit({ hasSpouse: true, dependents: { under16: 2 } })).toBe(
      350_000 * 4 + 100_000 + 320_000, // 1,820,000
    );
  });

  it("★年少扶養親族（16歳未満）も人数に数える★（扶養控除の対象外でも非課税限度額には効く）", () => {
    expect(shotokuwariNonTaxableLimit({ dependents: { under16: 1 } })).toBe(1_120_000);
    // 控除の側では0
    expect(fuyouKoujo({ under16: 1 })).toBe(0);
  });

  it("非課税限度額の境界（「以下」＝ちょうどなら非課税）", () => {
    // 給与収入110万円 → 給与所得45万円 → 単身の限度額45万円ちょうど → 非課税
    const at = estimateShotokuwari(
      withActual(0, { salary: 1_100_000, isDesignatedCity: false }),
    );
    expect(at.kind).toBe("estimated");
    if (at.kind !== "estimated") return;
    expect(at.breakdown.salaryIncome).toBe(450_000);
    expect(at.isShotokuwariNonTaxable).toBe(true);

    const over = estimateShotokuwari(withActual(0, { salary: 1_100_001, isDesignatedCity: false }));
    expect(over.kind).toBe("estimated");
    if (over.kind !== "estimated") return;
    expect(over.breakdown.salaryIncome).toBe(450_001);
    expect(over.isShotokuwariNonTaxable).toBe(false);
  });

  it("★級地（1級地/2級地/3級地）で所得割の非課税限度額は変わらない★", () => {
    // 級地別の率が効くのは均等割の側だけ。所得割は地方税法附則第3条の3で全国一律
    const rates = juuminzei.data.hikazeiGendogaku.kintouwari.kyuuchiRates.rows;
    expect(rates.map((r) => r.rate)).toEqual([1.0, 0.9, 0.8]);
    // 所得割の限度額はどの級地でも同一（級地を引数に取らない設計であることの明示）
    expect(shotokuwariNonTaxableLimit({})).toBe(
      juuminzei.data.hikazeiGendogaku.shotokuwari.singlePersonLimit.value,
    );
  });

  it("★均等割の非課税は断定しない★ モジュールは均等割の判定を行わない", () => {
    const r = estimateShotokuwari(withActual(0, { salary: 1_030_000, isDesignatedCity: false }));
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    // isKintouwariNonTaxable のようなフィールドを持たないこと（条例差がありうるため）
    expect(r).not.toHaveProperty("isKintouwariNonTaxable");
    // データ側も「自治体差あり」を明示している
    expect(juuminzei.data.hikazeiGendogaku.kintouwari.municipalVariationWarning.value).toContain(
      "条例で定まる",
    );
  });
});

describe("8a — 推計値としての振る舞い（BACKLOG Q3-09 の解禁条件）", () => {
  const input = withActual(700_000, {
    salary: 5_000_000,
    hasSpouse: true,
    dependents: { under16: 2 },
    isDesignatedCity: false,
  });

  it("★(a) 推計値ラベル★ isEstimate が立ち、caveats に「推計値です」が含まれる", () => {
    const r = estimateShotokuwari(input);
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.isEstimate).toBe(true);
    expect(r.caveats.some((c) => c.includes("推計値です"))).toBe(true);
  });

  it("★(a) 範囲提示★ range の上限が点推計、下限は生命保険料控除の合計限度額ぶん低い", () => {
    const r = estimateShotokuwari(input);
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.range.max).toBe(r.breakdown.shotokuwari);
    expect(r.range.min).toBeLessThan(r.range.max);
    // 課税所得 2,100,000 → 1,500 ／ 2,030,000 → 2,100 と、生命保険料控除7万円ぶん課税所得が下がると
    // ★調整控除も動く★ため、幅は単純な 70,000×6%＝4,200 にはならない（124,500 − 119,700 ＝ 4,800）
    expect(r.range.max).toBe(124_500);
    expect(r.range.min).toBe(119_700);
    expect(r.range.max - r.range.min).toBe(4_800);
  });

  it("推計は上限側に立つ（未推計の控除は所得割を下げる方向にしか働かない）", () => {
    const r = estimateShotokuwari(input);
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.caveats.some((c) => c.includes("実際の所得割額は推計より低くなります"))).toBe(true);
  });

  it("★(b) 配偶者特別控除の対象なら推計しない★（逓減の算式が未データ化）", () => {
    const r = estimateShotokuwari({ ...input, hasSpouseSpecialDeduction: true });
    expect(r.kind).toBe("unavailable");
    if (r.kind !== "unavailable") return;
    expect(r.reason).toBe("haiguusha-tokubetsu-koujo-not-data");
    expect(r.note).toContain("課税明細書");
  });

  it("★(b) 特定親族特別控除の対象なら推計しない★（同上）", () => {
    const r = estimateShotokuwari({ ...input, hasTokuteiShinzokuSpecialDeduction: true });
    expect(r.kind).toBe("unavailable");
    if (r.kind !== "unavailable") return;
    expect(r.reason).toBe("tokutei-shinzoku-tokubetsu-koujo-not-data");
  });

  it("社会保険料が概算のときは、その旨の caveat が立つ", () => {
    const est = estimateShotokuwari({
      ...input,
      socialInsurance: { kind: "estimate", prefecture: "大阪府" },
    });
    expect(est.kind).toBe("estimated");
    if (est.kind !== "estimated") return;
    expect(est.breakdown.socialInsuranceIsEstimate).toBe(true);
    expect(est.caveats.some((c) => c.includes("社会保険料を年収からの概算"))).toBe(true);

    const actual = estimateShotokuwari(input);
    expect(actual.kind).toBe("estimated");
    if (actual.kind !== "estimated") return;
    expect(actual.breakdown.socialInsuranceIsEstimate).toBe(false);
    expect(actual.caveats.some((c) => c.includes("社会保険料を年収からの概算"))).toBe(false);
  });

  it("社会保険料の概算は、自治体の公式計算例の対収入比の幅に収まる", () => {
    // 大阪市の例は 10.0%、名古屋市の例は 15.0%。概算はこの間に入る
    const e = estimateSocialInsurance(5_000_000, "大阪府");
    expect(e).not.toBeNull();
    expect((e as number) / 5_000_000).toBeGreaterThan(0.1);
    expect((e as number) / 5_000_000).toBeLessThan(0.15);
  });

  it("年収220万円未満では、別表第五の刻みが未収録である旨の caveat が立つ", () => {
    const r = estimateShotokuwari(withActual(200_000, { salary: 2_000_000, isDesignatedCity: false }));
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.caveats.some((c) => c.includes("別表第五"))).toBe(true);
  });

  it("所得割額は0円未満にならない（所得控除が給与所得を上回るケース）", () => {
    // 年収130万 → 給与所得65万。社保30万＋基礎43万＝73万 > 65万
    const r = estimateShotokuwari(withActual(300_000, { salary: 1_300_000, isDesignatedCity: false }));
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.breakdown.salaryIncome).toBe(650_000);
    expect(r.breakdown.deductionTotal).toBe(730_000);
    expect(r.breakdown.taxableIncome).toBe(0);
    expect(r.breakdown.shotokuwari).toBe(0);
    expect(r.range.min).toBe(0);
  });

  it("課税総所得金額は1,000円未満切捨て", () => {
    const r = estimateShotokuwari(withActual(0, { salary: 3_000_000, isDesignatedCity: false }));
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.breakdown.taxableIncome % 1000).toBe(0);
  });
});

describe("8a — 階層の推計（★前処理を代行しない★）", () => {
  const richInput = withActual(700_000, {
    salary: 6_000_000,
    hasSpouse: true,
    dependents: { under16: 1 },
    isDesignatedCity: true,
  });

  it("★政令指定都市は前処理が必要なので階層を返さない★（階層表は6%ベース、市民税所得割は8%）", () => {
    // 収集済み12自治体のうち、東京23区以外の6件はすべて政令指定都市
    for (const id of [
      "kanagawa-yokohama",
      "osaka-osaka",
      "kanagawa-kawasaki",
      "aichi-nagoya",
      "hokkaido-sapporo",
      "fukuoka-fukuoka",
    ]) {
      const m = getMunicipality(id);
      expect(m, id).toBeDefined();
      expect(requiresPreprocessing(m!, true), id).toBe(true);

      const r = estimateTier(id, richInput, "incomeTaxed");
      expect(r.kind, id).toBe("preprocessing-required");
      if (r.kind !== "preprocessing-required") return;
      // bracketBasis.note の原文をそのまま返す（UIが提示する）
      expect(r.note.length).toBeGreaterThan(0);
      expect(r.note).toBe(m!.bracketBasis?.note);
      // 所得割額の推計自体は返す（前処理はユーザーが行う）
      expect(r.shotokuwari.breakdown.shotokuwari).toBeGreaterThan(0);
      expect(r.caveats.some((c) => c.includes("換算を代行しません")), id).toBe(true);
    }
  });

  it("★横浜市は note に換算の語がないが、政令指定都市なので前処理が必要と判定される★", () => {
    // 横浜市の note の計算式は「（合計所得金額－所得控除）×市民税率（6％）－調整控除額－…」。
    // 「6／8」等の語が無いため note のキーワードだけでは検出できない。指定都市かどうかで判定する必要がある
    const m = getMunicipality("kanagawa-yokohama")!;
    expect(m.bracketBasis?.note).not.toContain("6／8");
    expect(requiresPreprocessing(m, true)).toBe(true);
  });

  it("★非指定都市でも note に調整控除以外の前処理の指示があれば階層を返さない★", () => {
    // 江戸川区=「8分の6」、世田谷区=「定額減税」
    for (const id of ["tokyo-edogawa", "tokyo-setagaya"]) {
      const m = getMunicipality(id)!;
      expect(requiresPreprocessing(m, false), id).toBe(true);
      const r = estimateTier(id, { ...richInput, isDesignatedCity: false }, "incomeTaxed");
      expect(r.kind, id).toBe("preprocessing-required");
    }
  });

  it("税額控除を「適用しない」という指示（deductionsIgnored）は前処理には当たらない", () => {
    // 本モジュールはもともと住宅ローン控除・ふるさと納税等の税額控除を適用していないため条件を満たす
    const m = getMunicipality("tokyo-suginami")!;
    expect(m.bracketBasis?.deductionsIgnored?.length).toBeGreaterThan(0);
    expect(requiresPreprocessing(m, false)).toBe(false);
  });

  it("前処理が不要な自治体（杉並区）では階層まで推計できる", () => {
    const r = estimateTier(
      "tokyo-suginami",
      { ...richInput, isDesignatedCity: false },
      "incomeTaxed",
    );
    expect(r.kind).toBe("estimated");
    if (r.kind !== "estimated") return;
    expect(r.isEstimate).toBe(true);
    expect(r.tier.tier.length).toBeGreaterThan(0);
    expect(r.tierRange.length).toBeGreaterThanOrEqual(1);
  });

  it("★課税状況を所得割額より先に見る★ 同じ年収でも welfare/nonTaxable は所得割額で判定しない", () => {
    const welfare = estimateTier("tokyo-suginami", { ...richInput, isDesignatedCity: false }, "welfare");
    const nonTaxable = estimateTier(
      "tokyo-suginami",
      { ...richInput, isDesignatedCity: false },
      "nonTaxable",
    );
    expect(welfare.kind).toBe("estimated");
    expect(nonTaxable.kind).toBe("estimated");
    if (welfare.kind !== "estimated" || nonTaxable.kind !== "estimated") return;
    expect(welfare.tier.isWelfare).toBe(true);
    expect(nonTaxable.tier.isNonTaxable).toBe(true);
    expect(welfare.tier.tier).not.toBe(nonTaxable.tier.tier);
  });

  it("推計の幅が階層の境界をまたぐ場合、tierRange が2件以上になり caveat が立つ", () => {
    // 杉並区の階層境界をまたぐ年収を総当たりで探す（データに依存しない書き方）
    const m = getMunicipality("tokyo-suginami")!;
    let found = false;
    for (let salary = 3_000_000; salary <= 12_000_000 && !found; salary += 4_000) {
      const r = estimateTier(
        "tokyo-suginami",
        withActual(0, { salary, isDesignatedCity: false }),
        "incomeTaxed",
      );
      if (r.kind === "estimated" && r.tierRange.length > 1) {
        found = true;
        expect(r.caveats.some((c) => c.includes("階層を1つに絞れていません"))).toBe(true);
      }
    }
    expect(found, `${m.id} で境界をまたぐケースが見つからなかった`).toBe(true);
  });

  /**
   * ★この「未収集の自治体」は、収集が進むたびに実際に未収集のものへ差し替える★
   * 京都市が当初この役を担っていたが収集済みになったため、中核市（未着手）に差し替えた。
   * 収録済みの id を書くと（政令市なら preprocessing-required 等が返って）テストの前提が消える。
   */
  it("未収集の自治体は unavailable を返す（推測しない）", () => {
    const r = estimateTier("tochigi-utsunomiya", richInput, "incomeTaxed");
    expect(r.kind).toBe("unavailable");
    if (r.kind !== "unavailable") return;
    expect(r.reason).toBe("municipality-not-found");
  });

  it("推計できない入力（配偶者特別控除）では階層も返さない", () => {
    const r = estimateTier(
      "tokyo-suginami",
      { ...richInput, isDesignatedCity: false, hasSpouseSpecialDeduction: true },
      "incomeTaxed",
    );
    expect(r.kind).toBe("unavailable");
  });
});

describe("8a — データ依存の健全性", () => {
  it("税率はデータから読んでいる（6%／指定都市8%）", () => {
    expect(juuminzei.data.shotokuwari.shichousonminzeiRate.value).toBe(0.06);
    expect(juuminzei.data.shotokuwari.shiteitoshiShiminzeiRate.value).toBe(0.08);
  });

  it("★保育料は令和8年度課税＝令和7年分所得★ juuminzei の fiscalYear と incomeYear の対応", () => {
    expect(juuminzei.fiscalYear).toBe(2026);
    expect(juuminzei.data.taxYearRule.incomeYear.value).toBe(2025);
    // 令和8年度課税に適用される給与所得控除の最低保障額は65万円（74万円ではない）
    expect(juuminzei.data.shotokuKoujo.kyuyoShotokuKoujo.minimumFY2026.value).toBe(650_000);
    expect(kyuyoShotokuKoujoFY2025(1_000_000)).toBe(650_000);
  });

  it("生命保険料控除の合計限度額（範囲の下限の根拠）がデータに存在する", () => {
    const row = juuminzei.data.shotokuKoujo.otherDeductions.rows.find(
      (r) => r.kind === "生命保険料控除（合計限度）",
    );
    expect(row?.deduction).toBe(70_000);
  });
});
