/*
 * 児童扶養手当計算（ひとり親）（P2-T03）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/08-jidou-fuyou-teate.md
 *
 * 制度データは data/seido/jidou-fuyou-teate.json を単一の情報源(SSOT)とする。
 * 金額・係数・所得制限限度額はすべて同JSONを import して参照し、本ファイルには
 * ハードコードしない（毎年4月の物価スライドで金額・係数が変わるため、JSONだけを
 * 更新すれば追随する。tests のハードコード禁止検査の対象）。
 *
 * ★このツールの設計方針（YMYL）★
 *  - 入力は「年収」ではなく「所得額」を受け取る。児童扶養手当の所得額は年収から
 *    給与所得控除・社会保険料相当額8万円・諸控除を引いた独自の額であり、年収からの
 *    自動換算は誤差が大きいため行わない（JSONの incomeBasedNote に明記）。
 *  - 受け取った養育費の8割が所得に算入される（他制度にない最大の特徴）。任意入力で加算する。
 *  - 同居する扶養義務者（親・兄弟姉妹等）の所得が限度額以上だと全部支給停止になる。
 *  - 公的年金を受給している場合は併給調整があり、本ツールでは確定額を出さない
 *    （JSONの withPublicPension が null ＝未確認）。UI側で窓口確認を強く促す。
 */
import seido from "@/data/seido/jidou-fuyou-teate.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const jidouFuyouTeateDataset = seido as unknown as SeidoDataset;
export const JIDOU_FUYOU_TEATE_DISCLAIMER = seido.disclaimer;

const A = seido.data.monthlyAmounts;
const F = seido.data.partialPaymentFormula;
const TABLE = seido.data.incomeLimits.incomeBasedTable;
const CS = seido.data.interactions.childSupportIncomeInclusion;

/** 全部支給の本体額（児童1人目） */
export const FIRST_CHILD_FULL = A.firstChildFull.value;
/** 一部支給の本体額（児童1人目）の上限・下限 */
export const FIRST_CHILD_PARTIAL_MAX = A.firstChildPartialMax.value;
export const FIRST_CHILD_PARTIAL_MIN = A.firstChildPartialMin.value;
/** 全部支給の加算額（2人目以降1人につき） */
export const ADDITIONAL_CHILD_FULL = A.additionalChildFull.value;
/** 一部支給の加算額（2人目以降1人につき）の上限・下限 */
export const ADDITIONAL_CHILD_PARTIAL_MAX = A.additionalChildPartialMax.value;
export const ADDITIONAL_CHILD_PARTIAL_MIN = A.additionalChildPartialMin.value;
/** 一部支給の逓減係数 */
export const FIRST_CHILD_COEFFICIENT = F.firstChildCoefficient.value;
export const ADDITIONAL_CHILD_COEFFICIENT = F.additionalChildCoefficient.value;
/** 所得額に算入される養育費の割合（0.8） */
export const CHILD_SUPPORT_INCOME_RATE = CS.value;
/** 扶養親族が4人以上の場合の1人あたり加算額 */
export const INCREMENT_PER_ADDITIONAL_DEPENDENT = TABLE.incrementPerAdditionalDependent;
/** 支給期月（奇数月）・各回の対象月数（2か月分） */
export const PAYMENT_MONTHS = [1, 3, 5, 7, 9, 11];
export const MONTHS_PER_PAYMENT = 2;

export type PaymentStatus =
  | "full" // 全部支給
  | "partial" // 一部支給
  | "fullStop" // 本人所得が一部支給限度額以上 → 支給されない
  | "obligorStop"; // 扶養義務者等の所得が限度額以上 → 支給されない

export interface JidouFuyouTeateInput {
  /** 対象児童の数（18歳年度末まで／障害児は20歳未満。1以上） */
  childrenCount: number;
  /** 受給者本人の所得額（円。年収ではなく所得。養育費を除く） */
  recipientIncome: number;
  /** 扶養親族の数（所得制限限度額表の行を引くための人数。0以上） */
  dependentsCount: number;
  /** 受け取っている養育費の年額（円。任意。8割を所得に加算する） */
  childSupportAnnual?: number;
  /** 同居する扶養義務者等の所得額（円。任意。指定時のみ扶養義務者の所得制限を判定） */
  obligorIncome?: number;
  /** 公的年金（遺族年金・障害年金・老齢年金等）を受給しているか（併給調整の警告用） */
  receivingPension?: boolean;
}

export interface IncomeLimits {
  fullPayment: number;
  partialPayment: number;
  dependentObligor: number;
}

export interface JidouFuyouTeateResult {
  ok: true;
  status: PaymentStatus;
  /** 判定に使った本人の所得額（養育費8割を加算後） */
  effectiveIncome: number;
  /** 養育費から所得に算入された額（0なら加算なし） */
  childSupportIncluded: number;
  limits: IncomeLimits;
  /** 児童1人目の月額 */
  firstChildAmount: number;
  /** 2人目以降1人あたりの月額 */
  additionalChildAmount: number;
  /** 世帯合計の月額 */
  totalMonthly: number;
  /** 年額（月額×12） */
  totalAnnual: number;
  /** 1回あたりの支給額（2か月分をまとめて年6回） */
  perPaymentAmount: number;
  paymentMonths: number[];
  /** 公的年金受給者への併給調整警告が必要か */
  pensionAdjustmentWarning: boolean;
}

export type JidouFuyouTeateCalcResult =
  | JidouFuyouTeateResult
  | { ok: false; error: string };

/** 扶養親族数から所得制限限度額を引く（4人以上は1人につき増分を加算） */
export function limitsForDependents(dependents: number): IncomeLimits {
  const rows = TABLE.rows;
  const maxRow = rows[rows.length - 1];
  if (dependents <= maxRow.dependents) {
    const row = rows.find((r) => r.dependents === dependents) ?? rows[0];
    return {
      fullPayment: row.fullPayment,
      partialPayment: row.partialPayment,
      dependentObligor: row.dependentObligor,
    };
  }
  const extra = (dependents - maxRow.dependents) * INCREMENT_PER_ADDITIONAL_DEPENDENT;
  return {
    fullPayment: maxRow.fullPayment + extra,
    partialPayment: maxRow.partialPayment + extra,
    dependentObligor: maxRow.dependentObligor + extra,
  };
}

/** 10円未満四捨五入（一部支給は10円きざみ） */
export function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * 一部支給の本体額（児童1人目）。
 * 手当月額 ＝ FIRST_CHILD_FULL − {（所得額−全部支給限度額）×係数 ＋ 10}
 * を10円きざみに丸め、下限〜上限にクランプする。
 */
export function partialFirstChild(income: number, fullLimit: number): number {
  const raw = FIRST_CHILD_FULL - ((income - fullLimit) * FIRST_CHILD_COEFFICIENT + 10);
  return clamp(roundTo10(raw), FIRST_CHILD_PARTIAL_MIN, FIRST_CHILD_PARTIAL_MAX);
}

/** 一部支給の加算額（2人目以降1人につき）。 */
export function partialAdditionalChild(income: number, fullLimit: number): number {
  const raw = ADDITIONAL_CHILD_FULL - ((income - fullLimit) * ADDITIONAL_CHILD_COEFFICIENT + 10);
  return clamp(roundTo10(raw), ADDITIONAL_CHILD_PARTIAL_MIN, ADDITIONAL_CHILD_PARTIAL_MAX);
}

export function calcJidouFuyouTeate(input: JidouFuyouTeateInput): JidouFuyouTeateCalcResult {
  const n = Math.floor(input.childrenCount);
  if (!Number.isFinite(n) || n < 1) {
    return { ok: false, error: "対象となる児童の人数を1人以上で入力してください。" };
  }
  if (!Number.isFinite(input.recipientIncome) || input.recipientIncome < 0) {
    return { ok: false, error: "受給者本人の所得額を0以上で入力してください。" };
  }
  const dependents = Math.floor(input.dependentsCount);
  if (!Number.isFinite(dependents) || dependents < 0) {
    return { ok: false, error: "扶養親族の数を0以上で入力してください。" };
  }

  const childSupport = input.childSupportAnnual ?? 0;
  if (childSupport < 0) {
    return { ok: false, error: "養育費の年額は0以上で入力してください。" };
  }
  const childSupportIncluded = Math.floor(childSupport * CHILD_SUPPORT_INCOME_RATE);
  const effectiveIncome = input.recipientIncome + childSupportIncluded;

  const limits = limitsForDependents(dependents);

  // ---- 支給区分の判定
  let status: PaymentStatus;
  const obligorOver =
    input.obligorIncome != null &&
    Number.isFinite(input.obligorIncome) &&
    input.obligorIncome >= limits.dependentObligor;

  if (obligorOver) {
    status = "obligorStop";
  } else if (effectiveIncome >= limits.partialPayment) {
    status = "fullStop";
  } else if (effectiveIncome < limits.fullPayment) {
    status = "full";
  } else {
    status = "partial";
  }

  // ---- 金額
  let firstChildAmount = 0;
  let additionalChildAmount = 0;
  if (status === "full") {
    firstChildAmount = FIRST_CHILD_FULL;
    additionalChildAmount = ADDITIONAL_CHILD_FULL;
  } else if (status === "partial") {
    firstChildAmount = partialFirstChild(effectiveIncome, limits.fullPayment);
    additionalChildAmount = partialAdditionalChild(effectiveIncome, limits.fullPayment);
  }

  const totalMonthly = firstChildAmount + additionalChildAmount * (n - 1);
  const totalAnnual = totalMonthly * 12;
  const perPaymentAmount = totalMonthly * MONTHS_PER_PAYMENT;

  return {
    ok: true,
    status,
    effectiveIncome,
    childSupportIncluded,
    limits,
    firstChildAmount,
    additionalChildAmount,
    totalMonthly,
    totalAnnual,
    perPaymentAmount,
    paymentMonths: PAYMENT_MONTHS,
    pensionAdjustmentWarning: input.receivingPension === true,
  };
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  full: "全部支給",
  partial: "一部支給",
  fullStop: "支給停止（所得超過）",
  obligorStop: "支給停止（扶養義務者等の所得超過）",
};

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
