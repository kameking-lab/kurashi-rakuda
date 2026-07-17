/**
 * 戌の日計算・安産祈願カレンダー（Q3-02）計算ロジック。
 * 仕様: specs/b-tools/02-inu-no-hi-calendar.md
 *
 * すべて純関数。日付は文字列 "YYYY-MM-DD" で受け渡しし、
 * 内部演算はタイムゾーンに依存しない UTC ミリ秒で行う。
 *
 * ネーゲレ概算法系の定数（280・112）のSSOTは
 * data/tables/san-fujinka-kijun.json（ShussanYoteibi.calc.ts と共有）。ここに数値を書かない。
 */
import sanFujinkaKijun from "@/data/tables/san-fujinka-kijun.json";

export type InunohiInputMode = "lmp" | "edd";

export interface InunohiInput {
  /** 入力方式: 最終月経開始日 or 出産予定日 */
  inputMode: InunohiInputMode;
  /** 最終月経開始日 (YYYY-MM-DD)。inputMode="lmp" のとき必須 */
  lmp?: string;
  /** 出産予定日 (YYYY-MM-DD)。inputMode="edd" のとき必須 */
  edd?: string;
  /** 基準日 (YYYY-MM-DD)。省略時は実行時の当日 */
  baseDate?: string;
  /** カレンダー表示件数（1〜12）。省略時は6 */
  calendarCount?: number;
}

export interface InunohiResult {
  /** 逆算・入力された最終月経開始日 */
  lmp: string;
  /** 妊娠5ヶ月に入る日（= LMP + 112日） */
  month5Start: string;
  /** 妊娠5ヶ月最初の戌の日 */
  firstInuNoHi: string;
  /** firstInuNoHi から12日おきに calendarCount 件並べた戌の日リスト */
  calendar: string[];
  /** baseDate が firstInuNoHi より後か */
  isPast: boolean;
  /** isPast の場合、基準日以降で最初に巡ってくる戌の日 */
  nextInuNoHi: string | null;
}

export type InunohiOutput =
  | { ok: true; result: InunohiResult }
  | { ok: false; error: string };

/** ネーゲレ概算法による妊娠期間の基本日数（ツール1と共通） */
export const PREGNANCY_DAYS = sanFujinkaKijun.kihon_nissuu_280.value;

/** LMP から妊娠5ヶ月（16週0日）に入る日までの日数 */
export const MONTH5_OFFSET_DAYS = sanFujinkaKijun.ninshin_5kagetsu_kasan_nissuu_112.value;

/** 十二支「戌」の周期日数 */
export const INU_CYCLE_DAYS = 12;

/** カレンダー表示件数の許容範囲 */
export const CALENDAR_COUNT_MIN = 1;
export const CALENDAR_COUNT_MAX = 12;

/** 実在の戌の日として確認済みのアンカー日（2026年1月12日・月曜） */
export const ANCHOR_INU_DATE = "2026-01-12";

const MS_PER_DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** "YYYY-MM-DD" 形式かつ暦上実在する日付か（例: 2026-02-30 のような値を弾く） */
export function isValidDateString(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  return formatDate(parseDate(dateStr)) === dateStr;
}

/**
 * 十二支の「戌」の日か判定する（12日周期）。
 * ((日数差 % 12) + 12) % 12 で負値も0〜11に正規化してから判定する。
 */
export function isInuNoHi(dateStr: string): boolean {
  const anchor = parseDate(ANCHOR_INU_DATE);
  const diff = diffDays(parseDate(dateStr), anchor);
  return ((diff % INU_CYCLE_DAYS) + INU_CYCLE_DAYS) % INU_CYCLE_DAYS === 0;
}

/** 日付文字列の曜日を「月」〜「日」の1文字で返す */
export function weekdayJa(dateStr: string): string {
  return WEEKDAY_JA[parseDate(dateStr).getUTCDay()];
}

/** 「2026年4月30日（木）」形式の表示用文字列 */
export function formatDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日（${weekdayJa(dateStr)}）`;
}

function todayStr(): string {
  return formatDate(new Date());
}

/**
 * 戌の日計算のメインロジック。
 * 仕様書のロジック仕様1〜5を順に実行する。
 */
export function calcInunohi(input: InunohiInput): InunohiOutput {
  const calendarCount = input.calendarCount ?? 6;
  if (
    !Number.isInteger(calendarCount) ||
    calendarCount < CALENDAR_COUNT_MIN ||
    calendarCount > CALENDAR_COUNT_MAX
  ) {
    return {
      ok: false,
      error: `戌の日カレンダーの表示件数は${CALENDAR_COUNT_MIN}〜${CALENDAR_COUNT_MAX}件の範囲で入力してください。`,
    };
  }

  const baseDateStr = input.baseDate ?? todayStr();
  if (!isValidDateString(baseDateStr)) {
    return { ok: false, error: "基準日を正しい日付形式で入力してください。" };
  }
  const baseDate = parseDate(baseDateStr);

  let lmpStr: string;
  if (input.inputMode === "edd") {
    if (!input.edd || !isValidDateString(input.edd)) {
      return { ok: false, error: "出産予定日を正しい日付で入力してください。" };
    }
    // lmp モードの範囲チェックと対称の防御（過去日・遠未来日の誤入力を弾く）
    if (diffDays(baseDate, parseDate(input.edd)) > 0) {
      return {
        ok: false,
        error: "出産予定日が基準日より前の日付になっています。入力をご確認ください。",
      };
    }
    if (diffDays(parseDate(input.edd), baseDate) > 310) {
      return {
        ok: false,
        error: "出産予定日が基準日から310日以上先になっています。入力をご確認ください。",
      };
    }
    lmpStr = formatDate(addDays(parseDate(input.edd), -PREGNANCY_DAYS));
  } else if (input.inputMode === "lmp") {
    if (!input.lmp || !isValidDateString(input.lmp)) {
      return { ok: false, error: "最終月経開始日を正しい日付形式で入力してください。" };
    }
    lmpStr = input.lmp;
    const lmp = parseDate(lmpStr);
    if (diffDays(lmp, baseDate) > 0) {
      return {
        ok: false,
        error: "最終月経開始日は基準日以前の日付を入力してください。",
      };
    }
    if (diffDays(baseDate, lmp) >= 330) {
      return {
        ok: false,
        error: "最終月経開始日が基準日より330日以上前になっています。日付を確認してください。",
      };
    }
  } else {
    return { ok: false, error: "入力方式を選択してください。" };
  }

  const lmp = parseDate(lmpStr);
  const month5Start = addDays(lmp, MONTH5_OFFSET_DAYS);
  const month5StartStr = formatDate(month5Start);

  let cursor = month5StartStr;
  while (!isInuNoHi(cursor)) {
    cursor = formatDate(addDays(parseDate(cursor), 1));
  }
  const firstInuNoHi = cursor;

  const calendar: string[] = [];
  let current = firstInuNoHi;
  for (let i = 0; i < calendarCount; i++) {
    calendar.push(current);
    current = formatDate(addDays(parseDate(current), INU_CYCLE_DAYS));
  }

  const isPast = diffDays(baseDate, parseDate(firstInuNoHi)) > 0;

  // 基準日以降で最初に巡ってくる戌の日（firstInuNoHi から12日周期で前進探索）
  let nextInuNoHi: string | null = null;
  if (isPast) {
    let candidate = parseDate(firstInuNoHi);
    while (diffDays(baseDate, candidate) > 0) {
      candidate = addDays(candidate, INU_CYCLE_DAYS);
    }
    nextInuNoHi = formatDate(candidate);
  }

  return {
    ok: true,
    result: {
      lmp: lmpStr,
      month5Start: month5StartStr,
      firstInuNoHi,
      calendar,
      isPast,
      nextInuNoHi,
    },
  };
}
