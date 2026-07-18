/**
 * 有給残・取得計画（P3-T02）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p3-t02-yuukyuu-fuyo-nissuu-kijun.md
 *
 * すべての制度事実は data/seido/yuukyuu-fuyo-nissuu-kijun.json（労働基準法第39条・
 * 同法施行規則第24条の3）から読む。ここに日数・比率等の数値を書かない
 * （例外は、日付の暦演算に必要な12か月周期などの算術上の定数のみ）。
 *
 * ★このファイルが行う日付ロジック★
 *   雇入れの日から「6か月・1年6か月・2年6か月・3年6か月・4年6か月・5年6か月・6年6か月以上」の
 *   7つの基準日を、施行規則が定める継続勤務年数の区分（serviceMonths）から機械的に算出する。
 *   6年6か月以降は毎年（12か月ごと）に同じ区分（付与日数の頭打ち20日等）が繰り返されるため、
 *   基準日を7個より先まで無限に列挙するのではなく、6年6か月の基準日から12か月刻みで
 *   何回分経過したか（extraYearsBeyondCap）を数える方式で表現する。
 *
 * ★このファイルが行わないこと★
 *   実際に何日取得済み・何日残っているかの追跡（利用実績の入力を受け取らない）。
 *   本ツールは「制度上、いつ・何日付与されるか」という取得計画の提示にとどめ、
 *   架空の「残日数」を捏造しない。
 */
import yuukyuuFuyoNissuuKijun from "@/data/seido/yuukyuu-fuyo-nissuu-kijun.json";
import { isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const yuukyuuFuyoDataset = yuukyuuFuyoNissuuKijun as unknown as SeidoDataset;
export const YUUKYUU_FUYO_DISCLAIMER = yuukyuuFuyoNissuuKijun.disclaimer;

const D = yuukyuuFuyoNissuuKijun.data;

// ---------------------------------------------------------------- 制度上の事実（データ取得のみ）

/** 発生要件①: 雇入れの日から起算した継続勤務期間（月）。6 */
export const ELIGIBLE_CONTINUOUS_SERVICE_MONTHS = D.eligibility.continuousServiceMonths.value;
/** 発生要件②: 全労働日に対する出勤率。0.8（8割） */
export const ELIGIBLE_ATTENDANCE_RATE = D.eligibility.attendanceRate.value;
export const ELIGIBLE_ATTENDANCE_RATE_NOTE = D.eligibility.attendanceRate.note;
/** 最初に付与される日数（6か月経過時・通常の労働者）。10 */
export const FIRST_GRANT_DAYS = D.eligibility.firstGrantDays.value;
export const DEEMED_ATTENDANCE_NOTE = D.eligibility.deemedAttendanceDays.note;

/** 通常の労働者の付与日数表（継続勤務年数の7区分） */
export const STANDARD_GRANT_ROWS = D.standardGrantTable.rows;
/** 1年あたりの法定付与日数の上限（6年6か月以上）。20 */
export const MAX_GRANT_DAYS = D.standardGrantTable.maxGrantDays.value;

/** 比例付与の対象条件（週所定労働時間30時間未満、かつ週所定労働日数4日以下 or 年216日以下） */
export const PROPORTIONAL_ELIGIBLE_CONDITION = D.proportionalGrant.eligibleCondition.value;
/** 比例付与の対象となる週所定労働時間の上限（これ以上は通常の労働者扱い）。30 */
export const WEEKLY_HOURS_THRESHOLD = D.proportionalGrant.weeklyHoursThreshold.value;
/** 比例付与の対象となる週所定労働日数の上限。4 */
export const WEEKLY_WORK_DAYS_THRESHOLD = D.proportionalGrant.weeklyWorkDaysThreshold.value;
/** 比例付与日数の表（週所定労働日数4/3/2/1日 × 継続勤務期間7区分） */
export const PROPORTIONAL_TABLE = D.proportionalGrant.table;

/** 年5日の時季指定義務の対象となる付与日数の下限。10 */
export const MANDATORY_5DAYS_THRESHOLD = D.mandatory5Days.thresholdDays.value;
/** 時季指定で取得させなければならない日数。5 */
export const MANDATORY_5DAYS_REQUIRED_DAYS = D.mandatory5Days.requiredDays.value;
export const MANDATORY_5DAYS_PERIOD_NOTE = D.mandatory5Days.period.note;
export const MANDATORY_5DAYS_DEDUCTIBLE_METHODS = D.mandatory5Days.deductibleMethods.value;

/** 繰越しの請求権の時効（年）。2 */
export const PRESCRIPTION_YEARS = D.grantRules.prescriptionYears.value;
export const PRESCRIPTION_NOTE = D.grantRules.prescriptionYears.note;
export const TIME_DESIGNATION_RIGHT_NOTE = D.grantRules.timeDesignationRight.value;

// ---------------------------------------------------------------- 日付ユーティリティ

export interface SimpleDate {
  y: number;
  m: number; // 1-12
  d: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" をパースする。不正な形式・実在しない暦日は null */
export function parseDate(value: string): SimpleDate | null {
  const mt = DATE_RE.exec(value);
  if (!mt) return null;
  const y = Number(mt[1]);
  const m = Number(mt[2]);
  const d = Number(mt[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

function toEpochDay(date: SimpleDate): number {
  return Math.round(Date.UTC(date.y, date.m - 1, date.d) / 86_400_000);
}

/** a と b の前後比較。a<b なら負、等しければ0、a>b なら正 */
export function compareDates(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

/** a と b の暦日差（b − a） */
export function diffDays(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * date から n か月後の日付（応当日方式・月末クランプ）。
 * 応当日が存在しない月（例: 1/31の6か月後である7/31は存在するが、8/31の6か月後の2/31等は存在しない）は
 * その月の末日にクランプする。
 */
export function addMonths(date: SimpleDate, n: number): SimpleDate {
  const idx = date.y * 12 + (date.m - 1) + n;
  const y = Math.floor(idx / 12);
  const m = (((idx % 12) + 12) % 12) + 1;
  const d = Math.min(date.d, lastDayOfMonth(y, m));
  return { y, m, d };
}

export function fmtDate(date: SimpleDate): string {
  return `${date.y}年${date.m}月${date.d}日`;
}

// ---------------------------------------------------------------- 勤務形態

export type EmploymentType = "standard" | "days4" | "days3" | "days2" | "days1";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  standard: "フルタイム相当（週の所定労働時間30時間以上、または週の所定労働日数5日以上）",
  days4: "週4日勤務（週の所定労働時間30時間未満）",
  days3: "週3日勤務（週の所定労働時間30時間未満）",
  days2: "週2日勤務（週の所定労働時間30時間未満）",
  days1: "週1日勤務（週の所定労働時間30時間未満）",
};

const EMPLOYMENT_TYPE_TO_WEEKLY_DAYS: Record<Exclude<EmploymentType, "standard">, number> = {
  days4: 4,
  days3: 3,
  days2: 2,
  days1: 1,
};

function isValidEmploymentType(value: string): value is EmploymentType {
  return value in EMPLOYMENT_TYPE_LABELS;
}

function proportionalRowFor(type: Exclude<EmploymentType, "standard">) {
  const weeklyDays = EMPLOYMENT_TYPE_TO_WEEKLY_DAYS[type];
  const row = PROPORTIONAL_TABLE.rows.find((r) => r.weeklyWorkDays === weeklyDays);
  if (!row) throw new Error(`比例付与の表に週所定労働日数${weeklyDays}日の行が見つかりません`);
  return row;
}

// ---------------------------------------------------------------- 付与日数・義務対象の判定（区分ごと）

/** rowIndex（0〜6。STANDARD_GRANT_ROWS / PROPORTIONAL_TABLE.serviceLabels の位置）に対応する付与日数 */
export function grantDaysForRow(employmentType: EmploymentType, rowIndex: number): number {
  if (employmentType === "standard") return STANDARD_GRANT_ROWS[rowIndex]!.grantDays;
  return proportionalRowFor(employmentType).grantDays[rowIndex]!;
}

/** rowIndex が年5日の時季指定義務の対象になるか */
export function isSubjectToMandatory5Days(employmentType: EmploymentType, rowIndex: number): boolean {
  if (employmentType === "standard") return STANDARD_GRANT_ROWS[rowIndex]!.subjectToMandatory5Days;
  const row = proportionalRowFor(employmentType);
  const fromLabel = row.subjectToMandatory5DaysFrom;
  if (fromLabel === null) return false;
  const fromIndex = PROPORTIONAL_TABLE.serviceLabels.indexOf(fromLabel);
  return fromIndex >= 0 && rowIndex >= fromIndex;
}

// ---------------------------------------------------------------- 基準日スケジュール

export interface ScheduleRow {
  index: number;
  serviceLabel: string;
  basisDate: SimpleDate;
  grantDays: number;
  subjectToMandatory5Days: boolean;
  /** 基準日time <= today か（達している区分か） */
  isReached: boolean;
}

/**
 * 雇入れ日から、7つの基準日（6か月〜6年6か月以上）を算出し、
 * その時点の付与日数・年5日義務の対象可否とあわせて返す（取得計画の一覧表）。
 */
export function buildSchedule(
  hireDate: SimpleDate,
  employmentType: EmploymentType,
  today: SimpleDate,
): ScheduleRow[] {
  return STANDARD_GRANT_ROWS.map((row, index) => {
    const basisDate = addMonths(hireDate, row.serviceMonths);
    return {
      index,
      serviceLabel: row.serviceLabel,
      basisDate,
      grantDays: grantDaysForRow(employmentType, index),
      subjectToMandatory5Days: isSubjectToMandatory5Days(employmentType, index),
      isReached: compareDates(basisDate, today) <= 0,
    };
  });
}

export interface MilestoneInfo {
  serviceLabel: string;
  basisDate: SimpleDate;
  grantDays: number;
  subjectToMandatory5Days: boolean;
  /** 6年6か月の基準日から数えて何年分先の（12か月ごとの）繰り返しか。0は6年6か月ちょうど */
  extraYearsBeyondCap: number;
}

export interface CurrentNextMilestones {
  /** 7区分のうち到達済みの数（0〜7） */
  reachedCount: number;
  /** 直近に到達した基準日（未到達なら null） */
  current: MilestoneInfo | null;
  /** 次に到来する基準日 */
  next: MilestoneInfo;
}

function toMilestoneInfo(row: ScheduleRow, extraYearsBeyondCap: number, basisDate: SimpleDate): MilestoneInfo {
  return {
    serviceLabel: row.serviceLabel,
    basisDate,
    grantDays: row.grantDays,
    subjectToMandatory5Days: row.subjectToMandatory5Days,
    extraYearsBeyondCap,
  };
}

/**
 * schedule（7区分）と today から、直近の基準日（current）と次の基準日（next）を求める。
 * 6年6か月（最後の区分）に到達した後は、以後12か月ごとに同じ区分（付与日数据え置き）が
 * 繰り返されるため、6年6か月の基準日から12か月刻みで何回分経過したかを数えて next を算出する。
 */
export function findCurrentAndNext(schedule: ScheduleRow[], today: SimpleDate): CurrentNextMilestones {
  let reachedIndex = -1;
  for (let i = 0; i < schedule.length; i += 1) {
    if (schedule[i]!.isReached) reachedIndex = i;
  }

  const lastIndex = schedule.length - 1; // 6（6年6か月以上）

  if (reachedIndex < lastIndex) {
    const current = reachedIndex >= 0 ? toMilestoneInfo(schedule[reachedIndex]!, 0, schedule[reachedIndex]!.basisDate) : null;
    const next = toMilestoneInfo(schedule[reachedIndex + 1]!, 0, schedule[reachedIndex + 1]!.basisDate);
    return { reachedCount: reachedIndex + 1, current, next };
  }

  // 6年6か月以降: 12か月ごとに繰り返す
  const capRow = schedule[lastIndex]!;
  let extra = 0;
  let d = capRow.basisDate;
  while (compareDates(addMonths(d, 12), today) <= 0) {
    d = addMonths(d, 12);
    extra += 1;
  }
  const current = toMilestoneInfo(capRow, extra, d);
  const next = toMilestoneInfo(capRow, extra + 1, addMonths(d, 12));
  return { reachedCount: schedule.length, current, next };
}

// ---------------------------------------------------------------- 入力バリデーション

const MIN_HIRE_DATE: SimpleDate = { y: 1950, m: 1, d: 1 };
const MAX_HIRE_DATE: SimpleDate = { y: 2100, m: 12, d: 31 };

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateHireDate(hireDate: SimpleDate): ValidationResult {
  if (compareDates(hireDate, MIN_HIRE_DATE) < 0 || compareDates(hireDate, MAX_HIRE_DATE) > 0) {
    return { ok: false, error: "雇い入れ日は1950年1月1日から2100年12月31日の範囲で入力してください。" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------- 総合計算

export interface YuukyuuFuyoResult {
  ok: true;
  expired: boolean;
  hireDate: SimpleDate;
  today: SimpleDate;
  employmentType: EmploymentType;
  isStandard: boolean;
  attendanceRateOk: boolean;
  /** 雇入れ後の基準日をまだ1つも迎えていない（発生要件①未達） */
  eligible: boolean;
  /** 発生要件①（6か月継続勤務）を満たすまでの残り日数（未達の場合のみ） */
  daysUntilFirstEligible: number | null;
  /** 7区分の取得計画スケジュール一覧 */
  schedule: ScheduleRow[];
  /** 直近に到達した基準日（未到達なら null） */
  current: MilestoneInfo | null;
  /** 出勤率8割未満により、直近の基準日の付与が行われない場合に true */
  currentGrantWithheld: boolean;
  /** 次に到来する基準日（出勤率8割以上を維持した場合の見込み） */
  next: MilestoneInfo;
  /** 雇い入れ日が基準日（today）より未来（入社前のプレビュー） */
  isFutureHire: boolean;
}

export type YuukyuuFuyoCalcResult = YuukyuuFuyoResult | { ok: false; error: string };

export function calcYuukyuuFuyoNissuu(
  hireDateStr: string,
  employmentTypeStr: string,
  attendanceRateOk: boolean,
  todayStr: string,
): YuukyuuFuyoCalcResult {
  const hireDate = parseDate(hireDateStr);
  if (!hireDate) {
    return { ok: false, error: "雇い入れ日を正しい日付（年月日）で入力してください。" };
  }
  const today = parseDate(todayStr);
  if (!today) {
    return { ok: false, error: "基準日が不正です。" };
  }
  const hireValidation = validateHireDate(hireDate);
  if (!hireValidation.ok) {
    return { ok: false, error: hireValidation.error! };
  }
  if (!isValidEmploymentType(employmentTypeStr)) {
    return { ok: false, error: "勤務形態を選択してください。" };
  }
  const employmentType = employmentTypeStr;

  const schedule = buildSchedule(hireDate, employmentType, today);
  const { reachedCount, current, next } = findCurrentAndNext(schedule, today);

  const eligible = reachedCount >= 1;
  const daysUntilFirstEligible = eligible ? null : diffDays(today, schedule[0]!.basisDate);
  const currentGrantWithheld = eligible && !attendanceRateOk;

  return {
    ok: true,
    expired: isDataExpired(yuukyuuFuyoDataset, todayStr),
    hireDate,
    today,
    employmentType,
    isStandard: employmentType === "standard",
    attendanceRateOk,
    eligible,
    daysUntilFirstEligible,
    schedule,
    current,
    currentGrantWithheld,
    next,
    isFutureHire: compareDates(hireDate, today) > 0,
  };
}
