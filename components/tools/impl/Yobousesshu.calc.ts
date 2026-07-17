/**
 * 予防接種スケジューラー（Q3-06）— 計算ロジック本体。
 * 仕様: specs/b-tools/18-vaccination-scheduler.md
 *
 * データは data/tables/yobousesshu.json を単一の情報源(SSOT)とする。
 * 対象年齢・回数・間隔はすべて同JSONを import して参照し、本ファイルにはハードコードしない。
 *
 * ★YMYL上の最重要制約★
 * このファイルは「予防接種法に基づく定期接種の、制度上の標準的なスケジュール」を
 * 生年月日から機械計算して表示するだけであり、以下は一切行わない（仕様書のYMYL配慮事項）。
 * - 受けるべきかどうか、受けても安全かどうかの医学的判断
 * - 体調不良時に受けてよいかの判断
 * - 実際に接種したかどうかの記録・管理（Phase 1では入力自体を受け付けない）
 * - キャッチアップ接種等、制度改定が起きやすい項目の断定的な終了日の表示
 */
import table from "@/data/tables/yobousesshu.json";

export const YOBOUSESSHU_DISCLAIMER = [
  "本ツールは予防接種法に基づく定期接種の標準的なスケジュール（制度上の目安）を、生年月日から自動計算して表示するものです。接種を受けるかどうか、受けられる体調かどうかについての医学的な判断は行っていません。",
  "実際の接種スケジュールは、お子さまの体調・体質・これまでの接種歴・使用ワクチンの種類などにより、医師が個別に判断します。母子健康手帳・医療機関から渡される予診票、お住まいの自治体の案内と本ツールの表示が異なる場合は、必ず母子健康手帳・自治体・医療機関の情報を優先してください。",
  "接種を受けるかどうか、当日の体調で接種できるかどうかについては、必ずかかりつけ医・接種医療機関にご相談ください。",
] as const;

export interface SimpleDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const DAYS_31 = new Set([1, 3, 5, 7, 8, 10, 12]);
const DAYS_30 = new Set([4, 6, 9, 11]);

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (DAYS_31.has(month)) return 31;
  if (DAYS_30.has(month)) return 30;
  return isLeapYear(year) ? 29 : 28;
}

/** "YYYY-MM-DD" 形式の文字列をパースする。不正な形式・実在しない日付は null */
export function parseDate(value: string): SimpleDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function toEpochDay(d: SimpleDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

/** a と b の前後比較。a<b なら負、等しければ0、a>b なら正 */
export function compareDates(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

function diffDays(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

/**
 * date から n か月後の日付（応当日方式・月末クランプ）。
 * 応当日が存在しない月（例: 1/31生まれの2月）はその月の末日にクランプする。
 * 「生後◯ヶ月に達した日（誕生日相当日）」の起点計算に使う。
 */
export function addMonths(date: SimpleDate, n: number): SimpleDate {
  const idx = date.year * 12 + (date.month - 1) + n;
  const y = Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12 + 1;
  const d = Math.min(date.day, daysInMonth(y, m));
  return { year: y, month: m, day: d };
}

function addYears(date: SimpleDate, n: number): SimpleDate {
  return addMonths(date, n * 12);
}

/** 満年齢（誕生日を迎えているかで判定。応当日当日は「迎えた」扱い） */
function fullAgeYears(birth: SimpleDate, base: SimpleDate): number {
  let age = base.year - birth.year;
  const beforeBirthday =
    base.month < birth.month || (base.month === birth.month && base.day < birth.day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * 生後月齢（仕様書のcalcAge式）。
 * age_months = (Y差)*12+(M差) − (today.day < birth.dayなら1)
 */
function ageMonthsFormula(birth: SimpleDate, base: SimpleDate): number {
  let months = (base.year - birth.year) * 12 + (base.month - birth.month);
  if (base.day < birth.day) months -= 1;
  return Math.max(0, months);
}

function formatMonthLabel(date: SimpleDate): string {
  return `${date.year}年${date.month}月頃`;
}

/** 「N歳に達する日以後の最初の3月31日」（年度末カットオフ、HPVの上限年齢に使用） */
function nendoMatsuCutoff(birth: SimpleDate, attainAge: number): SimpleDate {
  const attainDay = addYears(birth, attainAge);
  const year = attainDay.month >= 4 ? attainDay.year + 1 : attainDay.year;
  return { year, month: 3, day: 31 };
}

export type VaccineStatus = "before" | "within" | "ended" | "male-not-applicable";

export interface DoseEstimate {
  doseNumber: number;
  label: string;
}

export interface VaccineResult {
  id: string;
  name: string;
  disease: string;
  group: "infant" | "school";
  ageRangeLabel: string;
  standardTimingLabel: string;
  doseLabel: string;
  status: VaccineStatus;
  statusLabel: string;
  doseEstimates: DoseEstimate[];
  note: string | null;
  catchupNote: string | null;
  /** 一覧の自動ソート用（生年月日からの経過日数の目安） */
  sortKey: number;
}

export interface AgeSummary {
  years: number;
  months: number;
  totalMonths: number;
  label: string;
}

export interface YobousesshuOk {
  ok: true;
  ageSummary: AgeSummary;
  vaccines: VaccineResult[];
  disclaimer: readonly string[];
  basisYear: string;
}

export interface YobousesshuError {
  ok: false;
  error: string;
}

export type YobousesshuResult = YobousesshuOk | YobousesshuError;

export type Sex = "female" | "male" | "unspecified";

export interface YobousesshuInput {
  birthDate: string;
  sex: Sex;
  /** テスト・確認用の基準日。本番UIには表示しない */
  todayOverride?: string;
}

interface AgeVaccineRecord {
  id: string;
  name: string;
  disease: string;
  group: "infant" | "school";
  scheduleType: "age";
  ageRangeLabel: string;
  standardTimingLabel: string;
  startMonths: number;
  endMonths: number;
  doseCount: number;
  standardDoseMonths: number[];
  doseLabel: string;
  note: string | null;
}

interface GakunenVaccineRecord {
  id: string;
  name: string;
  disease: string;
  group: "infant" | "school";
  scheduleType: "gakunen-nencho";
  ageRangeLabel: string;
  standardTimingLabel: string;
  doseCount: number;
  doseLabel: string;
  note: string | null;
}

interface HpvVaccineRecord {
  id: string;
  name: string;
  disease: string;
  group: "infant" | "school";
  scheduleType: "hpv";
  ageRangeLabel: string;
  standardTimingLabel: string;
  sexRestriction: "female";
  startYears: number;
  endCutoffAge: number;
  doseLabel: string;
  note: string | null;
}

type VaccineRecord = AgeVaccineRecord | GakunenVaccineRecord | HpvVaccineRecord;

const VACCINES = table.vaccines as unknown as VaccineRecord[];

const STATUS_LABEL: Record<VaccineStatus, string> = {
  before: "対象期間前",
  within: "対象期間内",
  ended: "定期接種の標準的な対象期間を過ぎています",
  "male-not-applicable": "定期接種の対象は女性のみです",
};

function judgeAgeVaccine(v: AgeVaccineRecord, birth: SimpleDate, base: SimpleDate): VaccineResult {
  const start = addMonths(birth, v.startMonths);
  const end = addMonths(birth, v.endMonths);
  let status: VaccineStatus;
  if (compareDates(base, start) < 0) {
    status = "before";
  } else if (compareDates(base, end) >= 0) {
    status = "ended";
  } else {
    status = "within";
  }

  const doseEstimates: DoseEstimate[] = v.standardDoseMonths.map((m, i) => ({
    doseNumber: i + 1,
    label: formatMonthLabel(addMonths(birth, m)),
  }));

  return {
    id: v.id,
    name: v.name,
    disease: v.disease,
    group: v.group,
    ageRangeLabel: v.ageRangeLabel,
    standardTimingLabel: v.standardTimingLabel,
    doseLabel: v.doseLabel,
    status,
    statusLabel:
      status === "within" && compareDates(base, addMonths(birth, v.standardDoseMonths[v.standardDoseMonths.length - 1])) > 0
        ? `${STATUS_LABEL[status]}（標準的な接種完了目安時期を過ぎています。まだ完了していない回がある場合は医療機関にご相談ください）`
        : STATUS_LABEL[status],
    doseEstimates,
    note: v.note,
    catchupNote: null,
    sortKey: diffDays(birth, start),
  };
}

function judgeGakunenVaccine(
  v: GakunenVaccineRecord,
  birth: SimpleDate,
  base: SimpleDate,
): VaccineResult {
  // 満6歳に達する日が、その年の4/1以前かどうかで就学（＝年長修了）の年度を決める。
  const sixthBirthday = addYears(birth, 6);
  const enrollmentYear =
    sixthBirthday.month < 4 || (sixthBirthday.month === 4 && sixthBirthday.day <= 1)
      ? sixthBirthday.year
      : sixthBirthday.year + 1;
  const nenchoStart: SimpleDate = { year: enrollmentYear - 1, month: 4, day: 1 };
  const nenchoEnd: SimpleDate = { year: enrollmentYear, month: 3, day: 31 };

  let status: VaccineStatus;
  if (compareDates(base, nenchoStart) < 0) {
    status = "before";
  } else if (compareDates(base, nenchoEnd) > 0) {
    status = "ended";
  } else {
    status = "within";
  }

  return {
    id: v.id,
    name: v.name,
    disease: v.disease,
    group: v.group,
    ageRangeLabel: v.ageRangeLabel,
    standardTimingLabel: v.standardTimingLabel,
    doseLabel: v.doseLabel,
    status,
    statusLabel: STATUS_LABEL[status],
    doseEstimates: [
      {
        doseNumber: 1,
        label: `${nenchoStart.year}年度中（${nenchoStart.year}年4月〜${nenchoEnd.year}年3月）`,
      },
    ],
    note: v.note,
    catchupNote: null,
    sortKey: diffDays(birth, nenchoStart),
  };
}

function judgeHpvVaccine(
  v: HpvVaccineRecord,
  birth: SimpleDate,
  base: SimpleDate,
  sex: Sex,
): VaccineResult {
  const start = addYears(birth, v.startYears);
  const end = nendoMatsuCutoff(birth, v.endCutoffAge);

  if (sex === "male") {
    return {
      id: v.id,
      name: v.name,
      disease: v.disease,
      group: v.group,
      ageRangeLabel: v.ageRangeLabel,
      standardTimingLabel: v.standardTimingLabel,
      doseLabel: v.doseLabel,
      status: "male-not-applicable",
      statusLabel: `${STATUS_LABEL["male-not-applicable"]}（任意接種としての情報は医療機関にご確認ください）`,
      doseEstimates: [],
      note: v.note,
      catchupNote: null,
      sortKey: diffDays(birth, start),
    };
  }

  let status: VaccineStatus;
  if (compareDates(base, start) < 0) {
    status = "before";
  } else if (compareDates(base, end) > 0) {
    status = "ended";
  } else {
    status = "within";
  }

  const neutralSuffix = sex === "unspecified" ? "（対象年齢の方は表示可能です。女性の場合の目安です）" : "";
  const catchupNote =
    status === "ended"
      ? "対象年齢を超えている場合でも、キャッチアップ接種の対象になる可能性があります。対象者・実施期間はお住まいの自治体でご確認ください。"
      : null;

  return {
    id: v.id,
    name: v.name,
    disease: v.disease,
    group: v.group,
    ageRangeLabel: v.ageRangeLabel,
    standardTimingLabel: v.standardTimingLabel,
    doseLabel: v.doseLabel,
    status,
    statusLabel: `${STATUS_LABEL[status]}${neutralSuffix}`,
    doseEstimates:
      status === "within"
        ? [{ doseNumber: 1, label: "対象年齢の間に使用ワクチンにより2〜3回（標準的には中学1年相当から）" }]
        : [],
    note: v.note,
    catchupNote,
    sortKey: diffDays(birth, start),
  };
}

/**
 * 予防接種スケジュールの計算本体。
 * @param input 生年月日・性別・（テスト用の）基準日
 */
export function calculateYobousesshu(input: YobousesshuInput): YobousesshuResult {
  const birth = parseDate(input.birthDate);
  if (!birth) {
    return { ok: false, error: "生年月日をご確認ください（日付の形式が正しくありません）" };
  }

  const baseDateInput = input.todayOverride ?? new Date().toISOString().slice(0, 10);
  const base = parseDate(baseDateInput);
  if (!base) {
    return { ok: false, error: "基準日の形式が正しくありません" };
  }

  if (compareDates(birth, base) > 0) {
    return { ok: false, error: "生年月日をご確認ください（本日より後の日付になっています）" };
  }

  const ageYears = fullAgeYears(birth, base);
  if (ageYears >= 19) {
    return { ok: false, error: "本ツールが対象とする0〜18歳の範囲外です" };
  }

  const totalMonths = ageMonthsFormula(birth, base);
  const ageSummary: AgeSummary = {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
    label:
      totalMonths < 12
        ? `生後${totalMonths}ヶ月`
        : `${Math.floor(totalMonths / 12)}歳${totalMonths % 12}ヶ月`,
  };

  const vaccines: VaccineResult[] = VACCINES.map((v) => {
    if (v.scheduleType === "age") return judgeAgeVaccine(v, birth, base);
    if (v.scheduleType === "gakunen-nencho") return judgeGakunenVaccine(v, birth, base);
    return judgeHpvVaccine(v, birth, base, input.sex);
  });

  vaccines.sort((a, b) => a.sortKey - b.sortKey);

  return {
    ok: true,
    ageSummary,
    vaccines,
    disclaimer: YOBOUSESSHU_DISCLAIMER,
    basisYear: table.basisYear,
  };
}
