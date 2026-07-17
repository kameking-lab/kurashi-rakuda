/**
 * 保育料計算 全国版 — 年収→市町村民税所得割額→階層 の【推計】モジュール（specs/s-tools/01 §3.2 の 8a）。
 *
 * すべての制度数値は data/seido/ から読む。ここに数値を書かない。
 * （唯一の例外は「0」「1」「100」のような算術・端数処理上の定数と、率の分母）
 *
 * ★このモジュールは「推計」であり確定値ではない★（BACKLOG Q3-09 の解禁条件）
 *   (a) 返す金額には必ず「推計値」ラベルを添えること。範囲（range）を併せて提示すること。
 *       主たる誤差源は生命保険料控除等のユーザー固有の所得控除で、これは推計できない。
 *   (b) 配偶者特別控除・特定親族特別控除の逓減行は未データ化のため、該当時は推計しない（null を返す）。
 *   (c) ★均等割の非課税は断定しない★ 地方税法施行令第47条の3は「参酌して定める」であり、
 *       市町村が条例で異なる額を定めうる（juuminzei.json の municipalVariationWarning）。
 *       本モジュールは均等割の非課税判定を行わない。入力5（課税状況）を優先する方針は変えない。
 *
 * ★所得割の非課税限度額は級地に依存せず全国一律45万円★（地方税法附則第3条の3）なので、
 *   所得割が非課税かどうかだけは自治体差なしで判定できる（C階層の判定に効く）。
 *   級地（1級地1.0／2級地0.9／3級地0.8）が効くのは均等割の側だけであり、そちらは断定しない。
 *
 * ★このモジュールは自治体ごとの「前処理」を代行しない★（specs/s-tools/01 §4 ステップ4・§9.1）
 *   6/8換算・税源移譲前税率などの換算式は構造化データが無く、実装すると数値の直書きになる。
 *   estimateTier() は前処理が必要な自治体では階層を返さず、bracketBasis.note の原文提示を求める。
 */

import juuminzei from "@/data/seido/juuminzei.json";
import kyuyoKoujo from "@/data/seido/kyuyo-shotoku-koujo.json";
import type { SeidoDataset } from "@/lib/tools/seido";
import {
  estimateSocialInsurance as estimateShakaiHoken,
  healthInsuranceRateOf,
  MODELING_ASSUMPTION,
  type SocialInsuranceEstimate,
} from "@/lib/tools/impl/shakai-hoken";
import {
  getMunicipality,
  resolveTier,
  type HoikuryoMunicipality,
  type HoikuryoTier,
  type TaxStatus,
} from "@/lib/tools/impl/hoikuryo";

export const juuminzeiDataset = juuminzei as unknown as SeidoDataset;

const J = juuminzei.data;
const K = kyuyoKoujo.data;

// ---------------------------------------------------------------- 型

/** 扶養親族の構成。★16歳未満（年少）は扶養控除の対象外だが、非課税限度額の算定では数える★ */
export interface Dependents {
  /** 一般の控除対象扶養親族（16歳以上、特定・老人を除く） */
  general?: number;
  /** 特定扶養親族（19歳以上23歳未満） */
  specific?: number;
  /** 老人扶養親族（70歳以上。同居直系尊属を除く） */
  elderly?: number;
  /** 同居直系尊属である老人扶養親族 */
  elderlyCohabiting?: number;
  /** 年少扶養親族（16歳未満）。控除はないが非課税限度額の人数に数える */
  under16?: number;
}

/**
 * 社会保険料。★源泉徴収票の「社会保険料等の金額」があればそれを使う（推計より遥かに正確）★
 *
 * kind: "estimate" のときは prefecture（都道府県）が必須。
 * 健康保険料率は都道府県ごとに異なり（令和7年度で 9.35%〜10.78%）、全国平均で代用すると
 * 最大で年収の0.7%程度の誤差になるため、推測せず必ず居住自治体の都道府県を渡す。
 */
export type SocialInsuranceInput =
  | { kind: "actual"; amount: number }
  | { kind: "estimate"; prefecture: string };

export interface ShotokuwariInput {
  /** 給与収入（額面。源泉徴収票の「支払金額」）。円 */
  salary: number;
  socialInsurance: SocialInsuranceInput;
  /** 控除対象配偶者がいるか（配偶者の合計所得48万円以下かつ本人の合計所得1,000万円以下） */
  hasSpouse?: boolean;
  /** 控除対象配偶者が70歳以上（老人控除対象配偶者）か */
  spouseIsElderly?: boolean;
  /**
   * 配偶者特別控除の対象か（配偶者の合計所得が48万円超133万円以下）。
   * ★true のとき本モジュールは推計しない（逓減行が未データ化。BACKLOG (b)）★
   */
  hasSpouseSpecialDeduction?: boolean;
  /** 特定親族特別控除の対象者がいるか。★true のとき推計しない（同上）★ */
  hasTokuteiShinzokuSpecialDeduction?: boolean;
  dependents?: Dependents;
  /** 政令指定都市に住所を有するか（市民税8%・調整控除4%） */
  isDesignatedCity: boolean;
}

export interface ShotokuwariBreakdown {
  /** ① 給与所得（給与収入 − 給与所得控除） */
  salaryIncome: number;
  /** ① のうち給与所得控除の額 */
  kyuyoShotokuKoujo: number;
  /** ② 社会保険料控除（全額）。推計値か実額かは socialInsuranceIsEstimate で判別 */
  socialInsuranceDeduction: number;
  socialInsuranceIsEstimate: boolean;
  /**
   * ② 社会保険料の内訳（推計時のみ。実額入力時は null）。
   * 根拠表示と、厚生年金の上限に張り付いた場合の注意喚起に使う。
   */
  socialInsuranceDetail: SocialInsuranceEstimate | null;
  /** ② 基礎控除（住民税43万円。★所得税の基礎控除を流用しないこと★） */
  kisoKoujo: number;
  /** ② 配偶者控除 */
  haiguushaKoujo: number;
  /** ② 扶養控除 */
  fuyouKoujo: number;
  /** ② 所得控除の合計 */
  deductionTotal: number;
  /** ③ 課税総所得金額（1,000円未満切捨て） */
  taxableIncome: number;
  /** ④ 税額控除前の所得割額（課税総所得 × 6% または 8%） */
  shotokuwariBeforeCredit: number;
  /** ⑤ 人的控除額の差の合計額（調整控除の計算に使う） */
  personalDeductionDifference: number;
  /** ⑤ 調整控除（市町村民税分。3% または 指定都市4%） */
  chouseiKoujo: number;
  /** ⑥ 市町村民税所得割額（税額控除前 − 調整控除）。★これが推計の主結果★ */
  shotokuwari: number;
}

export type ShotokuwariUnavailableReason =
  | "haiguusha-tokubetsu-koujo-not-data"
  | "tokutei-shinzoku-tokubetsu-koujo-not-data"
  | "salary-out-of-range"
  | "prefecture-not-supported";

export type ShotokuwariEstimate =
  | {
      kind: "estimated";
      /** ★必ず「推計値」ラベルを添えて表示すること★ */
      isEstimate: true;
      breakdown: ShotokuwariBreakdown;
      /**
       * 所得割額の推計範囲 [下限, 上限]。
       * 上限 = breakdown.shotokuwari（モデル化した控除のみを適用した額）
       * 下限 = さらに生命保険料控除の合計限度額を適用した額
       * ★未モデル化の控除（地震保険料控除・医療費控除等）があれば下限を下回りうる★
       */
      range: { min: number; max: number };
      /** 合計所得金額が所得割の非課税限度額以下か。★全国一律のため自治体差なしで断定できる★ */
      isShotokuwariNonTaxable: boolean;
      /** 所得割の非課税限度額（合計所得金額ベース） */
      shotokuwariNonTaxableLimit: number;
      /** 推計の限界。UIにそのまま出せる日本語 */
      caveats: string[];
    }
  | { kind: "unavailable"; reason: ShotokuwariUnavailableReason; note: string };

// ---------------------------------------------------------------- ① 給与所得

/** 別表第五の適用上限（660万円以上は速算表を直接適用する）。tableFY2025 の区分境界から読む */
const BETSUHYOU5_MAX = (() => {
  const row = K.tableFY2025.rows.find((r) => r.incomeMax === 6_600_000);
  if (!row?.incomeMax) throw new Error("tableFY2025 に660万円の区分境界がない");
  return row.incomeMax;
})();

/**
 * 4,000円切捨てを適用する下限（220万円）。この額以上660万円未満で、切捨て＋速算表が別表第五と一致する。
 * 根拠: kyuyo-shotoku-koujo.json の betsuhyou5.equivalenceRule（220万円以上660万円未満）
 */
const TRUNCATE_MIN = (() => {
  const v = K.tableFY2026.rows[0].incomeMax;
  if (v === null) throw new Error("tableFY2026 の第1区分に上限がない");
  return v;
})();

/** 給与収入を別表第五の刻みに合わせて切り捨てる（該当範囲外はそのまま返す） */
function betsuhyou5Base(salary: number): number {
  if (salary < TRUNCATE_MIN || salary >= BETSUHYOU5_MAX) return salary;
  const granularity = K.betsuhyou5.granularity.value;
  return Math.floor(salary / granularity) * granularity;
}

/**
 * 給与収入 → 給与所得控除額（令和7年分＝令和8年度課税）。
 * 根拠: kyuyo-shotoku-koujo.json の tableFY2025（最低保障額65万円）
 *
 * ★令和8年分の74万円の表（tableFY2026）を使ってはならない★
 * 保育料の階層は令和8年度課税の所得割額で判定し、その所得は令和7年分。
 * 個人住民税で最低保障額が74万円になるのは令和9年度分から（juuminzei.json の amendments）。
 */
export function kyuyoShotokuKoujoFY2025(salary: number): number | null {
  for (const r of K.tableFY2025.rows) {
    if (salary < r.incomeMin) continue;
    if (r.incomeMax !== null && salary > r.incomeMax) continue;
    if (r.deduction !== null) return Math.min(r.deduction, salary); // 定額（収入がそれ未満なら収入額）
    // formula: "収入金額×30％＋80,000円" 等。★浮動小数を避け整数演算★
    const m = /×(\d+)％＋([\d,]+)円/.exec(r.formula);
    if (!m) return null; // 想定外の書式 → 推測しない
    const pct = Number(m[1]);
    const add = Number(m[2].replace(/,/g, ""));
    return Math.floor((salary * pct) / 100) + add;
  }
  return null;
}

/**
 * 給与収入 → 給与所得（令和7年分＝令和8年度課税）。
 *
 * ★別表第五の罠★ 給与収入が660万円未満のときは、法令上は速算表ではなく所得税法別表第五が適用される
 * （同法第28条第4項）。220万円以上660万円未満では「収入を4,000円単位に切り捨ててから速算表を適用」した値が
 * 別表第五と一致する（kyuyo-shotoku-koujo.json の betsuhyou5.equivalenceRule）。
 * 同ノードの機械照合は令和8年分の別表第五に対するものだが、令和8年度課税（令和7年分）の自治体の公式計算例
 * 3件（大阪市・名古屋市・調布市）でも同じ切捨てで公表値と完全に一致することを確認している
 * （tests/hoikuryo-shotokuwari.test.ts の照合アンカー）。
 *
 * ★220万円未満は切り捨てない★ 別表第五のこの範囲は刻み幅が異なり（2,000円刻みの区分がある）、
 * 令和7年分の当該範囲は本データセットに未収録のため、速算表を直接適用し caveat を立てる。
 */
export function salaryIncomeFY2025(salary: number): number | null {
  const base = betsuhyou5Base(salary);
  const koujo = kyuyoShotokuKoujoFY2025(base);
  if (koujo === null) return null;
  return Math.max(0, base - koujo);
}

// ---------------------------------------------------------------- ② 所得控除

/**
 * 社会保険料の概算（源泉徴収票の実額が無い場合のみ）。
 * 根拠: kyoukaikenpo-hokenryo.json（標準報酬月額等級表・都道府県別料率）＋ koyou-hoken-ryoritsu.json
 *
 * ★2026-07-17 実額ベースへ改善（P2-D02）★ 従来は「年収 × 全国平均料率」で、
 * ①等級表を使わない ②厚生年金の上限（標準報酬月額650,000円）を無視する
 * ③都道府県別料率を使わない ④令和8年度の料率を令和7年分に当てていた、の4点で誤差を生んでいた。
 * 現在は協会けんぽの料額表の計算手順どおりに積み上げる（lib/tools/impl/shakai-hoken.ts）。
 *
 * ★令和7年度料率（"FY2025"）を使う★ 保育料の階層は令和8年度課税＝令和7年分の所得で判定し、
 * その所得から差し引かれる社会保険料控除は「令和7年分に実際に納めた保険料」である。
 * ★子ども・子育て支援金（0.23%）は令和8年4月分からの新設で令和7年分には存在しない★ ため、
 * FY2025 では 0 になる（含めると社会保険料控除を過大に見積もり、所得割額を過小に推計する）。
 *
 * ★都道府県が収録外なら null★ 推測しない。呼び出し側は実額入力へ誘導する。
 */
export function estimateSocialInsurance(
  salary: number,
  prefecture: string,
): number | null {
  const r = estimateSocialInsuranceDetail(salary, prefecture);
  return r === null ? null : r.total;
}

/** 内訳つきの社会保険料概算（根拠表示・テスト用） */
export function estimateSocialInsuranceDetail(
  salary: number,
  prefecture: string,
): SocialInsuranceEstimate | null {
  return estimateShakaiHoken({
    annualSalary: salary,
    prefecture,
    // ★保育料は令和7年分の所得が基準★ 令和8年度料率を使わないこと。
    year: "FY2025",
    // ★介護保険第2号被保険者（40歳以上）かは本ツールが尋ねていないため false 固定★
    // 40歳以上の保護者では社会保険料を過小に見積もる（＝所得割額を過大に推計する）。
    // 推計を安全側（保育料を高めに）に倒す方向であり、caveat で明示する。
    isKaigoDaini: false,
  });
}

/** 個人住民税の基礎控除（合計所得2,400万円以下は43万円）。★所得税の基礎控除とは全く違う★ */
export function kisoKoujo(): number {
  return J.shotokuKoujo.kiso.baseAmount.value;
}

/** 配偶者控除（所得者の合計所得金額により3段階に逓減） */
export function haiguushaKoujo(
  earnerTotalIncome: number,
  opts: { hasSpouse?: boolean; spouseIsElderly?: boolean },
): number {
  if (!opts.hasSpouse) return 0;
  for (const row of J.shotokuKoujo.haiguushaKoujo.rows) {
    if (row.earnerTotalIncomeMax === null) return 0; // 1,000万円超は適用なし
    if (earnerTotalIncome <= row.earnerTotalIncomeMax) {
      return opts.spouseIsElderly ? row.deductionElderly : row.deduction;
    }
  }
  return 0;
}

function fuyouRow(kind: string): number {
  const row = J.shotokuKoujo.fuyouKoujo.rows.find((r) => r.kind === kind);
  if (!row) throw new Error(`扶養控除の区分がデータにない: ${kind}`);
  return row.deduction;
}

/** 扶養控除。★16歳未満（年少扶養親族）は対象外★ */
export function fuyouKoujo(d: Dependents = {}): number {
  return (
    (d.general ?? 0) * fuyouRow("一般の控除対象扶養親族") +
    (d.specific ?? 0) * fuyouRow("特定扶養親族") +
    (d.elderly ?? 0) * fuyouRow("老人扶養親族") +
    (d.elderlyCohabiting ?? 0) * fuyouRow("同居直系尊属である老人扶養親族")
  );
}

// ---------------------------------------------------------------- ⑤ 調整控除

function additionRow(kind: string): number {
  const row = J.chouseiKoujo.additionTable.rows.find((r) => r.kind === kind);
  if (!row) throw new Error(`調整控除の加算区分がデータにない: ${kind}`);
  return row.amount;
}

/**
 * 人的控除額の差の合計額（地方税法第314条の6第1号イ）。
 *
 * ★条文の構造に注意★ 基礎控除の差を実額で足すのではなく、条文が「五万円」という固定額を出発点とし、
 * そこに下欄の金額を加算する（juuminzei.json の jintekiKoujoSaBase の note）。
 *
 * ★配偶者に係る加算は所得者の合計所得金額により変わる★（900万円以下5万／900万円超950万円以下4万／
 * 950万円超1,000万円以下2万）が、900万円超の行は additionTable に構造化されておらず note の散文のみのため、
 * 本モジュールは900万円以下の額のみを扱い、900万円超は caveat を立てる。
 */
export function personalDeductionDifference(
  earnerTotalIncome: number,
  opts: { hasSpouse?: boolean; spouseIsElderly?: boolean; dependents?: Dependents },
): number {
  const d = opts.dependents ?? {};
  let sum = J.chouseiKoujo.jintekiKoujoSaBase.value;

  if (opts.hasSpouse) {
    const spouseBracket = J.shotokuKoujo.haiguushaKoujo.rows[0].earnerTotalIncomeMax; // 900万円
    if (spouseBracket !== null && earnerTotalIncome <= spouseBracket) {
      sum += additionRow(
        opts.spouseIsElderly
          ? "老人控除対象配偶者（所得者900万円以下）"
          : "控除対象配偶者（所得者900万円以下・老人でない）",
      );
    }
    // 900万円超の加算額（4万／2万）は additionTable の note にしかないため加算しない（caveat で開示）
  }

  sum += (d.general ?? 0) * additionRow("控除対象扶養親族（一般）");
  sum += (d.specific ?? 0) * additionRow("特定扶養親族");
  sum += (d.elderly ?? 0) * additionRow("老人扶養親族（同居直系尊属を除く）");
  sum += (d.elderlyCohabiting ?? 0) * additionRow("同居直系尊属である老人扶養親族");
  // ★年少扶養親族（16歳未満）は控除対象扶養親族ではないため加算しない★
  return sum;
}

/** 調整控除の率（市町村民税分。3%、政令指定都市は4%）を条文の計算式から読む */
function chouseiKoujoRatePercent(isDesignatedCity: boolean): number {
  const f = J.chouseiKoujo.formula.value;
  const m = /×\s*3％（指定都市は4％）/.exec(f);
  if (!m) throw new Error("調整控除の率を formula から読めない（データ書式が変わった可能性）");
  return isDesignatedCity ? 4 : 3;
}

/** 調整控除の下限（合計課税所得200万円超の場合の{}内の下限＝5万円）を条文の計算式から読む */
function chouseiKoujoFloor(): number {
  const f = J.chouseiKoujo.formula.value;
  const m = /{}内が5万円を下回る場合は5万円/.exec(f);
  if (!m) throw new Error("調整控除の下限を formula から読めない（データ書式が変わった可能性）");
  return J.chouseiKoujo.jintekiKoujoSaBase.value; // 5万円（条文の下限も同額）
}

/** 調整控除の判定に使う合計課税所得金額の分岐点（200万円） */
const CHOUSEI_KOUJO_BRACKET = 2_000_000;

/**
 * 調整控除（市町村民税分。地方税法第314条の6）。★税額控除であり所得控除ではない★
 * 根拠: juuminzei.json の chouseiKoujo.formula
 *
 * 合計課税所得金額が200万円以下: min(人的控除額の差の合計額, 合計課税所得金額) × 3%（指定都市4%）
 * 200万円超: {人的控除額の差の合計額 −（合計課税所得金額 − 200万円）} × 3%（指定都市4%）
 *            ただし{}内が5万円を下回る場合は5万円とする
 */
export function chouseiKoujo(
  taxableIncome: number,
  personalDiff: number,
  isDesignatedCity: boolean,
): number {
  const pct = chouseiKoujoRatePercent(isDesignatedCity);
  const base =
    taxableIncome <= CHOUSEI_KOUJO_BRACKET
      ? Math.min(personalDiff, taxableIncome)
      : Math.max(personalDiff - (taxableIncome - CHOUSEI_KOUJO_BRACKET), chouseiKoujoFloor());
  return Math.floor((base * pct) / 100);
}

// ---------------------------------------------------------------- 非課税限度額（所得割のみ）

/**
 * 所得割の非課税限度額（合計所得金額ベース）。
 * 根拠: juuminzei.json の hikazeiGendogaku.shotokuwari
 *   35万円 ×（同一生計配偶者及び扶養親族の数 ＋ 1）＋ 10万円（有する場合はさらに32万円を加算）
 *
 * ★級地に依存せず全国一律★（地方税法附則第3条の3）。だからC階層（所得割非課税）の判定は自治体差なしで確定できる。
 * ★均等割の非課税限度額は別物で、条例差がありうるため断定しない（本モジュールは判定しない）★
 *
 * 人数には16歳未満の年少扶養親族も含める（扶養控除の対象外でも人数には数える）。
 */
export function shotokuwariNonTaxableLimit(opts: {
  hasSpouse?: boolean;
  dependents?: Dependents;
}): number {
  const s = J.hikazeiGendogaku.shotokuwari;
  const single = s.singlePersonLimit.value; // 45万円 = 35万×1 + 10万
  const d = opts.dependents ?? {};
  const count =
    (opts.hasSpouse ? 1 : 0) +
    (d.general ?? 0) +
    (d.specific ?? 0) +
    (d.elderly ?? 0) +
    (d.elderlyCohabiting ?? 0) +
    (d.under16 ?? 0);
  if (count === 0) return single;

  // 35万円 = 単身の限度額 45万円 − 固定加算10万円（算式の構成要素から導出し、数値を直書きしない）
  const perPerson = single - J.hikazeiGendogaku.kintouwari.fixedAddition.value;
  const fixed = J.hikazeiGendogaku.kintouwari.fixedAddition.value;
  return perPerson * (count + 1) + fixed + s.additionForDependents.value;
}

// ---------------------------------------------------------------- 推計本体

/** 課税総所得金額の端数処理（1,000円未満切捨て） */
const TAXABLE_INCOME_UNIT = 1000;

function buildBreakdown(
  input: ShotokuwariInput,
  extraDeduction: number,
): ShotokuwariBreakdown | null {
  const salaryIncome = salaryIncomeFY2025(input.salary);
  if (salaryIncome === null) return null;
  const koujo = kyuyoShotokuKoujoFY2025(betsuhyou5Base(input.salary));
  if (koujo === null) return null;

  const shakaiHokenDetail =
    input.socialInsurance.kind === "estimate"
      ? estimateSocialInsuranceDetail(input.salary, input.socialInsurance.prefecture)
      : null;
  if (input.socialInsurance.kind === "estimate" && shakaiHokenDetail === null) {
    return null; // 収録外の都道府県。推測しない
  }
  const shakaiHoken =
    input.socialInsurance.kind === "actual"
      ? input.socialInsurance.amount
      : (shakaiHokenDetail as SocialInsuranceEstimate).total;

  // ★合計所得金額＝給与所得（給与収入のみを前提とする推計）★
  const totalIncome = salaryIncome;
  const kiso = kisoKoujo();
  const haiguusha = haiguushaKoujo(totalIncome, input);
  const fuyou = fuyouKoujo(input.dependents);
  const deductionTotal = shakaiHoken + kiso + haiguusha + fuyou + extraDeduction;

  const taxableIncome =
    Math.floor(Math.max(0, salaryIncome - deductionTotal) / TAXABLE_INCOME_UNIT) *
    TAXABLE_INCOME_UNIT;

  const ratePercent = Math.round(
    (input.isDesignatedCity
      ? J.shotokuwari.shiteitoshiShiminzeiRate.value
      : J.shotokuwari.shichousonminzeiRate.value) * 100,
  );
  const shotokuwariBeforeCredit = Math.floor((taxableIncome * ratePercent) / 100);

  const personalDiff = personalDeductionDifference(totalIncome, input);
  const chousei = chouseiKoujo(taxableIncome, personalDiff, input.isDesignatedCity);

  return {
    salaryIncome,
    kyuyoShotokuKoujo: koujo,
    socialInsuranceDeduction: shakaiHoken,
    socialInsuranceIsEstimate: input.socialInsurance.kind === "estimate",
    socialInsuranceDetail: shakaiHokenDetail,
    kisoKoujo: kiso,
    haiguushaKoujo: haiguusha,
    fuyouKoujo: fuyou,
    deductionTotal,
    taxableIncome,
    shotokuwariBeforeCredit,
    personalDeductionDifference: personalDiff,
    chouseiKoujo: chousei,
    shotokuwari: Math.max(0, shotokuwariBeforeCredit - chousei),
  };
}

/** 生命保険料控除の合計限度額（範囲の下限の算出に使う。juuminzei.json の otherDeductions） */
function seimeiHokenryouKoujoLimit(): number {
  const row = J.shotokuKoujo.otherDeductions.rows.find((r) => r.kind === "生命保険料控除（合計限度）");
  if (!row || row.deduction === null) {
    throw new Error("生命保険料控除の合計限度額がデータにない");
  }
  return row.deduction;
}

/**
 * 年収 → 市町村民税所得割額（税額控除前 − 調整控除）の【推計】。
 *
 * ★返り値は必ず「推計値」として表示すること★ range を併せて出すこと。
 * ★税額控除（住宅ローン控除・ふるさと納税等）は適用しない★
 *   保育料の階層判定はこれらを適用する前の額で行うと各自治体が明記している
 *   （各 hoikuryo/*.json の bracketBasis.deductionsIgnored）。調整控除は差し引く（横浜市が明記）。
 */
export function estimateShotokuwari(input: ShotokuwariInput): ShotokuwariEstimate {
  if (input.hasSpouseSpecialDeduction) {
    return {
      kind: "unavailable",
      reason: "haiguusha-tokubetsu-koujo-not-data",
      note:
        "配偶者特別控除の対象の場合、控除額を推計できません（住民税の逓減の算式が本データに未収録のため）。" +
        "課税明細書の所得割額を直接入力する方法をご利用ください。",
    };
  }
  if (input.hasTokuteiShinzokuSpecialDeduction) {
    return {
      kind: "unavailable",
      reason: "tokutei-shinzoku-tokubetsu-koujo-not-data",
      note:
        "特定親族特別控除の対象の場合、控除額を推計できません（住民税の逓減の算式が本データに未収録のため）。" +
        "課税明細書の所得割額を直接入力する方法をご利用ください。",
    };
  }

  // ★都道府県が収録外なら推計しない★ 健康保険料率が決まらないため（推測で全国平均を当てない）
  if (
    input.socialInsurance.kind === "estimate" &&
    healthInsuranceRateOf(input.socialInsurance.prefecture, "FY2025") === null
  ) {
    return {
      kind: "unavailable",
      reason: "prefecture-not-supported",
      note:
        "お住まいの都道府県の健康保険料率が本データに収録されていないため、社会保険料を推計できません。" +
        "源泉徴収票の「社会保険料等の金額」を入力する方法をご利用ください。",
    };
  }

  const max = buildBreakdown(input, 0);
  if (max === null) {
    return {
      kind: "unavailable",
      reason: "salary-out-of-range",
      note: "入力された年収では給与所得を計算できません。",
    };
  }
  const min = buildBreakdown(input, seimeiHokenryouKoujoLimit());
  if (min === null) {
    return { kind: "unavailable", reason: "salary-out-of-range", note: "入力された年収では給与所得を計算できません。" };
  }

  const limit = shotokuwariNonTaxableLimit(input);
  const caveats: string[] = [
    "これは推計値です。実際の所得割額は課税明細書（納税通知書）でご確認ください。",
    "生命保険料控除・地震保険料控除・医療費控除など、ご家庭ごとの所得控除は反映していません。" +
      "これらがある場合、実際の所得割額は推計より低くなります。",
    "給与収入以外の所得（事業所得・不動産所得等）がある場合は使えません。",
  ];
  if (max.socialInsuranceIsEstimate) {
    const d = max.socialInsuranceDetail;
    caveats.push(
      `社会保険料を年収からの概算で計算しています（協会けんぽ${d ? `・${d.prefecture}` : ""}の令和7年度の料率と標準報酬月額表によるものです）。` +
        "勤務先が健康保険組合の場合は料率が異なります。" +
        "源泉徴収票の「社会保険料等の金額」を入力すると精度が上がります。",
    );
    caveats.push(MODELING_ASSUMPTION);
    caveats.push(
      "40歳以上の方は介護保険料（令和7年度1.59%の半分）が加わりますが、本推計には含めていません。" +
        "40歳以上の場合、実際の所得割額は推計より低くなります。",
    );
    if (d?.pensionCapped) {
      caveats.push(
        "厚生年金保険料が上限（標準報酬月額650,000円）に達する年収です。" +
          "賞与の割合が大きい方は実際の厚生年金保険料が推計より高く、所得割額は推計より低くなります。",
      );
    }
  }
  if (input.salary < TRUNCATE_MIN) {
    caveats.push(
      "年収220万円未満では、給与所得の計算に法令上適用される表（所得税法別表第五）の刻みが本データに未収録のため、" +
        "給与所得が数千円程度ずれることがあります。",
    );
  }
  const spouse900 = J.shotokuKoujo.haiguushaKoujo.rows[0].earnerTotalIncomeMax;
  if (input.hasSpouse && spouse900 !== null && max.salaryIncome > spouse900) {
    // ★検算時の訂正（2026-07-17）★ 加算の省略は調整控除を小さく＝所得割を大きく（上限側に）する。
    // なお課税所得が200万円を大きく超えるこの領域では下限5万円が効くため、実際には数値差は生じない
    // （tests/hoikuryo-shotokuwari-kensan.test.ts で確認済み）。
    caveats.push(
      "合計所得金額が900万円を超える場合、調整控除の配偶者に係る加算額が本データに未収録のため、" +
        "所得割の推計が実際よりわずかに大きく出る可能性があります。",
    );
  }

  return {
    kind: "estimated",
    isEstimate: true,
    breakdown: max,
    range: { min: min.shotokuwari, max: max.shotokuwari },
    isShotokuwariNonTaxable: max.salaryIncome <= limit,
    shotokuwariNonTaxableLimit: limit,
    caveats,
  };
}

// ---------------------------------------------------------------- 世帯合算（父母2人分）

export type HouseholdEstimate =
  | {
      kind: "estimated";
      isEstimate: true;
      /** 各稼得者の推計（入力順） */
      parents: Array<ShotokuwariEstimate & { kind: "estimated" }>;
      /**
       * 世帯の市町村民税所得割額の推計。★所得割の非課税に当たる稼得者の寄与は0円として合算する★
       * （所得割の非課税＝地方税法附則第3条の3＝は個人単位の判定。breakdown.shotokuwari は
       * 非課税判定前の機械計算値のため、そのまま足すと非課税の稼得者の分を過大計上する）
       */
      total: number;
      range: { min: number; max: number };
      /** 全稼得者が所得割非課税の見込みか（→世帯の課税状況の選択を見直す案内を出すこと） */
      allNonTaxable: boolean;
      caveats: string[];
    }
  | { kind: "unavailable"; reason: ShotokuwariUnavailableReason; note: string };

/** 稼得者1人分の合算への寄与。所得割非課税なら0円 */
function contribution(est: ShotokuwariEstimate & { kind: "estimated" }): {
  point: number;
  min: number;
  max: number;
} {
  if (est.isShotokuwariNonTaxable) return { point: 0, min: 0, max: 0 };
  return { point: est.breakdown.shotokuwari, min: est.range.min, max: est.range.max };
}

/**
 * 父母（等）2人分までの年収から、世帯の市町村民税所得割額を推計する。
 * 保育料の階層判定は多くの自治体で「父母の所得割額の合算」を用いる（specs/s-tools/01 §3.2 入力8a）。
 */
export function estimateHouseholdShotokuwari(inputs: ShotokuwariInput[]): HouseholdEstimate {
  const parents: Array<ShotokuwariEstimate & { kind: "estimated" }> = [];
  for (const input of inputs) {
    const est = estimateShotokuwari(input);
    if (est.kind !== "estimated") return est;
    parents.push(est);
  }
  const contribs = parents.map(contribution);
  const caveats = [...new Set(parents.flatMap((p) => p.caveats))];
  const nonTaxableCount = parents.filter((p) => p.isShotokuwariNonTaxable).length;
  if (nonTaxableCount > 0 && nonTaxableCount < parents.length) {
    caveats.push(
      "お一人は所得割が非課税の見込みのため、その方の分は0円として合算しています。",
    );
  }
  return {
    kind: "estimated",
    isEstimate: true,
    parents,
    total: contribs.reduce((a, c) => a + c.point, 0),
    range: {
      min: contribs.reduce((a, c) => a + c.min, 0),
      max: contribs.reduce((a, c) => a + c.max, 0),
    },
    allNonTaxable: parents.length > 0 && nonTaxableCount === parents.length,
    caveats,
  };
}

// ---------------------------------------------------------------- 階層の推計

/**
 * bracketBasis.note に、調整控除の控除以外の「前処理」の指示が書かれていることを示す語。
 * ★これらの換算式は構造化データが無いため、実装側で発明しない★（specs/s-tools/01 §9.1）
 */
const PREPROCESSING_MARKERS = ["6／8", "6/8", "8分の6", "税源移譲前", "定額減税"];

/**
 * 所得割額に自治体ごとの「前処理」が必要か。必要ならツールは階層を出さない（§4 ステップ4・§9.1）。
 *
 * 判定は2つ。
 *
 * ★① 政令指定都市に住んでいる場合は常に前処理が必要★
 *   保育料の階層表の境界（48,600 / 57,700 / 97,000 / 169,000 / 301,000 / 397,000 円）は
 *   **市民税率6%を前提とした国基準の値**である。政令指定都市の市民税所得割は8%で課税されるため、
 *   法令どおりに計算した所得割額をそのまま階層表に当てはめると必ず誤判定する。
 *   換算の仕方は自治体ごとに違う（大阪・川崎は「6／8を掛ける」、名古屋は「税源移譲前の税率で算定」、
 *   横浜は「市民税率6％で計算し直す」）うえ、換算の端数処理が原典に無い（§9.1）。
 *   → ツールは換算を代行せず、bracketBasis.note の原文を提示してユーザーに委ねる。
 *
 * ★② 非指定都市でも、note に調整控除以外の前処理の指示がある場合★
 *   例: 世田谷区は「税額控除前所得割額から調整控除額と**定額減税額**を差し引いた額」、
 *   江戸川区は「政令指定都市で課税されている場合は市民税所得割額に**8分の6**を乗じる」。
 *
 * 逆に、住宅ローン控除・ふるさと納税等の税額控除を「適用しない」という指示（deductionsIgnored）は
 * 前処理には当たらない。本モジュールはもともとそれらの税額控除を適用していないため、条件を満たしている。
 */
export function requiresPreprocessing(
  m: HoikuryoMunicipality,
  isDesignatedCity: boolean,
): boolean {
  if (isDesignatedCity) return true;
  const note = m.bracketBasis?.note ?? "";
  return PREPROCESSING_MARKERS.some((k) => note.includes(k));
}

export type TierEstimate =
  | {
      kind: "estimated";
      isEstimate: true;
      shotokuwari: ShotokuwariEstimate & { kind: "estimated" };
      /** 推計の点推計が該当する階層 */
      tier: HoikuryoTier;
      /** 推計範囲の下限・上限がまたぐ階層。長さ2以上なら階層を1つに絞れていない */
      tierRange: HoikuryoTier[];
      caveats: string[];
    }
  | {
      kind: "preprocessing-required";
      shotokuwari: ShotokuwariEstimate & { kind: "estimated" };
      /** bracketBasis.note の原文。★UIにそのまま提示すること★ */
      note: string;
      caveats: string[];
    }
  | { kind: "unavailable"; reason: string; note: string };

export type HouseholdTierEstimate =
  | {
      kind: "estimated";
      isEstimate: true;
      household: HouseholdEstimate & { kind: "estimated" };
      tier: HoikuryoTier;
      tierRange: HoikuryoTier[];
      caveats: string[];
    }
  | {
      kind: "preprocessing-required";
      household: HouseholdEstimate & { kind: "estimated" };
      /** bracketBasis.note の原文。★UIにそのまま提示すること★ */
      note: string;
      caveats: string[];
    }
  | { kind: "unavailable"; reason: string; note: string };

/**
 * 世帯（父母2人分まで）の年収 → 階層 の【推計】。estimateTier の世帯版。
 * 前処理・課税状況の扱いは estimateTier と同じ（下のコメント参照）。
 */
export function estimateHouseholdTier(
  municipalityId: string,
  inputs: ShotokuwariInput[],
  taxStatus: TaxStatus,
): HouseholdTierEstimate {
  const m = getMunicipality(municipalityId);
  if (!m) {
    return { kind: "unavailable", reason: "municipality-not-found", note: `未収集の自治体です: ${municipalityId}` };
  }
  const household = estimateHouseholdShotokuwari(inputs);
  if (household.kind !== "estimated") {
    return { kind: "unavailable", reason: household.reason, note: household.note };
  }
  const isDesignatedCity = inputs.some((i) => i.isDesignatedCity);
  if (requiresPreprocessing(m, isDesignatedCity)) {
    return {
      kind: "preprocessing-required",
      household,
      note: m.bracketBasis?.note ?? "",
      caveats: [
        ...household.caveats,
        isDesignatedCity
          ? "政令指定都市の市民税所得割は8％で課税されますが、保育料の階層表は6％を前提とした金額で区切られています。" +
            "そのままでは階層を判定できないため、この自治体の案内にある換算方法をご確認ください。ツールでは換算を代行しません。"
          : "この自治体は、課税明細書の所得割額をそのまま階層表に当てはめず、独自の換算を行うと案内しています。" +
            "換算方法は下記の原文をご確認ください。ツールでは換算を代行しません。",
      ],
    };
  }
  const resolve = (income: number): HoikuryoTier | null => resolveTier(m, taxStatus, income).tier;
  const tier = resolve(household.total);
  if (!tier) {
    return { kind: "unavailable", reason: "tier-not-resolved", note: "階層を判定できませんでした。" };
  }
  const tiers = [resolve(household.range.min), resolve(household.range.max)].filter(
    (t): t is HoikuryoTier => t !== null,
  );
  const tierRange = tiers.filter((t, i) => tiers.findIndex((x) => x.tier === t.tier) === i);
  const caveats = [...household.caveats];
  if (tierRange.length > 1) {
    caveats.push(
      "推計の幅の中に階層の境界があるため、階層を1つに絞れていません。課税明細書の所得割額でご確認ください。",
    );
  }
  return { kind: "estimated", isEstimate: true, household, tier, tierRange, caveats };
}

/**
 * 年収 → 階層 の【推計】。
 *
 * ★前処理が必要な自治体では階層を返さない★ 6/8換算・税源移譲前税率などの換算は原典に構造化データが無く、
 * 端数処理も原典に無い（§9.1）。ツールが換算を代行せず、bracketBasis.note を提示してユーザーに委ねる。
 *
 * ★課税状況（taxStatus）を所得割額より先に見る★（§4 ステップ3）。A/B/C階層はいずれも所得割額0円で、
 * 金額では判別できない。均等割の非課税は断定しないため、taxStatus は入力として受け取る。
 */
export function estimateTier(
  municipalityId: string,
  input: ShotokuwariInput,
  taxStatus: TaxStatus,
): TierEstimate {
  const m = getMunicipality(municipalityId);
  if (!m) {
    return { kind: "unavailable", reason: "municipality-not-found", note: `未収集の自治体です: ${municipalityId}` };
  }

  const est = estimateShotokuwari(input);
  if (est.kind !== "estimated") {
    return { kind: "unavailable", reason: est.reason, note: est.note };
  }

  if (requiresPreprocessing(m, input.isDesignatedCity)) {
    return {
      kind: "preprocessing-required",
      shotokuwari: est,
      note: m.bracketBasis?.note ?? "",
      caveats: [
        ...est.caveats,
        input.isDesignatedCity
          ? "政令指定都市の市民税所得割は8％で課税されますが、保育料の階層表は6％を前提とした金額で区切られています。" +
            "そのままでは階層を判定できないため、この自治体の案内にある換算方法をご確認ください。ツールでは換算を代行しません。"
          : "この自治体は、課税明細書の所得割額をそのまま階層表に当てはめず、独自の換算を行うと案内しています。" +
            "換算方法は下記の原文をご確認ください。ツールでは換算を代行しません。",
      ],
    };
  }

  const resolve = (income: number): HoikuryoTier | null => resolveTier(m, taxStatus, income).tier;
  const tier = resolve(est.breakdown.shotokuwari);
  if (!tier) {
    return { kind: "unavailable", reason: "tier-not-resolved", note: "階層を判定できませんでした。" };
  }

  const tiers = [resolve(est.range.min), resolve(est.range.max)].filter(
    (t): t is HoikuryoTier => t !== null,
  );
  const tierRange = tiers.filter((t, i) => tiers.findIndex((x) => x.tier === t.tier) === i);

  const caveats = [...est.caveats];
  if (tierRange.length > 1) {
    caveats.push(
      "推計の幅の中に階層の境界があるため、階層を1つに絞れていません。" +
        "課税明細書の所得割額でご確認ください。",
    );
  }
  return { kind: "estimated", isEstimate: true, shotokuwari: est, tier, tierRange, caveats };
}
