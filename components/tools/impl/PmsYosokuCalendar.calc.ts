/**
 * PMS・体調予測カレンダー（記録なし版）（P2-T31）— 計算ロジック（純関数）。
 * specs/b-tools/p2-t31-pms-yosoku-calendar.md に準拠。
 *
 * ★周期予測ロジックは独自に再実装しない★
 * 次回月経開始予定日・排卵予測日（黄体期14日固定モデル）・複数周期分のカレンダーは
 * 生理周期・排卵日予測（Q3-03）の `calcSeiriShuki` をそのまま呼び出して使う。
 * 本ファイルが追加するのは、その結果（各周期の月経開始予定日）から
 * 黄体期間とPMS症状の目安期間を導出する薄い後処理レイヤーのみ。
 *
 * ★医療判断なし（仕様で固定）★
 * 症状の診断・重症度判定は一切行わない。あくまで「この時期は症状が出やすいと
 * 言われている」という一般情報（日付演算による目安）の提示にとどめる。
 *
 * ★数値はすべて data/tables/pms-yosoku-shikumi.json から読む（直書き禁止）。★
 */
import {
  calcSeiriShuki,
  CYCLE_LENGTH_MIN,
  CYCLE_LENGTH_MAX,
  LUTEAL_PHASE_DAYS,
  PERIOD_LENGTH_MIN,
  PERIOD_LENGTH_MAX,
  type SeiriShukiInput,
  type SeiriShukiValidationError,
} from "./SeiriShuki.calc";
import pmsData from "@/data/tables/pms-yosoku-shikumi.json";

// SeiriShuki.calc.ts の定数・関数をそのまま再エクスポートする（独自の再実装をしないことの明示）
export { CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX, LUTEAL_PHASE_DAYS, PERIOD_LENGTH_MIN, PERIOD_LENGTH_MAX };

/** PMSの定義（日本産婦人科学会）。data/tables/pms-yosoku-shikumi.json より */
export const PMS_DEFINITION_TEXT = pmsData.pmsDefinition.definition;

/** PMS症状が出やすいとされる期間: 次回月経開始予定日の何日前から何日前まで（月経前3〜10日） */
export const PMS_ONSET_DAYS_FROM = pmsData.pmsDefinition.onsetBeforeMenstruationDaysFrom;
export const PMS_ONSET_DAYS_TO = pmsData.pmsDefinition.onsetBeforeMenstruationDaysTo;

/** PMSの有病率（月経がある女性に占める割合。w-health.jp出典） */
export const PMS_PREVALENCE_FROM_PERCENT = pmsData.pmsDefinition.prevalence.valueFromPercent;
export const PMS_PREVALENCE_TO_PERCENT = pmsData.pmsDefinition.prevalence.valueToPercent;

/** 黄体期の説明ラベル（例: 「約2週間（約14日）」） */
export const LUTEAL_PHASE_APPROX_LABEL = pmsData.menstrualCycle.lutealPhase.approximateLengthLabel;

/** データの disclaimer をそのまま表示用に公開する */
export const PMS_DISCLAIMER = pmsData.disclaimer;

/** 受診の目安（定性的な表現のみ。数値基準は一次情報になし） */
export const PMS_CONSULTATION_GUIDANCE_TEXT = pmsData.consultationGuidance.pmsGuidance.text;

// ---------------------------------------------------------------- 日付ヘルパー
// SeiriShuki.calc.ts は日付シフト用のヘルパーを外部にexportしていないため、
// calcSeiriShuki が返す検証済みのISO日付文字列（YYYY-MM-DD）に対して
// 固定日数を加減するだけの小さなヘルパーを用意する。
// ★これは周期予測ロジックの再実装ではなく、既に確定した日付への単純なオフセット計算★
// UTC正午固定で解釈するため、月末・年またぎ・うるう年も暦日数の実加算で自動処理される。

function parseIsoDateAtNoonUtc(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(value: string, days: number): string {
  const date = parseIsoDateAtNoonUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

// ---------------------------------------------------------------- 入出力の型

export interface PmsYosokuCalendarInput {
  /** 最終月経開始日（YYYY-MM-DD） */
  lmp: string;
  /** 平均月経周期日数（デフォルト28） */
  cycleLength?: number;
  /** 基準日（YYYY-MM-DD、デフォルト＝実行時の当日） */
  baseDate?: string;
  /** カレンダー表示する周期数（デフォルト3、1〜6にクランプ。calcSeiriShukiが内部で処理） */
  calendarCount?: number;
}

/** 1周期分の黄体期間・PMS症状が出やすい時期の目安 */
export interface PmsCycleWindow {
  /** 1始まりの周期番号（n=1が直近の次回） */
  cycleNumber: number;
  /** その周期の月経開始予定日 */
  periodDate: string;
  /** 黄体期の開始（＝その周期の排卵予測日） */
  lutealPhaseStart: string;
  /** 黄体期の終了（月経開始前日まで） */
  lutealPhaseEnd: string;
  /** PMS症状が出やすいとされる時期の目安（開始。月経開始の10日前） */
  pmsWindowStart: string;
  /** PMS症状が出やすいとされる時期の目安（終了。月経開始の3日前） */
  pmsWindowEnd: string;
}

export interface PmsYosokuCalendarResult {
  /** 次回の月経開始予定日（calcSeiriShukiの結果をそのまま透過） */
  nextPeriodDate: string;
  /** 直近（第1周期）の黄体期間・PMS目安期間 */
  current: PmsCycleWindow;
  /** calendarCount 件分の周期ごとの黄体期間・PMS目安期間 */
  calendar: PmsCycleWindow[];
}

export type PmsYosokuCalendarOutput =
  | ({ ok: true } & PmsYosokuCalendarResult)
  | SeiriShukiValidationError;

/**
 * PMS・体調予測カレンダーの計算本体。
 * 診断・重症度判定は一切行わない。calcSeiriShuki が算出した月経開始予定日の
 * 配列から、黄体期間とPMS症状が出やすいとされる時期の目安を導出するのみ。
 */
export function calcPmsYosokuCalendar(input: PmsYosokuCalendarInput): PmsYosokuCalendarOutput {
  const seiriInput: SeiriShukiInput = {
    lmp: input.lmp,
    cycleLength: input.cycleLength,
    baseDate: input.baseDate,
    calendarCount: input.calendarCount,
  };

  const seiriResult = calcSeiriShuki(seiriInput);
  if (!seiriResult.ok) {
    return seiriResult;
  }

  const calendar: PmsCycleWindow[] = seiriResult.calendar.map((periodDate, index) => {
    const lutealPhaseStart = shiftDays(periodDate, -LUTEAL_PHASE_DAYS);
    const lutealPhaseEnd = shiftDays(periodDate, -1);
    const pmsWindowStart = shiftDays(periodDate, -PMS_ONSET_DAYS_TO);
    const pmsWindowEnd = shiftDays(periodDate, -PMS_ONSET_DAYS_FROM);
    return {
      cycleNumber: index + 1,
      periodDate,
      lutealPhaseStart,
      lutealPhaseEnd,
      pmsWindowStart,
      pmsWindowEnd,
    };
  });

  return {
    ok: true,
    nextPeriodDate: seiriResult.nextPeriodDate,
    current: calendar[0],
    calendar,
  };
}

export function formatJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export function formatJaShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}月${d}日`;
}
