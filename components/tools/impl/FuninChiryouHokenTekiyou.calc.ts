/*
 * 不妊治療 保険適用・回数・費用早見（P2-T11）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/14-funin-chiryou-hoken-tekiyou.md
 *
 * SSOT: data/seido/funin-chiryou-hoken-tekiyou.json（令和4年4月〜の保険適用）。
 * 年齢上限・回数上限・負担割合はすべて同JSONから import し、ハードコードしない。
 *
 * ★このツールが数値で示さないもの★
 *   生殖補助医療の総額・高額療養費の自己負担限度額（highCostMedicalExpenseLimit が null）。
 *   これらは治療内容・所得区分で大きく変わるため、確定額を出さず案内に留める（捏造しない）。
 *   任意入力で「保険診療の総額（10割）」が与えられた場合のみ、3割の窓口負担額を機械計算する。
 */
import seido from "@/data/seido/funin-chiryou-hoken-tekiyou.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const funinChiryouDataset = seido as unknown as SeidoDataset;
export const FUNIN_CHIRYOU_DISCLAIMER = seido.disclaimer;

const AGE = seido.data.ageRequirement;
const CNT = seido.data.countLimit;
const COST = seido.data.costSharing;

/** 生殖補助医療の年齢上限（治療開始日に43歳未満） */
export const UPPER_AGE_LIMIT = AGE.upperAgeLimit.value; // 43
/** 回数上限が6回→3回に変わる年齢境界（初回治療開始日の年齢40歳） */
export const AGE_BOUNDARY = CNT.ageBoundary.value; // 40
export const UNDER40_LIMIT = CNT.under40Limit.value; // 6
export const AGE40_TO43_LIMIT = CNT.age40To43Limit.value; // 3
/** 70歳未満の一部負担金の割合（3割） */
export const COPAYMENT_RATE = COST.copaymentRate.value; // 0.3
/** 子ども1人ごとに回数がリセットされるか */
export const RESET_PER_CHILD = CNT.resetPerChild.value; // true

export interface FuninChiryouInput {
  /** 今回の治療開始日の女性の年齢 */
  currentAge: number;
  /** 初めての治療開始日の女性の年齢（回数上限の判定に使う。未指定なら今回の年齢） */
  firstAge?: number;
  /** これまでに保険診療で実施した胚移植の回数（今の子について） */
  priorTransfers: number;
  /** 1回の保険診療の総額（10割・円・任意）。指定時のみ3割の窓口負担を計算 */
  totalTenWari?: number;
}

export interface FuninChiryouResult {
  ok: true;
  /** 年齢による生殖補助医療の保険適用可否（今回の開始日43歳未満か） */
  eligibleByAge: boolean;
  /** 回数上限（初回開始年齢で決まる。年齢対象外なら0） */
  countLimit: number;
  /** 残りの保険適用回数 */
  remaining: number;
  /** さらに保険で胚移植を受けられるか */
  canReceiveMore: boolean;
  /** 3割の窓口負担額（totalTenWari が与えられた場合のみ。なければ null） */
  copayment: number | null;
}

export type FuninChiryouCalcResult = FuninChiryouResult | { ok: false; error: string };

export function calcFuninChiryou(input: FuninChiryouInput): FuninChiryouCalcResult {
  const currentAge = Math.floor(input.currentAge);
  if (!Number.isFinite(currentAge) || currentAge < 0) {
    return { ok: false, error: "治療開始日の年齢を0以上で入力してください。" };
  }
  const firstAge = Math.floor(input.firstAge ?? currentAge);
  if (!Number.isFinite(firstAge) || firstAge < 0) {
    return { ok: false, error: "初回治療開始日の年齢を0以上で入力してください。" };
  }
  const prior = Math.floor(input.priorTransfers);
  if (!Number.isFinite(prior) || prior < 0) {
    return { ok: false, error: "これまでの胚移植の回数を0以上で入力してください。" };
  }

  const eligibleByAge = currentAge < UPPER_AGE_LIMIT;

  // 回数上限は初回治療開始日の年齢で決まる。初回時点で年齢上限を超えていれば対象外＝0
  let countLimit: number;
  if (firstAge >= UPPER_AGE_LIMIT) {
    countLimit = 0;
  } else if (firstAge < AGE_BOUNDARY) {
    countLimit = UNDER40_LIMIT;
  } else {
    countLimit = AGE40_TO43_LIMIT;
  }

  const remaining = Math.max(0, countLimit - prior);
  const canReceiveMore = eligibleByAge && remaining > 0;

  let copayment: number | null = null;
  if (input.totalTenWari != null && Number.isFinite(input.totalTenWari) && input.totalTenWari >= 0) {
    copayment = Math.floor(input.totalTenWari * COPAYMENT_RATE);
  }

  return {
    ok: true,
    eligibleByAge,
    countLimit,
    remaining,
    canReceiveMore,
    copayment,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
