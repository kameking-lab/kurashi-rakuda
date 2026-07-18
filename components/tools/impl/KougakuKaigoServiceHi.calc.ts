/*
 * 高額介護サービス費 該当チェック（P2-T06）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/10-kougaku-kaigo-service-hi.md
 *
 * SSOT: data/seido/kougaku-kaigo-service-hi.json（介護保険法施行令第22条の2の2）。
 * 負担限度額・区分・境界額はすべて同JSONから import し、本ファイルにハードコードしない。
 *
 * ★制度の骨格★
 *   1か月の介護サービスの利用者負担（1〜3割）の合計が、所得区分に応じた負担限度額
 *   （月額）を超えたとき、超えた分が高額介護サービス費として払い戻される。
 *   ・課税区分（140,100／93,000／44,400円）は世帯単位で合算して判定
 *   ・非課税区分（24,600円）も世帯単位。ただし非課税かつ年金収入等が低い方は
 *     個人15,000円と比べて有利な方を適用（介護保険法施行令 第22条の2の2 第9項）
 *   ・生活保護受給者は個人15,000円
 */
import seido from "@/data/seido/kougaku-kaigo-service-hi.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kougakuKaigoServiceHiDataset = seido as unknown as SeidoDataset;
export const KOUGAKU_KAIGO_DISCLAIMER = seido.disclaimer;

const TIERS = seido.data.brackets.tiers;
const SR = seido.data.scopeRules;

function tierLimit(key: string): number {
  const t = TIERS.find((x) => x.key === key);
  if (!t) throw new Error(`unknown tier: ${key}`);
  return t.limit;
}

/** 課税区分の限度額 */
export const LIMIT_KAZEI690 = tierLimit("kazei690"); // 140,100
export const LIMIT_KAZEI380 = tierLimit("kazei380"); // 93,000
export const LIMIT_KAZEI_UNDER380 = tierLimit("kazei-under380"); // 44,400
export const LIMIT_HIKAZEI = tierLimit("hikazei"); // 24,600（世帯非課税）
export const LIMIT_INDIVIDUAL = tierLimit("seikatsu-hogo"); // 15,000（個人・生活保護／非課税低年金の個人適用）

/** 個人15,000円が適用される年金収入等の上限（8/1で改定） */
export const NENKIN_BOUNDARY_FROM_AUG2026 = SR.boundaryNenkin.value; // 826,500
export const NENKIN_BOUNDARY_BEFORE_AUG2026 = SR.boundaryNenkinBeforeAug2026.value; // 809,000
export const NENKIN_BOUNDARY_SWITCH_DATE = "2026-08-01";

/** UIで選ばせる所得区分（世帯の課税状況＋非課税者の年金） */
export type IncomeCategory =
  | "kazei690"
  | "kazei380"
  | "kazei-under380"
  | "hikazei" // 世帯非課税（年金収入等が境界超）
  | "hikazei-nenkin" // 世帯非課税 かつ 年金収入等が低い（個人15,000円が有利なら適用）
  | "seikatsu-hogo"; // 生活保護

export interface CategoryInfo {
  key: IncomeCategory;
  label: string;
  householdLimit: number; // 世帯合算で比較する限度額
  /** 個人15,000円の上乗せ判定を行うか */
  individualOverride: boolean;
  /** 生活保護のように最初から個人単位で判定するか */
  individualOnly: boolean;
}

export function categoryInfo(key: IncomeCategory): CategoryInfo {
  switch (key) {
    case "kazei690":
      return { key, label: TIERS.find((t) => t.key === "kazei690")!.label, householdLimit: LIMIT_KAZEI690, individualOverride: false, individualOnly: false };
    case "kazei380":
      return { key, label: TIERS.find((t) => t.key === "kazei380")!.label, householdLimit: LIMIT_KAZEI380, individualOverride: false, individualOnly: false };
    case "kazei-under380":
      return { key, label: TIERS.find((t) => t.key === "kazei-under380")!.label, householdLimit: LIMIT_KAZEI_UNDER380, individualOverride: false, individualOnly: false };
    case "hikazei":
      return { key, label: TIERS.find((t) => t.key === "hikazei")!.label, householdLimit: LIMIT_HIKAZEI, individualOverride: false, individualOnly: false };
    case "hikazei-nenkin":
      return { key, label: TIERS.find((t) => t.key === "hikazei-nenkin")!.label, householdLimit: LIMIT_HIKAZEI, individualOverride: true, individualOnly: false };
    case "seikatsu-hogo":
      return { key, label: TIERS.find((t) => t.key === "seikatsu-hogo")!.label, householdLimit: LIMIT_INDIVIDUAL, individualOverride: false, individualOnly: true };
  }
}

/** 基準日に応じた年金収入等の境界額 */
export function nenkinBoundary(today: string): number {
  return today >= NENKIN_BOUNDARY_SWITCH_DATE
    ? NENKIN_BOUNDARY_FROM_AUG2026
    : NENKIN_BOUNDARY_BEFORE_AUG2026;
}

export interface KougakuKaigoInput {
  /** 本人の1か月の介護サービス利用者負担（円） */
  userSelfPay: number;
  /** 同一世帯の他の要介護者の1か月の利用者負担合計（円・任意） */
  householdOtherSelfPay?: number;
  category: IncomeCategory;
}

export interface KougakuKaigoResult {
  ok: true;
  category: CategoryInfo;
  householdTotal: number;
  /** 適用された限度額（表示用。個人適用時は15,000） */
  appliedLimit: number;
  /** 本人が払い戻される高額介護サービス費 */
  userRefund: number;
  /** 世帯全体の払い戻し額（按分前） */
  householdRefund: number;
  /** 個人15,000円の上乗せが適用されたか */
  individualApplied: boolean;
  /** 払い戻し後の本人の実質負担 */
  userNetPay: number;
  eligible: boolean;
}

export type KougakuKaigoCalcResult = KougakuKaigoResult | { ok: false; error: string };

export function calcKougakuKaigo(input: KougakuKaigoInput): KougakuKaigoCalcResult {
  if (!Number.isFinite(input.userSelfPay) || input.userSelfPay < 0) {
    return { ok: false, error: "本人の月額利用者負担を0以上で入力してください。" };
  }
  const other = input.householdOtherSelfPay ?? 0;
  if (other < 0) {
    return { ok: false, error: "世帯の他の方の負担額は0以上で入力してください。" };
  }
  const info = categoryInfo(input.category);
  const householdTotal = input.userSelfPay + other;

  let userRefund: number;
  let householdRefund: number;
  let appliedLimit = info.householdLimit;
  let individualApplied = false;

  if (info.individualOnly) {
    // 生活保護: 個人単位で15,000円と比較
    userRefund = Math.max(0, input.userSelfPay - info.householdLimit);
    householdRefund = userRefund;
    appliedLimit = info.householdLimit;
  } else {
    // 世帯合算で判定 → 本人へ按分
    householdRefund = Math.max(0, householdTotal - info.householdLimit);
    userRefund =
      householdTotal > 0 ? Math.floor(householdRefund * (input.userSelfPay / householdTotal)) : 0;

    // 個人15,000円の上乗せ（有利な方）
    if (info.individualOverride) {
      const individualRefund = Math.max(0, input.userSelfPay - LIMIT_INDIVIDUAL);
      if (individualRefund > userRefund) {
        userRefund = individualRefund;
        individualApplied = true;
        appliedLimit = LIMIT_INDIVIDUAL;
      }
    }
  }

  return {
    ok: true,
    category: info,
    householdTotal,
    appliedLimit,
    userRefund,
    householdRefund,
    individualApplied,
    userNetPay: input.userSelfPay - userRefund,
    eligible: userRefund > 0,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
