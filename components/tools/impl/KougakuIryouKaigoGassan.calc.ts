/*
 * 高額医療・高額介護合算療養費 チェック（P2-T07）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/11-kougaku-iryou-kaigo-gassan.md
 *
 * SSOT: data/seido/kougaku-iryou-kaigo-gassan.json（健康保険法施行令・介護保険法施行令等）。
 * 合算算定基準額（限度額）はすべて同JSONから import し、本ファイルにハードコードしない。
 *
 * ★制度の骨格★
 *   毎年8月1日〜翌年7月31日の1年間で、同一世帯の医療保険と介護保険の自己負担
 *   （高額療養費・高額介護サービス費を適用した後の額）を合算し、所得区分別の
 *   合算算定基準額を超えた分が支給される。
 *   ・医療・介護の両方に自己負担があること（どちらかが0円なら不支給）
 *   ・超過額が支給基準額（501円）以上でなければ支給されない
 *   ・支給額は医療保険者・介護保険者に按分して別々に支給される
 */
import seido from "@/data/seido/kougaku-iryou-kaigo-gassan.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kougakuGassanDataset = seido as unknown as SeidoDataset;
export const KOUGAKU_GASSAN_DISCLAIMER = seido.disclaimer;

const B = seido.data.brackets;
const R = seido.data.calculationRules;

/** 支給される最低額（支給基準額を超える額がこの額以上でないと支給されない） */
export const MINIMUM_PAYMENT = R.minimumPayment.value; // 501
/** 70歳未満の医療費が合算対象となる下限（1か月・医療機関別） */
export const MINIMUM_MEDICAL_COST = R.minimumMedicalCost.value; // 21,000

export type GroupKey =
  | "kenpoUnder70"
  | "kenpo70plus"
  | "kokuhoUnder70"
  | "kokuho70plus"
  | "kourei70plus";

export interface GroupTier {
  key: string;
  label: string;
  limit: number;
}

const GROUP_KEYS: GroupKey[] = [
  "kenpoUnder70",
  "kenpo70plus",
  "kokuhoUnder70",
  "kokuho70plus",
  "kourei70plus",
];

export function groupTiers(group: GroupKey): GroupTier[] {
  return B[group].tiers.map((t) => ({ key: t.key, label: t.label, limit: t.limit }));
}

export function limitFor(group: GroupKey, tierKey: string): number | null {
  const t = B[group].tiers.find((x) => x.key === tierKey);
  return t ? t.limit : null;
}

/** 保険の種類・年齢からグループキーを決める（後期高齢は常に70plus扱い） */
export function resolveGroup(
  insurer: "kenpo" | "kokuho" | "kourei",
  over70: boolean,
): GroupKey {
  if (insurer === "kourei") return "kourei70plus";
  if (insurer === "kenpo") return over70 ? "kenpo70plus" : "kenpoUnder70";
  return over70 ? "kokuho70plus" : "kokuhoUnder70";
}

export interface KougakuGassanInput {
  group: GroupKey;
  tierKey: string;
  /** 医療保険の年間自己負担額（高額療養費適用後・円） */
  annualMedical: number;
  /** 介護保険の年間自己負担額（高額介護サービス費適用後・円） */
  annualKaigo: number;
}

export interface KougakuGassanResult {
  ok: true;
  limit: number;
  combined: number;
  /** 医療・介護の両方に自己負担があるか */
  bothPresent: boolean;
  /** 合算額が基準額を超えたか（超過額） */
  excess: number;
  /** 支給されるか（両方あり かつ 超過額≥501） */
  paid: boolean;
  totalRefund: number;
  /** 医療保険者から支給される分 */
  medicalPortion: number;
  /** 介護保険者から支給される分 */
  kaigoPortion: number;
}

export type KougakuGassanCalcResult = KougakuGassanResult | { ok: false; error: string };

export function calcKougakuGassan(input: KougakuGassanInput): KougakuGassanCalcResult {
  if (!GROUP_KEYS.includes(input.group)) {
    return { ok: false, error: "保険の種類・年齢区分の指定が正しくありません。" };
  }
  const limit = limitFor(input.group, input.tierKey);
  if (limit == null) {
    return { ok: false, error: "所得区分の指定が正しくありません。" };
  }
  if (!Number.isFinite(input.annualMedical) || input.annualMedical < 0) {
    return { ok: false, error: "医療保険の年間自己負担額を0以上で入力してください。" };
  }
  if (!Number.isFinite(input.annualKaigo) || input.annualKaigo < 0) {
    return { ok: false, error: "介護保険の年間自己負担額を0以上で入力してください。" };
  }

  const combined = input.annualMedical + input.annualKaigo;
  const bothPresent = input.annualMedical > 0 && input.annualKaigo > 0;
  const excess = combined - limit;
  const paid = bothPresent && excess >= MINIMUM_PAYMENT;

  const totalRefund = paid ? excess : 0;
  const medicalPortion =
    paid && combined > 0 ? Math.floor((totalRefund * input.annualMedical) / combined) : 0;
  const kaigoPortion = paid ? totalRefund - medicalPortion : 0;

  return {
    ok: true,
    limit,
    combined,
    bothPresent,
    excess,
    paid,
    totalRefund,
    medicalPortion,
    kaigoPortion,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
