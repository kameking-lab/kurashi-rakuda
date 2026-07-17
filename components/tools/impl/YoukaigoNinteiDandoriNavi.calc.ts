/**
 * 要介護認定 申請段取りナビ の計算ロジック（specs/b-tools/p2-t37-youkaigo-nintei-dandori-navi.md）。
 *
 * すべての制度数値は data/seido/kaigo-nintei-shori-kikan.json（新規・P2-D05解消）と
 * data/seido/kaigo-hoken.json から読む。ここに数値を書かない。
 * （例外は日数の四捨五入・比較のような算術・境界値上の定数）
 *
 * ★このファイルが守っている「罠」★（仕様書 §9.2）
 *   1. 「30日以内」は介護保険法第27条第11項の原則であり、保証ではない
 *      （同項ただし書＝特別な理由があれば処理見込期間と理由を通知して延期できる）
 *   2. 全国平均は実際には39.8日、申請から30日以内に認定された割合は平均25.1%
 *      （原則どおりに終わるほうが少数派という実態を隠さず示す）
 *   3. suggestedTargets（7日/13日/12日）は令和7年2月20日時点の『対応（案）』であり、
 *      全保険者共通の確定基準ではない。断定的な「◯日で終わります」という表現をしない
 *   4. 認定調査と主治医意見書は原則として並行して進む（直列に7日+13日=20日ではない。
 *      介護認定審査会の事務処理は「両方が揃った日」を起点に始まる）
 *   5. 現在地の推定はあくまで申請日からの経過日数に基づく概算であり、
 *      実際の進捗は自治体からの連絡・書類で確認する必要がある旨を必ず明示する
 *   6. 認定後（ケアプラン作成〜サービス利用開始）は日数の一次データを持たない。
 *      断定的な日数を出さず、手続の順序のみを示す
 *   7. 要介護度の「状態像」は説明しない（法令・告示に根拠がない。kaigo-hoken.json 参照）
 */

import kaigoNintei from "@/data/seido/kaigo-nintei-shori-kikan.json";
import kaigoHoken from "@/data/seido/kaigo-hoken.json";
import { addDays, isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const kaigoNinteiDataset = kaigoNintei as unknown as SeidoDataset;
export const kaigoHokenDataset = kaigoHoken as unknown as SeidoDataset;

const D = kaigoNintei.data;
const LP = D.legalPeriod;
const PS = D.processSteps;
const APT = D.actualProcessingTime;

/** 介護保険法第27条第11項の原則的な処理期間（日）。★30★ をここ以外にハードコードしない */
export const LEGAL_PERIOD_DAYS = LP.principle.value;
/** 手続の流れ（法第27条の順序どおり）。経過的要介護のような levels[] と違い、全件を順に表示する */
export const PROCESS_STEPS = PS.steps;
export const EXTENSION_TEXT = LP.extension.value;
export const DEEMED_REJECTION_TEXT = LP.deemedRejection.value;

/** 全国平均の認定審査期間（令和5年度実績）。★30日を上回っている実態そのもの★ */
export const NATIONAL_AVERAGE_DAYS = APT.nationalAverage.value;
export const NATIONAL_AVERAGE_LABEL = APT.nationalAverage.label;
/** 申請から30日以内に認定された割合（全保険者平均、令和5年度実績） */
export const WITHIN_30_DAYS_SHARE = APT.within30DaysShare.value;
export const SUGGESTED_TARGETS = APT.suggestedTargets;
export const STEP_AVERAGES_WITHIN_30_DAYS = APT.stepAveragesWithin30Days;
export const ACTUAL_PROCESSING_NOTE = APT.note;

/** ★要介護度の状態像は定義されていない（kaigo-hoken.json が既に確立した鉄則を再利用）★ */
export const NO_STATE_DEFINITION = kaigoHoken.data.yokaigoNintei.noStateDefinition.value;
/** 一次判定・二次判定の仕組み（kaigo-hoken.json 由来。二重に数値を持たない） */
export const NINTEI_MECHANISM_NOTE = kaigoHoken.data.yokaigoNintei.process.value;

// ---------------------------------------------------------------- 日付ユーティリティ

/** ISO日付どうしの日数差（to − from）。addDays の逆演算に相当 */
function diffDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

// ---------------------------------------------------------------- 入力

export interface NaviInput {
  /** 申請日（申請済みの場合）または申請予定日（未来日でもよい）。ISO（YYYY-MM-DD） */
  applicationDate: string;
  /** 基準日（今日）。ISO。クライアント側で取得した「今日」を渡す（SSR/SSGとずれないため） */
  today: string;
}

// ---------------------------------------------------------------- バリデーション

export interface DateValidation {
  ok: boolean;
  error?: string;
}

/** 日付形式のごく簡単な検査（YYYY-MM-DD、実在する日付か）。ソフトな範囲チェックは別関数 */
export function validateDate(iso: string): DateValidation {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { ok: false, error: "日付の形式が正しくありません。" };
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return { ok: false, error: "実在しない日付です。" };
  // 往復させて丸め込み（例: 2026-02-30 のような無効日）が起きていないか確認する
  const d = new Date(t);
  const roundTrip = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  if (roundTrip !== iso) return { ok: false, error: "実在しない日付です。" };
  return { ok: true };
}

/** 申請予定日が今日から極端に先（約1年以上）でないか。ソフト警告のみ（誤入力の目安） */
export function isApplicationFarInFuture(applicationDate: string, today: string): boolean {
  return diffDays(today, applicationDate) > 365;
}

/** 申請日が極端に古く（約2年＝要介護認定の有効期間の目安を大きく超える）ないか。ソフト警告のみ */
export function isApplicationVeryOld(applicationDate: string, today: string): boolean {
  return diffDays(applicationDate, today) > 730;
}

// ---------------------------------------------------------------- 現在地の推定

export type StageKey =
  | "before_application"
  | "shinsei"
  | "chosa_and_ikensho"
  | "ikensho_machi"
  | "shinsakai"
  | "kekka_machi"
  | "over_deadline";

export const STAGE_LABELS: Record<StageKey, string> = {
  before_application: "申請前",
  shinsei: "申請したところ",
  chosa_and_ikensho: "認定調査・主治医意見書の準備中（目安）",
  ikensho_machi: "主治医意見書の入手待ち（目安。認定調査は目安上は完了ごろ）",
  shinsakai: "介護認定審査会での審査判定中（目安）",
  kekka_machi: "認定結果の通知待ち（原則の30日以内）",
  over_deadline: "原則の30日を超過（延期の通知が届いているか、市区町村にご確認を）",
};

export interface IllustrativeTimeline {
  /** 認定調査の実施目安（申請日から何日後） */
  ninteiChosaByDay: number;
  /** 主治医意見書の入手目安（申請日から何日後） */
  shujiiIkenshoByDay: number;
  /** 両方が揃う目安（上記2つの遅い方） */
  bothReadyByDay: number;
  /** 介護認定審査会での審査判定の目安（両方が揃ってから、申請日から何日後） */
  shinsakaiByDay: number;
  ninteiChosaDate: string;
  shujiiIkenshoDate: string;
  shinsakaiDate: string;
}

/**
 * 目安の日程（イラストレーション用）。
 * ★罠4★ 認定調査と主治医意見書は「依頼から」の所要期間が別々に示されており、
 * 実務上は申請受付後まもなく両方に依頼が出て並行して進む（r117資料の図に基づく）。
 * よって単純合計（7+13=20日）ではなく、遅い方（13日）を採用したうえで
 * 審査会等事務処理（12日）を足す。
 */
export function calcIllustrativeTimeline(applicationDate: string): IllustrativeTimeline {
  const ninteiChosaByDay = Math.round(SUGGESTED_TARGETS.ninteiChosa.value);
  const shujiiIkenshoByDay = Math.round(SUGGESTED_TARGETS.shujiiIkensho.value);
  const bothReadyByDay = Math.max(ninteiChosaByDay, shujiiIkenshoByDay);
  const shinsakaiByDay = bothReadyByDay + Math.round(SUGGESTED_TARGETS.shinsakaiJimu.value);

  return {
    ninteiChosaByDay,
    shujiiIkenshoByDay,
    bothReadyByDay,
    shinsakaiByDay,
    ninteiChosaDate: addDays(applicationDate, ninteiChosaByDay),
    shujiiIkenshoDate: addDays(applicationDate, shujiiIkenshoByDay),
    shinsakaiDate: addDays(applicationDate, shinsakaiByDay),
  };
}

/**
 * 経過日数から現在地を推定する。★あくまで目安の推定★
 * 申請日以前（未申請）は before_application を返す。
 */
export function estimateStage(
  daysElapsed: number | null,
  timeline: IllustrativeTimeline,
): StageKey {
  if (daysElapsed === null) return "before_application";
  if (daysElapsed <= 0) return "shinsei";
  if (daysElapsed < timeline.ninteiChosaByDay) return "chosa_and_ikensho";
  if (daysElapsed < timeline.bothReadyByDay) return "ikensho_machi";
  if (daysElapsed < timeline.shinsakaiByDay) return "shinsakai";
  if (daysElapsed <= LEGAL_PERIOD_DAYS) return "kekka_machi";
  return "over_deadline";
}

// ---------------------------------------------------------------- 総合

export interface NaviResult {
  expired: boolean;
  /** 申請済みか（applicationDate <= today） */
  applied: boolean;
  /** 未申請の場合、申請予定日までの残り日数 */
  daysUntilApplication: number | null;
  /** 申請済みの場合、申請日からの経過日数 */
  daysElapsedSinceApplication: number | null;
  /** 原則の期限日（申請日から30日後） */
  legalDeadlineDate: string;
  /** 原則の期限（30日）を過ぎているか */
  isPastLegalDeadline: boolean;
  estimatedStage: StageKey;
  timeline: IllustrativeTimeline;
}

export function calcNavi(input: NaviInput): NaviResult {
  const expired =
    isDataExpired(kaigoNinteiDataset, input.today) || isDataExpired(kaigoHokenDataset, input.today);

  const applied = input.applicationDate <= input.today;
  const daysUntilApplication = applied ? null : diffDays(input.today, input.applicationDate);
  const daysElapsedSinceApplication = applied ? diffDays(input.applicationDate, input.today) : null;

  const legalDeadlineDate = addDays(input.applicationDate, LEGAL_PERIOD_DAYS);
  const isPastLegalDeadline =
    daysElapsedSinceApplication !== null && daysElapsedSinceApplication > LEGAL_PERIOD_DAYS;

  const timeline = calcIllustrativeTimeline(input.applicationDate);
  const estimatedStage = estimateStage(daysElapsedSinceApplication, timeline);

  return {
    expired,
    applied,
    daysUntilApplication,
    daysElapsedSinceApplication,
    legalDeadlineDate,
    isPastLegalDeadline,
    estimatedStage,
    timeline,
  };
}

// ---------------------------------------------------------------- 認定後の手続（★日数の一次データを持たない★）

/**
 * 認定後の手続。要介護認定の処理期間データ（30日原則）の対象外であり、
 * 一次データに日数の目安がないため、断定的な日数を出さず順序のみを示す。
 */
export interface PostDecisionStep {
  key: string;
  label: string;
  description: string;
}

export const POST_DECISION_STEPS: PostDecisionStep[] = [
  {
    key: "care_plan",
    label: "ケアプランの作成（要介護の場合は居宅サービス計画、要支援の場合は介護予防サービス計画）",
    description:
      "要介護の認定を受けた方は、居宅介護支援事業者（ケアマネジャー）にケアプランの作成を依頼するのが一般的です。要支援の認定を受けた方は、地域包括支援センターが窓口になります。",
  },
  {
    key: "service_start",
    label: "介護サービスの利用開始",
    description:
      "ケアプランに基づき、訪問介護・通所介護（デイサービス）などのサービス利用を開始します。急ぎの場合は、認定結果が出る前でも暫定的にケアプランを作成してサービスを利用できる場合があります（結果次第で自己負担の精算が必要になることがあるため、ケアマネジャーや市区町村にご確認ください）。",
  },
];
