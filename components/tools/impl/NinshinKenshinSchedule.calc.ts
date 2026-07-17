/**
 * 妊婦健診スケジュール生成（P2-T14）— 純粋な日付演算ロジック。
 * 仕様: specs/b-tools/p2-t14-ninshin-kenshin-schedule.md
 *
 * 受診間隔の標準（妊娠23週まで4週間に1回・妊娠24週から35週まで2週間に1回・
 * 妊娠36週から出産まで1週間に1回、合計14回程度、1回目の目安は妊娠8週）は
 * 厚生労働省「“妊婦健診”を受けましょう（リーフレット）」（標準的な“妊婦健診”の例）による一次情報。
 * この一次情報の数値そのものは data/seido/ninshin-kenshin-jyosei.json の
 * data.schedule にも収録されており、標準受診回数（14回）はそこから読む（ハードコードしない）。
 *
 * 公費助成に関する事実（14回以上助成する市区町村数など）は data/seido/ninshin-kenshin-jyosei.json、
 * 産後の産婦健康診査に関する事実は data/seido/sanpu-kenshin-jyosei.json を
 * SSOTとして参照する。金額・回数をこのファイルに直書きしない。
 *
 * すべて YYYY-MM-DD の文字列で入出力し、内部では Date.UTC ベースの
 * 「1970-01-01からの経過日数（整数）」に変換して演算することでタイムゾーン依存を排除する
 * （既存の components/tools/impl/Getsurei.calc.ts と同じ方針）。
 * 医学的判断（診断・受診の要否・健康状態の評価）は一切行わない。
 */

import ninshinSeido from "@/data/seido/ninshin-kenshin-jyosei.json";
import sanpuSeido from "@/data/seido/sanpu-kenshin-jyosei.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const ninshinKenshinDataset = ninshinSeido as unknown as SeidoDataset;
export const sanpuKenshinDataset = sanpuSeido as unknown as SeidoDataset;

/** 標準的な妊婦健診の回数（データ由来。2026-07-17時点で14回）。ここに数値を書かない */
export const standardVisitCount: number = ninshinSeido.data.schedule.standardVisitCount.value;

/** 産婦健康診査の国庫補助対象回数（データ由来。2026-07-17時点で2回）。ここに数値を書かない */
export const sanpuCoveredCount: number = sanpuSeido.data.eligibility.timesCovered.value;

/** 産婦健康診査を実施している市区町村数（令和6年度、データ由来） */
export const sanpuImplementingMunicipalities: number =
  sanpuSeido.data.implementationStatus.municipalitiesFY2024.value;

/** 妊婦健診の公費助成調査の対象市区町村数（＝全市区町村数、データ由来） */
export const totalMunicipalities: number =
  ninshinSeido.data.publicFunding.totalMunicipalities.value;

const MS_PER_DAY = 86_400_000;

/** YYYY-MM-DD → 1970-01-01 からの経過日数（整数・UTC基準） */
function toEpochDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** 経過日数（UTC基準） → YYYY-MM-DD */
function fromEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD に日数を加算（負数で減算）した YYYY-MM-DD を返す */
export function addDays(iso: string, days: number): string {
  return fromEpochDay(toEpochDay(iso) + days);
}

/** a − b の日数差（整数。a が後なら正） */
export function diffInDays(a: string, b: string): number {
  return toEpochDay(a) - toEpochDay(b);
}

function daysInMonthUTC(year: number, month: number): number {
  // month: 1-12。翌月0日目 = 当月末日
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** YYYY-MM-DD に暦月を加算する（応当日方式・月末クランプ）。産後1か月の目安に使う */
export function addCalendarMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const yy = Math.floor(idx / 12);
  const mm = ((idx % 12) + 12) % 12 + 1;
  const dd = Math.min(d, daysInMonthUTC(yy, mm));
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** 実行時の「今日」を YYYY-MM-DD で返す（ユーザーのローカル日付基準）。UIからのみ呼び出す */
export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → 「2026年10月8日」表記 */
export function formatJapaneseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** "YYYY-MM-DD" 形式で実在する日付か（2/30 や "abc" を NaN のまま通さない） */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** 妊娠期間の基本日数（40週0日＝280日）。ネーゲレ概算法と同じ基準（Q3-01出産予定日ツールと共通） */
export const GESTATION_DAYS = 280;

/**
 * 標準的な妊婦健診「1回目」の目安週数（妊娠8週）。
 * 出典: 厚生労働省「“妊婦健診”を受けましょう（リーフレット）」の
 * 「1回目が妊娠8週頃とした場合、受診回数は合計14回くらいになりますね」という例示。
 */
export const FIRST_VISIT_WEEK = 8;

/**
 * 妊娠週数 w（0日時点、LMPからの経過週）が属する区分での「次回受診までの目安間隔（週）」。
 * 出典: data/seido/ninshin-kenshin-jyosei.json の data.schedule.intervalDescription
 * 「妊娠初期から妊娠23週まで4週間に1回、妊娠24週から妊娠35週まで2週間に1回、
 *   妊娠36週から出産まで1週間に1回」
 */
export function intervalWeeksForGestationalWeek(w: number): number {
  if (w <= 23) return 4;
  if (w <= 35) return 2;
  return 1;
}

/** 妊娠週数 w が属する区分のラベル（表示用） */
export function phaseLabelForGestationalWeek(w: number): string {
  if (w <= 23) return "妊娠初期〜23週（4週間に1回が目安）";
  if (w <= 35) return "妊娠24週〜35週（2週間に1回が目安）";
  return "妊娠36週〜出産まで（1週間に1回が目安）";
}

export interface NinshinKenshinVisit {
  /** 1始まりの受診回 */
  index: number;
  /** 目安の妊娠週数（0日時点。例: 8 は「妊娠8週0日」） */
  gestationalWeek: number;
  /** 目安の受診日（YYYY-MM-DD） */
  date: string;
  /** 前回からの間隔（週）。1回目は null */
  intervalWeeksFromPrevious: number | null;
  /** 該当区分のラベル */
  phaseLabel: string;
  /** 標準的な受診回数（データ由来）以内かどうか */
  isWithinStandardVisitCount: boolean;
}

export interface GenerateScheduleOptions {
  /** 1回目の目安週数。既定 FIRST_VISIT_WEEK（妊娠8週） */
  firstVisitWeek?: number;
  /** 無限ループ防止用の安全弁。既定100 */
  maxVisits?: number;
}

/**
 * 最終月経開始日（lmp）と出産予定日（dueDate）から、標準的な妊婦健診スケジュールを生成する。
 *
 * ロジック: 1回目は firstVisitWeek（既定・妊娠8週）を目安とし、以降は
 * intervalWeeksForGestationalWeek() が返す「現在の週数が属する区分の間隔」を積算して次回の週数を決める。
 * 次回の目安日が出産予定日以降になる回は生成しない（出産予定日を過ぎた分の受診は本ツールの対象外）。
 *
 * lmp と dueDate がちょうど280日（40週0日）離れている標準的な入力では、
 * 妊娠8週・12週・16週・20週・24週・26週・28週・30週・32週・34週・36週・37週・38週・39週の
 * 14回が生成される（厚生労働省リーフレットの例示と一致）。
 */
export function generateSchedule(
  lmp: string,
  dueDate: string,
  visitCount: number = standardVisitCount,
  options: GenerateScheduleOptions = {},
): NinshinKenshinVisit[] {
  const firstVisitWeek = options.firstVisitWeek ?? FIRST_VISIT_WEEK;
  const maxVisits = options.maxVisits ?? 100;
  const visits: NinshinKenshinVisit[] = [];

  let week = firstVisitWeek;
  let index = 1;
  let prevWeek: number | null = null;

  while (index <= maxVisits) {
    const date = addDays(lmp, week * 7);
    if (diffInDays(date, dueDate) >= 0) break; // 出産予定日以降は生成しない

    visits.push({
      index,
      gestationalWeek: week,
      date,
      intervalWeeksFromPrevious: prevWeek === null ? null : week - prevWeek,
      phaseLabel: phaseLabelForGestationalWeek(week),
      isWithinStandardVisitCount: index <= visitCount,
    });

    prevWeek = week;
    week += intervalWeeksForGestationalWeek(week);
    index += 1;
  }

  return visits;
}

export type VisitStatus = "past" | "today" | "upcoming";

/** 基準日からみて、その受診日が過去・今日・今後のいずれかを返す（表示用） */
export function visitStatus(visit: NinshinKenshinVisit, baseDate: string): VisitStatus {
  const diff = diffInDays(visit.date, baseDate);
  if (diff < 0) return "past";
  if (diff === 0) return "today";
  return "upcoming";
}

export interface NinshinKenshinInput {
  /** 出産予定日（YYYY-MM-DD）。未入力で lmp があれば lmp から逆算する */
  dueDate?: string;
  /** 最終月経開始日（YYYY-MM-DD）。任意入力 */
  lmp?: string;
}

export interface ResolvedDates {
  lmp: string;
  dueDate: string;
  /**
   * 出産予定日とLMPの両方が入力されている場合の「入力LMP − (出産予定日から逆算したLMP)」の日数差。
   * 出産予定日を優先して計算するため、これは注意喚起の表示にのみ使う。両方入力されていなければ null
   */
  lmpDueDateMismatchDays: number | null;
}

/**
 * 出産予定日・最終月経開始日の入力から、計算に使う実効LMP・出産予定日を決定する。
 * 出産予定日が入力されていれば常にそれを優先し、LMP' = dueDate − 280日 を逆算して使う
 * （医師の診察・超音波検査で確定した出産予定日を、自己申告のLMPより優先する一般的な考え方に基づく）。
 * 出産予定日が未入力で最終月経開始日のみ入力されている場合は、dueDate = lmp + 280日で概算する。
 */
export function resolveDates(input: NinshinKenshinInput): ResolvedDates | null {
  const hasDue = !!input.dueDate && isValidDateString(input.dueDate);
  const hasLmp = !!input.lmp && isValidDateString(input.lmp);

  if (hasDue) {
    const dueDate = input.dueDate as string;
    const lmp = addDays(dueDate, -GESTATION_DAYS);
    const lmpDueDateMismatchDays = hasLmp ? diffInDays(input.lmp as string, lmp) : null;
    return { lmp, dueDate, lmpDueDateMismatchDays };
  }

  if (hasLmp) {
    const lmp = input.lmp as string;
    const dueDate = addDays(lmp, GESTATION_DAYS);
    return { lmp, dueDate, lmpDueDateMismatchDays: null };
  }

  return null;
}

/** 基準日から見て、出産予定日として妥当とみなす範囲（日数）。誤入力対策のゆるいガード */
const DUE_DATE_MIN_DAYS_BEFORE_BASE = -70;
const DUE_DATE_MAX_DAYS_AFTER_BASE = 320;

/** 入力バリデーション。問題なければ null、エラーならメッセージを返す */
export function validateNinshinKenshinInput(
  input: NinshinKenshinInput,
  baseDate: string,
): string | null {
  if (input.dueDate && !isValidDateString(input.dueDate)) {
    return "出産予定日を正しい日付で入力してください";
  }
  if (input.lmp && !isValidDateString(input.lmp)) {
    return "最終月経開始日を正しい日付で入力してください";
  }

  const resolved = resolveDates(input);
  if (!resolved) {
    return "出産予定日（または最終月経開始日）を入力してください";
  }

  const daysFromBaseToDue = diffInDays(resolved.dueDate, baseDate);
  if (daysFromBaseToDue < DUE_DATE_MIN_DAYS_BEFORE_BASE) {
    return "出産予定日が基準日より70日以上前です。入力内容をご確認ください";
  }
  if (daysFromBaseToDue > DUE_DATE_MAX_DAYS_AFTER_BASE) {
    return "出産予定日が基準日より320日以上先です。入力内容をご確認ください";
  }

  return null;
}

export interface NinshinKenshinResult {
  lmp: string;
  dueDate: string;
  visits: NinshinKenshinVisit[];
  standardVisitCount: number;
  lmpDueDateMismatchDays: number | null;
  /** 産後2週間の産婦健診の目安日（参考） */
  sanpuFirstCheckupDate: string;
  /** 産後1か月の産婦健診の目安日（参考） */
  sanpuSecondCheckupDate: string;
}

export type NinshinKenshinCalcResult =
  | { ok: true; result: NinshinKenshinResult }
  | { ok: false; message: string };

/**
 * 妊婦健診スケジュール計算のオーケストレーター。
 * バリデーション → 実効LMP・出産予定日の決定 → 受診スケジュール生成 → 産後健診の目安日付加、の順に行う。
 */
export function calcNinshinKenshinSchedule(
  input: NinshinKenshinInput,
  baseDate: string,
): NinshinKenshinCalcResult {
  const message = validateNinshinKenshinInput(input, baseDate);
  if (message) {
    return { ok: false, message };
  }

  const resolved = resolveDates(input);
  if (!resolved) {
    return { ok: false, message: "出産予定日（または最終月経開始日）を入力してください" };
  }

  const { lmp, dueDate, lmpDueDateMismatchDays } = resolved;
  const visits = generateSchedule(lmp, dueDate, standardVisitCount);

  // 産婦健康診査（産後）の目安: 「産後2週間」＝出産予定日+14日、「産後1か月」＝出産予定日+1暦月
  // （data/seido/sanpu-kenshin-jyosei.json の eligibility.firstCheckupTiming / secondCheckupTiming の目安時期を
  //   出産予定日を起点にした日付に変換したもの。実際の出産日が変われば目安日もずれる）
  const sanpuFirstCheckupDate = addDays(dueDate, 14);
  const sanpuSecondCheckupDate = addCalendarMonths(dueDate, 1);

  return {
    ok: true,
    result: {
      lmp,
      dueDate,
      visits,
      standardVisitCount,
      lmpDueDateMismatchDays,
      sanpuFirstCheckupDate,
      sanpuSecondCheckupDate,
    },
  };
}
