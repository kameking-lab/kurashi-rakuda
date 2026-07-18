/*
 * 介護休業給付金 計算（P2-T05）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/09-kaigo-kyugyou-kyufukin.md
 *
 * SSOT: data/seido/kaigo-kyugyou-kyufukin.json（雇用保険法第61条の4）。
 * 支給率・賃金月額の上限下限・支給限度額・日数上限・80%調整のしきい値は
 * すべて同JSONから import し、本ファイルにハードコードしない
 * （★上限額356,574円は毎年8月1日に改定される★ ため、JSONだけ更新すれば追随）。
 *
 * ★計算の骨格★
 *  支給額 ＝ 休業開始時賃金日額 × 支給日数 × 67%
 *  ・休業開始時賃金日額 ＝ 介護休業開始前6か月間の賃金 ÷ 180（＝月額換算の1/30）
 *  ・賃金月額（＝賃金日額×30）は上限532,200円・下限90,420円でクランプ
 *  ・支給単位期間は休業開始日から1か月ごと。最終期間は実日数、それ以外は30日
 *  ・支給日数の通算上限は93日（同一対象家族・3回まで分割可）
 */
import seido from "@/data/seido/kaigo-kyugyou-kyufukin.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kaigoKyugyouKyufukinDataset = seido as unknown as SeidoDataset;
export const KAIGO_KYUGYOU_DISCLAIMER = seido.disclaimer;

const S = seido.data.shikyuGaku;
const W = seido.data.wageAdjustment;
const L = seido.data.leaveLimits;

/** 支給率（67%・附則の暫定措置） */
export const BENEFIT_RATE = S.rate.value;
/** 賃金月額の上限額・下限額 */
export const WAGE_MONTHLY_MAX = S.wageMonthlyMax.value;
export const WAGE_MONTHLY_MIN = S.wageMonthlyMin.value;
/** 1支給対象期間（30日）あたりの支給上限額・下限額 */
export const MONTHLY_MAX = S.monthlyMax.value;
export const MONTHLY_MIN = S.monthlyMin.value;
/** 支給日数の通算上限（93日）・分割回数の上限（3回） */
export const MAX_DAYS = L.maxDays.value;
export const MAX_COUNT = L.maxCount.value;
/** 80%調整のしきい値（減額されない上限0.13・不支給となる下限0.8） */
export const THRESHOLD_NO_REDUCTION = W.thresholdNoReduction.value;
export const THRESHOLD_ZERO = W.thresholdZero.value;
/** 支給単位期間の日数（休業開始日から1か月＝30日で1期間） */
export const SUPPORT_PERIOD_DAYS = 30;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 賃金月額（＝賃金日額×30）を上限・下限でクランプ */
export function cappedMonthlyWage(monthlyWage: number): number {
  return clamp(monthlyWage, WAGE_MONTHLY_MIN, WAGE_MONTHLY_MAX);
}

/** クランプ後の賃金日額（＝賃金月額÷30） */
export function cappedDailyWage(monthlyWage: number): number {
  return cappedMonthlyWage(monthlyWage) / SUPPORT_PERIOD_DAYS;
}

/**
 * 介護休業日数を支給単位期間（各1か月＝30日、最終期間は実日数）に分割する。
 * 例: 93日 → [30, 30, 30, 3]
 */
export function splitPeriods(leaveDays: number): number[] {
  const periods: number[] = [];
  let remaining = leaveDays;
  while (remaining > SUPPORT_PERIOD_DAYS) {
    periods.push(SUPPORT_PERIOD_DAYS);
    remaining -= SUPPORT_PERIOD_DAYS;
  }
  periods.push(remaining);
  return periods;
}

export interface PeriodResult {
  periodDays: number;
  fullWage: number; // 賃金日額 × 支給日数
  benefitBeforeAdjust: number; // 67%相当（円未満切り捨て）
  wagePaid: number;
  benefit: number; // 80%調整後
  reduced: boolean;
}

/** 1支給対象期間の給付額（80%調整込み）を計算する */
export function periodBenefit(
  cappedDaily: number,
  periodDays: number,
  wagePaid: number,
): PeriodResult {
  const fullWage = cappedDaily * periodDays;
  const benefitBeforeAdjust = Math.floor(fullWage * BENEFIT_RATE);
  let benefit = benefitBeforeAdjust;
  let reduced = false;

  if (wagePaid > 0 && fullWage > 0) {
    const ratio = wagePaid / fullWage;
    if (ratio >= THRESHOLD_ZERO) {
      benefit = 0;
      reduced = true;
    } else if (ratio > THRESHOLD_NO_REDUCTION) {
      benefit = Math.max(0, Math.floor(fullWage * THRESHOLD_ZERO - wagePaid));
      reduced = true;
    }
  }
  benefit = Math.min(benefit, benefitBeforeAdjust);

  return { periodDays, fullWage, benefitBeforeAdjust, wagePaid, benefit, reduced };
}

export interface KaigoKyugyouInput {
  /** 介護休業開始前6か月間の賃金の平均月額（円） */
  monthlyWage: number;
  /** 取得する介護休業の日数（1〜93日） */
  leaveDays: number;
  /** 各支給対象期間に支払われる賃金（円・任意。0なら無給） */
  wagePaidPerPeriod?: number;
  /** 介護休業終了後に離職することが予定されているか（trueなら支給対象外） */
  resigningAfterLeave?: boolean;
  /** 対象家族が範囲内か（配偶者・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫） */
  familyInScope?: boolean;
}

export interface KaigoKyugyouResult {
  ok: true;
  /** 支給対象外の理由（離職予定・対象家族外）。空なら支給対象 */
  ineligibleReasons: string[];
  /** 93日を超えて入力された場合に切り詰めたか */
  cappedToMaxDays: boolean;
  effectiveLeaveDays: number;
  cappedMonthlyWage: number;
  cappedDailyWage: number;
  periods: PeriodResult[];
  /** 全期間の給付総額 */
  totalBenefit: number;
  /** 無給前提での給付総額（賃金支払があっても比較用に示す） */
  totalBenefitUnpaid: number;
}

export type KaigoKyugyouCalcResult = KaigoKyugyouResult | { ok: false; error: string };

export function calcKaigoKyugyou(input: KaigoKyugyouInput): KaigoKyugyouCalcResult {
  if (!Number.isFinite(input.monthlyWage) || input.monthlyWage <= 0) {
    return { ok: false, error: "休業開始前6か月間の平均月額賃金を入力してください。" };
  }
  const rawDays = Math.floor(input.leaveDays);
  if (!Number.isFinite(rawDays) || rawDays < 1) {
    return { ok: false, error: "介護休業の日数を1日以上で入力してください。" };
  }
  const wagePaid = input.wagePaidPerPeriod ?? 0;
  if (wagePaid < 0) {
    return { ok: false, error: "休業中に支払われる賃金は0以上で入力してください。" };
  }

  const cappedToMaxDays = rawDays > MAX_DAYS;
  const effectiveLeaveDays = Math.min(rawDays, MAX_DAYS);

  const monthly = cappedMonthlyWage(input.monthlyWage);
  const daily = cappedDailyWage(input.monthlyWage);

  const periods = splitPeriods(effectiveLeaveDays).map((d) => periodBenefit(daily, d, wagePaid));
  const totalBenefit = periods.reduce((sum, p) => sum + p.benefit, 0);
  const totalBenefitUnpaid = periods.reduce((sum, p) => sum + p.benefitBeforeAdjust, 0);

  const ineligibleReasons: string[] = [];
  if (input.resigningAfterLeave === true) {
    ineligibleReasons.push(
      "介護休業を開始する時点で休業終了後に離職することが予定されている方は、支給の対象になりません。",
    );
  }
  if (input.familyInScope === false) {
    ineligibleReasons.push(
      "介護する家族が対象家族の範囲（配偶者・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫）に含まれない場合は、支給の対象になりません。",
    );
  }

  return {
    ok: true,
    ineligibleReasons,
    cappedToMaxDays,
    effectiveLeaveDays,
    cappedMonthlyWage: monthly,
    cappedDailyWage: daily,
    periods,
    totalBenefit,
    totalBenefitUnpaid,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
