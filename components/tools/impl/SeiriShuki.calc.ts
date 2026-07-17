/**
 * 生理周期・排卵日予測（Q3-03）— 計算ロジック（純関数）。
 * specs/b-tools/03-menstrual-cycle-ovulation-predictor.md に準拠。
 * 医学的判断は一切行わない。日付演算のみ（黄体期14日固定モデルによる簡易予測）。
 */

/** 周期日数の有効範囲（生理的範囲の目安。仕様書「データ表」より） */
export const CYCLE_LENGTH_MIN = 20;
export const CYCLE_LENGTH_MAX = 45;

/** 月経持続日数の有効範囲（計算には使わず表示のみに使用） */
export const PERIOD_LENGTH_MIN = 2;
export const PERIOD_LENGTH_MAX = 10;

/** 黄体期の標準日数（固定値として使用） */
export const LUTEAL_PHASE_DAYS = 14;

/** 精子の生存期間の目安（妊娠しやすい期間の開始側算出に使用） */
export const FERTILE_WINDOW_BEFORE_DAYS = 5;

/** 卵子の生存期間の目安（妊娠しやすい期間の終了側算出に使用） */
export const FERTILE_WINDOW_AFTER_DAYS = 1;

/** lmp が baseDate からこの日数以上前だと入力範囲外エラー */
export const LMP_MAX_DAYS_BEFORE_BASE = 90;

export type OvulationStatus =
  | "これからです（予測）"
  | "妊娠しやすい期間の目安に入っています"
  | "この周期の排卵日は過ぎています";

export interface SeiriShukiInput {
  /** 最終月経開始日（YYYY-MM-DD） */
  lmp: string;
  /** 平均月経周期日数（デフォルト28） */
  cycleLength?: number;
  /** 月経が続く日数（デフォルト5。計算には使わず表示のみ） */
  periodLength?: number;
  /** 基準日（YYYY-MM-DD、デフォルト＝実行時の当日） */
  baseDate?: string;
  /** カレンダー表示する周期数（デフォルト3、1〜6） */
  calendarCount?: number;
}

export interface SeiriShukiResult {
  nextPeriodDate: string;
  next2PeriodDate: string;
  ovulationDate: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  ovulationStatus: OvulationStatus;
  /** calendarCount で指定された分の月経開始予定日一覧（n=1,2,3...） */
  calendar: string[];
}

export type SeiriShukiValidationError =
  | { ok: false; error: "INVALID_LMP"; message: string }
  | { ok: false; error: "INVALID_BASE_DATE"; message: string }
  | { ok: false; error: "BASE_BEFORE_LMP"; message: string }
  | { ok: false; error: "LMP_TOO_OLD"; message: string }
  | { ok: false; error: "CYCLE_LENGTH_OUT_OF_RANGE"; message: string }
  | { ok: false; error: "PERIOD_LENGTH_OUT_OF_RANGE"; message: string };

export type SeiriShukiOutput =
  | ({ ok: true } & SeiriShukiResult)
  | SeiriShukiValidationError;

/** YYYY-MM-DD をローカルタイムゾーン非依存の日付として解釈する（UTC正午固定で時差によるずれを防ぐ） */
function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // 桁あふれ（例: 2月30日）を検出する
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function diffDays(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 生理周期・排卵日予測の計算本体。
 * 妊娠の成否判定・診断は一切行わない。入力された周期日数に基づく単純な日付演算のみ。
 */
export function calcSeiriShuki(input: SeiriShukiInput): SeiriShukiOutput {
  const cycleLength = input.cycleLength ?? 28;
  const periodLength = input.periodLength ?? 5;
  const calendarCount = input.calendarCount ?? 3;

  const lmp = parseDateOnly(input.lmp);
  if (!lmp) {
    return {
      ok: false,
      error: "INVALID_LMP",
      message: "最終月経開始日を正しい日付（YYYY-MM-DD）で入力してください",
    };
  }

  const baseDate = input.baseDate ? parseDateOnly(input.baseDate) : new Date();
  if (!baseDate) {
    return {
      ok: false,
      error: "INVALID_BASE_DATE",
      message: "基準日を正しい日付（YYYY-MM-DD）で入力してください",
    };
  }
  // baseDate 省略時（当日実行）は時刻部分を正午UTCへ揃える
  const base = input.baseDate
    ? baseDate
    : new Date(
        Date.UTC(
          baseDate.getUTCFullYear(),
          baseDate.getUTCMonth(),
          baseDate.getUTCDate(),
          12,
          0,
          0,
        ),
      );

  if (diffDays(base, lmp) < 0) {
    return {
      ok: false,
      error: "BASE_BEFORE_LMP",
      message: "基準日は最終月経開始日より後の日付を指定してください",
    };
  }

  if (diffDays(base, lmp) > LMP_MAX_DAYS_BEFORE_BASE) {
    return {
      ok: false,
      error: "LMP_TOO_OLD",
      message: "入力範囲外です。最新の月経開始日を入力してください",
    };
  }

  if (cycleLength < CYCLE_LENGTH_MIN || cycleLength > CYCLE_LENGTH_MAX) {
    return {
      ok: false,
      error: "CYCLE_LENGTH_OUT_OF_RANGE",
      message: `周期日数は${CYCLE_LENGTH_MIN}〜${CYCLE_LENGTH_MAX}の範囲で入力してください`,
    };
  }

  if (periodLength < PERIOD_LENGTH_MIN || periodLength > PERIOD_LENGTH_MAX) {
    return {
      ok: false,
      error: "PERIOD_LENGTH_OUT_OF_RANGE",
      message: `月経が続く日数は${PERIOD_LENGTH_MIN}〜${PERIOD_LENGTH_MAX}の範囲で入力してください`,
    };
  }

  const nextPeriodDate = addDays(lmp, cycleLength);
  const next2PeriodDate = addDays(lmp, cycleLength * 2);
  const ovulationDate = addDays(nextPeriodDate, -LUTEAL_PHASE_DAYS);
  const fertileWindowStart = addDays(ovulationDate, -FERTILE_WINDOW_BEFORE_DAYS);
  const fertileWindowEnd = addDays(ovulationDate, FERTILE_WINDOW_AFTER_DAYS);

  let ovulationStatus: OvulationStatus;
  if (diffDays(base, ovulationDate) < 0) {
    ovulationStatus = "これからです（予測）";
  } else if (diffDays(base, fertileWindowEnd) <= 0) {
    ovulationStatus = "妊娠しやすい期間の目安に入っています";
  } else {
    ovulationStatus = "この周期の排卵日は過ぎています";
  }

  const count = Math.min(6, Math.max(1, calendarCount));
  const calendar = Array.from({ length: count }, (_, i) =>
    formatDate(addDays(lmp, cycleLength * (i + 1))),
  );

  return {
    ok: true,
    nextPeriodDate: formatDate(nextPeriodDate),
    next2PeriodDate: formatDate(next2PeriodDate),
    ovulationDate: formatDate(ovulationDate),
    fertileWindowStart: formatDate(fertileWindowStart),
    fertileWindowEnd: formatDate(fertileWindowEnd),
    ovulationStatus,
    calendar,
  };
}
