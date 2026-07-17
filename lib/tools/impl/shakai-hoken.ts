/**
 * 社会保険料（健康保険・介護保険・子ども・子育て支援金・厚生年金・雇用保険）の概算モジュール。
 *
 * すべての制度数値は data/seido/ から読む。ここに数値を書かない。
 * （唯一の例外は「0」「1」「2」「12」のような算術・端数処理上の定数と、率の分母）
 *
 * ★このモジュールが解いた「8a の最大誤差源」★（BACKLOG P2-D02）
 *   従来の概算は「年収 × 全国平均料率」で、①標準報酬月額の等級表を使わない ②厚生年金の
 *   上限（標準報酬月額650,000円）を無視する ③都道府県別の健康保険料率を使わない、の3点で
 *   誤差を生んでいた。本モジュールは協会けんぽの料額表（kyoukaikenpo-hokenryo.json）から
 *   等級表と都道府県別料率を読み、実際の保険料の計算手順どおりに積み上げる。
 *
 * ★年度の選択を間違えないこと★
 *   保育料（8a）は令和8年度課税＝令和7年分の所得を扱うため、その年に実際に納めた保険料＝
 *   令和7年度料率（"FY2025"）を使う。令和8年度料率（"FY2026"）を使うと、
 *   ①健康保険料率が令和8年度に引き下げられている ②子ども・子育て支援金（0.23%）は
 *   令和8年4月分からの新設で令和7年分には存在しない、の2点で社会保険料控除を誤る。
 *
 * ★このモジュールは「概算」であり実額ではない★
 *   最大の未知数は賞与の有無である（下記 MODELING_ASSUMPTION）。源泉徴収票の
 *   「社会保険料等の金額」が手に入るなら常にそちらが正しい。
 */

import kyoukaikenpo from "@/data/seido/kyoukaikenpo-hokenryo.json";
import koyouHoken from "@/data/seido/koyou-hoken-ryoritsu.json";
import type { SeidoDataset } from "@/lib/tools/seido";

const KK = kyoukaikenpo.data;
const KY = koyouHoken.data;

/** 出典表示（SeidoNotice）用。準拠年度・次回改定・免責はここから導出する */
export const kyoukaikenpoDataset = kyoukaikenpo as unknown as SeidoDataset;
export const koyouHokenDataset = koyouHoken as unknown as SeidoDataset;

// ---------------------------------------------------------------- 型

/**
 * 料率の年度。
 * - "FY2025" = 令和7年度（令和7年3月分〜令和8年2月分）。★保育料8a（令和7年分の所得）はこちら★
 * - "FY2026" = 令和8年度（令和8年3月分〜）。現在の手取りを出すツールはこちら
 */
export type RateYear = "FY2025" | "FY2026";

export interface HyojunHoshuGrade {
  /** 健康保険の等級（1〜50） */
  grade: number;
  /** 厚生年金の等級（1〜32）。健康保険の第1〜3・第36〜50等級では null */
  pensionGrade: number | null;
  /** 標準報酬月額（円） */
  standardMonthlyRemuneration: number;
  /** 報酬月額の下限（以上）。第1等級は null */
  remunerationMin: number | null;
  /** 報酬月額の上限（未満）。第50等級は null */
  remunerationMax: number | null;
}

export interface SocialInsuranceBreakdown {
  /** 健康保険料（本人負担・年額） */
  kenkoHoken: number;
  /** 介護保険料（本人負担・年額）。第2号被保険者でなければ0 */
  kaigoHoken: number;
  /** 子ども・子育て支援金（本人負担・年額）。令和7年度は0（制度開始前） */
  kodomoKosodateShienkin: number;
  /** 厚生年金保険料（本人負担・年額） */
  kouseiNenkin: number;
  /** 雇用保険料（本人負担・年額） */
  koyouHoken: number;
}

export interface SocialInsuranceEstimate {
  /** 本人負担の合計（年額）。所得税・住民税の社会保険料控除に使う額 */
  total: number;
  breakdown: SocialInsuranceBreakdown;
  /** 本モデルが用いた報酬月額（年収 ÷ 12） */
  monthlyRemuneration: number;
  /** 健康保険の等級 */
  kenkoGrade: HyojunHoshuGrade;
  /** 厚生年金の標準報酬月額（上限650,000円で頭打ち） */
  pensionStandardMonthlyRemuneration: number;
  /** 厚生年金の等級（1〜32） */
  pensionGrade: number;
  /** 適用した健康保険料率（都道府県別） */
  healthInsuranceRate: number;
  prefecture: string;
  year: RateYear;
  /** ★厚生年金の上限に張り付いているか★ true のとき賞与の有無で誤差が大きくなる */
  pensionCapped: boolean;
}

/**
 * ★本モジュールの唯一のモデル仮定★
 *
 * 年収からは「月給と賞与の内訳」が分からない。本モジュールは
 * **賞与なし・年収を12等分した額が毎月の報酬月額**として計算する。
 *
 * この仮定が効くのは**厚生年金の上限に張り付く高収入者だけ**である。
 * 厚生年金の標準報酬月額の上限は650,000円（報酬月額635,000円以上で頭打ち）なので、
 * 年収が 635,000 × 12 ＝ 762万円 を下回る限り上限には当たらず、賞与の有無は
 * 保険料にほとんど影響しない（賞与にも同じ料率がかかるため、課税ベースの合計は
 * 月給・賞与の内訳によらずほぼ年収に一致する）。
 *
 * 年収が762万円を超えると、賞与のある人は実際には上限に当たりにくい（月給が下がるため）
 * のに対し、本モデルは上限に当てて厚生年金保険料を**過小**に見積もる。
 * この領域では pensionCapped を true にして呼び出し側が注意書きを出せるようにしている。
 */
export const MODELING_ASSUMPTION =
  "賞与なし・年収を12等分した額を報酬月額とみなして計算しています。厚生年金の上限（標準報酬月額650,000円）に達する年収では、賞与の有無により実際の保険料と差が出ます。";

// ---------------------------------------------------------------- 端数処理

/**
 * 料率（小数）を 1/10000 単位の整数に直す。
 *
 * ★浮動小数を避けるため★ 保険料の折半額は「50銭ちょうどは切り捨て」という
 * 境界ルールを持つ（hasuuShori.kyuyoKaranoKojo）。JavaScript の浮動小数のまま計算すると
 * 58,000 × 0.0985 ÷ 2 が 2856.5000000000005 となり、50銭ちょうどが「50銭超」と誤判定されて
 * 切り上がってしまう（正解は 2,856円）。整数演算に移して境界を厳密に判定する。
 */
function rateToBasis(rate: number): number {
  return Math.round(rate * 10000);
}

/**
 * 保険料の本人負担分（折半額）を1か月分、円単位で求める。
 *
 * 原典（kyoukaikenpo-hokenryo.json の hasuuShori.kyuyoKaranoKojo）:
 * 「被保険者負担分の端数が50銭以下の場合は切り捨て、50銭を超える場合は切り上げて1円」
 *
 * ★四捨五入ではない★ 50銭ちょうどは切り捨てる。
 * ★全額を折半してから丸める★ 料率を半分にしてから乗じるのではない。
 *
 * @param base 標準報酬月額（円）
 * @param rateBasis 料率（1/10000単位の整数。例: 9.85% → 985）
 */
export function halfPremiumPerMonth(base: number, rateBasis: number): number {
  // base × rateBasis / 10000 が全額。その半分なので分母は 20000。
  const numerator = base * rateBasis;
  const yen = Math.floor(numerator / 20000);
  const remainder = numerator - yen * 20000;
  // 20000 分の 10000 ＝ ちょうど50銭。「50銭以下は切り捨て」なので <= で切り捨て。
  return remainder <= 10000 ? yen : yen + 1;
}

// ---------------------------------------------------------------- 等級表

const GRADES: HyojunHoshuGrade[] = KK.hyojunHoshuGetsugaku.rows.map((r) => ({
  grade: r.grade,
  pensionGrade: r.pensionGrade,
  standardMonthlyRemuneration: r.standardMonthlyRemuneration,
  remunerationMin: r.remunerationMin,
  remunerationMax: r.remunerationMax,
}));

const OVERRIDE = KK.hyojunHoshuGetsugaku.pensionRemunerationOverride;

/** 標準報酬月額の等級表（健康保険・全50等級）。テスト・表示用に公開する */
export function hyojunHoshuGrades(): HyojunHoshuGrade[] {
  return GRADES;
}

/**
 * 報酬月額 → 健康保険の等級。
 * remunerationMin は「以上」、remunerationMax は「未満」。
 */
export function kenkoHokenGradeOf(monthlyRemuneration: number): HyojunHoshuGrade {
  const m = Math.max(0, monthlyRemuneration);
  for (const g of GRADES) {
    const okMin = g.remunerationMin === null || m >= g.remunerationMin;
    const okMax = g.remunerationMax === null || m < g.remunerationMax;
    if (okMin && okMax) return g;
  }
  // 等級表は第1等級の下限・第50等級の上限が null で連続しているため到達しない。
  throw new Error(`等級表に該当する等級がない: ${monthlyRemuneration}`);
}

/**
 * 報酬月額 → 厚生年金の標準報酬月額と等級。
 *
 * ★健康保険の等級表をそのまま使ってはいけない★（実装で最も間違えやすい箇所）
 * 原典の注記により、厚生年金では両端の境界を読み替える:
 *   - 報酬月額 93,000円未満  → 第1等級（標準報酬月額 88,000円）
 *   - 報酬月額 635,000円以上 → 第32等級（標準報酬月額 650,000円）で頭打ち
 */
export function pensionStandardOf(monthlyRemuneration: number): {
  grade: number;
  standardMonthlyRemuneration: number;
  capped: boolean;
} {
  const m = Math.max(0, monthlyRemuneration);
  const lower = GRADES.find((g) => g.grade === OVERRIDE.lowerGrade);
  const upper = GRADES.find((g) => g.grade === OVERRIDE.upperGrade);
  if (!lower || !upper) throw new Error("厚生年金の上下限等級がデータにない");

  if (m < OVERRIDE.lowerRemunerationMax) {
    return {
      grade: OVERRIDE.lowerPensionGrade,
      standardMonthlyRemuneration: lower.standardMonthlyRemuneration,
      capped: false,
    };
  }
  if (m >= OVERRIDE.upperRemunerationMin) {
    return {
      grade: OVERRIDE.upperPensionGrade,
      standardMonthlyRemuneration: upper.standardMonthlyRemuneration,
      capped: true,
    };
  }
  const g = kenkoHokenGradeOf(m);
  if (g.pensionGrade === null) {
    // 上下限の読み替えで挟んでいるため到達しない。
    throw new Error(`厚生年金の等級が定まらない: ${monthlyRemuneration}`);
  }
  return {
    grade: g.pensionGrade,
    standardMonthlyRemuneration: g.standardMonthlyRemuneration,
    capped: false,
  };
}

// ---------------------------------------------------------------- 料率

interface YearRates {
  healthByPrefecture: { prefecture: string; rate: number }[];
  kaigo: number;
  shienkin: number;
  kouseiNenkin: number;
  koyouWorker: number;
}

function koyouWorkerRate(section: { rows: { businessType: string; worker: number }[] }): number {
  const row = section.rows.find((r) => r.businessType === "一般の事業");
  if (!row) throw new Error("雇用保険料率に『一般の事業』の行がない");
  return row.worker;
}

const RATES: Record<RateYear, YearRates> = {
  FY2025: {
    healthByPrefecture: KK.ratesFY2025.kenkoHoken.rows.map((r) => ({
      prefecture: r.prefecture,
      rate: r.rate,
    })),
    kaigo: KK.ratesFY2025.kaigoHoken.value,
    shienkin: KK.ratesFY2025.kodomoKosodateShienkin.value,
    kouseiNenkin: KK.ratesFY2025.kouseiNenkin.value,
    koyouWorker: koyouWorkerRate(KY.ratesFY2025),
  },
  FY2026: {
    healthByPrefecture: KK.rates.kenkoHoken.rows.map((r) => ({
      prefecture: r.prefecture,
      rate: r.rate,
    })),
    kaigo: KK.rates.kaigoHoken.value,
    shienkin: KK.rates.kodomoKosodateShienkin.value,
    kouseiNenkin: KK.rates.kouseiNenkin.value,
    koyouWorker: koyouWorkerRate(KY.ratesFY2026),
  },
};

/** 収録されている都道府県名の一覧（47件） */
export function prefectures(): string[] {
  return RATES.FY2026.healthByPrefecture.map((r) => r.prefecture);
}

/**
 * 都道府県別の健康保険料率。★収録外の名称なら null（推測しない）★
 * 都道府県名は「東京都」「大阪府」「北海道」「神奈川県」のように接尾辞まで含めた正式名称で渡すこと。
 */
export function healthInsuranceRateOf(prefecture: string, year: RateYear): number | null {
  const row = RATES[year].healthByPrefecture.find((r) => r.prefecture === prefecture);
  return row ? row.rate : null;
}

// ---------------------------------------------------------------- 概算本体

export interface SocialInsuranceEstimateInput {
  /** 給与収入（額面・年額）。円 */
  annualSalary: number;
  /** 都道府県（正式名称）。健康保険料率の決定に使う */
  prefecture: string;
  /** 料率の年度。★保育料8aは "FY2025"★ */
  year: RateYear;
  /** 介護保険第2号被保険者（40歳以上65歳未満）か。既定 false */
  isKaigoDaini?: boolean;
}

const MONTHS = 12;

/**
 * 年収 → 社会保険料（本人負担・年額）の概算。
 *
 * 計算手順（協会けんぽの料額表の計算手順どおり）:
 *   1. 報酬月額 ＝ 年収 ÷ 12（★モデル仮定。MODELING_ASSUMPTION 参照★）
 *   2. 報酬月額 → 等級表 → 標準報酬月額（健保・厚年で別々。厚年は両端の読み替えあり）
 *   3. 各保険料 ＝ 標準報酬月額 × 料率 を折半し、1か月ごとに端数処理してから12倍
 *   4. 雇用保険だけは標準報酬月額を使わず、賃金総額（＝年収）に直接料率を乗じる
 *
 * ★収録外の都道府県名なら null を返す（推測しない）★
 */
export function estimateSocialInsurance(
  input: SocialInsuranceEstimateInput,
): SocialInsuranceEstimate | null {
  const rates = RATES[input.year];
  const healthRate = healthInsuranceRateOf(input.prefecture, input.year);
  if (healthRate === null) return null;

  const salary = Math.max(0, Math.floor(input.annualSalary));
  const monthlyRemuneration = Math.floor(salary / MONTHS);

  const kenkoGrade = kenkoHokenGradeOf(monthlyRemuneration);
  const pension = pensionStandardOf(monthlyRemuneration);
  const base = kenkoGrade.standardMonthlyRemuneration;

  // ★各保険料は別建てで端数処理する★ 原典の料額表が健康保険・子ども子育て支援金・
  // 厚生年金を別々の欄（それぞれ全額・折半額）で示しており、合算してから丸めるのではない。
  const kenkoHoken = halfPremiumPerMonth(base, rateToBasis(healthRate)) * MONTHS;
  const kaigoHoken = input.isKaigoDaini
    ? halfPremiumPerMonth(base, rateToBasis(rates.kaigo)) * MONTHS
    : 0;
  const kodomoKosodateShienkin =
    rates.shienkin > 0 ? halfPremiumPerMonth(base, rateToBasis(rates.shienkin)) * MONTHS : 0;
  const kouseiNenkin =
    halfPremiumPerMonth(pension.standardMonthlyRemuneration, rateToBasis(rates.kouseiNenkin)) *
    MONTHS;

  // ★雇用保険は標準報酬月額を使わない★ 賃金総額（賞与を含む実際の支払額）に料率を乗じる。
  // 折半ではなく労働者負担分の料率をそのまま用いる（事業主は別に二事業分を負担する）。
  const koyou = Math.floor((salary * rateToBasis(rates.koyouWorker)) / 10000);

  const breakdown: SocialInsuranceBreakdown = {
    kenkoHoken,
    kaigoHoken,
    kodomoKosodateShienkin,
    kouseiNenkin,
    koyouHoken: koyou,
  };

  return {
    total:
      kenkoHoken + kaigoHoken + kodomoKosodateShienkin + kouseiNenkin + koyou,
    breakdown,
    monthlyRemuneration,
    kenkoGrade,
    pensionStandardMonthlyRemuneration: pension.standardMonthlyRemuneration,
    pensionGrade: pension.grade,
    healthInsuranceRate: healthRate,
    prefecture: input.prefecture,
    year: input.year,
    pensionCapped: pension.capped,
  };
}
