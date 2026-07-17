/**
 * 保活スケジュールメーカー（Q3-11）— 純粋な日付逆算ロジック。
 * 仕様: specs/b-tools/23-hokatsu-schedule-maker.md
 *
 * 入園希望年月（target_month）を起点に、月単位のオフセットでマイルストーンを逆算する。
 * すべて実在の暦（グレゴリオ暦）上の日付演算。UIから独立したテスト可能な純関数として提供する。
 *
 * 重要: 締切日・選考基準は自治体ごとに異なり、法定の全国統一スケジュールは存在しない。
 * ここで算出する日付はすべて「全国の傾向から作成した目安」であり、断定表現を避ける。
 */

export interface SimpleDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const DAYS_31 = new Set([1, 3, 5, 7, 8, 10, 12]);
const DAYS_30 = new Set([4, 6, 9, 11]);

/** うるう年判定（4で割り切れる年。ただし100で割り切れる年は除く。ただし400で割り切れる年は含む） */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 指定した年月の日数 */
export function daysInMonth(year: number, month: number): number {
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

/** "YYYY-MM" 形式の年月文字列をパースし、その月の1日を返す。不正な形式は null */
export function parseYearMonth(value: string): SimpleDate | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month, day: 1 };
}

function toEpochDay(d: SimpleDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

/** b − a の日数（暦日の単純差） */
export function diffDays(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

/** a と b の前後比較。a<b なら負、等しければ0、a>b なら正 */
export function compareDates(a: SimpleDate, b: SimpleDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

/** date の n 日後の日付 */
export function addDays(date: SimpleDate, n: number): SimpleDate {
  const d = new Date((toEpochDay(date) + n) * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * date から n か月後の日付（応当日方式・月末クランプ）。
 * 応当日が存在しない月（例: 1/31 の1か月後の2月）はその月の末日にクランプする。
 * n は負数可（過去方向へのオフセット）。
 */
export function addMonths(date: SimpleDate, n: number): SimpleDate {
  const idx = date.year * 12 + (date.month - 1) + n;
  const y = Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12 + 1;
  const d = Math.min(date.day, daysInMonth(y, m));
  return { year: y, month: m, day: d };
}

/** 指定した年月の d 日目に日付を差し替える（月末超過は末日にクランプ） */
export function withDay(date: SimpleDate, day: number): SimpleDate {
  return { year: date.year, month: date.month, day: Math.min(day, daysInMonth(date.year, date.month)) };
}

/** "YYYY-MM" 形式に整形する */
export function toYearMonth(d: SimpleDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}

export type EntryType = "april" | "midyear";
export type FacilityType = "ninka" | "other";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * target_month のバリデーション。
 * 本日（today）が属する月から起算して +1ヶ月〜+18ヶ月の範囲であること。
 */
export function validateTargetMonth(targetMonth: SimpleDate, today: SimpleDate): ValidationResult {
  const monthDiff = (targetMonth.year - today.year) * 12 + (targetMonth.month - today.month);
  if (monthDiff < 1 || monthDiff > 18) {
    return { ok: false, error: "入園希望月は1〜18ヶ月先の範囲で指定してください" };
  }
  return { ok: true };
}

/**
 * municipality_deadline のバリデーション。
 * 入力されている場合、target_month（の1日）より前の日付であること。
 */
export function validateMunicipalityDeadline(
  deadline: SimpleDate,
  targetMonth: SimpleDate,
): ValidationResult {
  if (compareDates(deadline, targetMonth) >= 0) {
    return { ok: false, error: "締切日は入園希望月より前の日付にしてください" };
  }
  return { ok: true };
}

/** target_month が4月かどうかに応じて entry_type の初期値を提案する */
export function suggestEntryType(targetMonth: SimpleDate): EntryType {
  return targetMonth.month === 4 ? "april" : "midyear";
}

export type MilestoneStatus = "past" | "upcoming";

export interface Milestone {
  key: string;
  name: string;
  /** 目安時期の開始日（範囲がない場合は end と同じ） */
  start: SimpleDate;
  /** 目安時期の終了日（範囲表記がある場合のみ start と異なる） */
  end: SimpleDate;
  description: string;
  status: MilestoneStatus;
}

export interface ScheduleInput {
  targetMonth: SimpleDate; // 入園希望年月の1日
  entryType: EntryType;
  municipalityDeadline?: SimpleDate | null;
  today: SimpleDate;
}

export interface ScheduleResult {
  milestones: Milestone[];
  /** 直近アラート: 一次締切等の標準的な時期を過ぎている可能性が高い場合に表示 */
  urgentAlert: boolean;
}

function withStatus(m: Omit<Milestone, "status">, today: SimpleDate): Milestone {
  return { ...m, status: compareDates(m.end, today) < 0 ? "past" : "upcoming" };
}

/**
 * 入園希望月・申込み区分・（任意の）自治体締切日から、保活マイルストーンを逆算する。
 * 仕様書の疑似コード（specs/b-tools/23-hokatsu-schedule-maker.md ロジック仕様）に準拠。
 */
export function generateSchedule(input: ScheduleInput): ScheduleResult {
  const { targetMonth: E, entryType, municipalityDeadline, today } = input;

  const milestones: Milestone[] =
    entryType === "april"
      ? generateAprilSchedule(E, municipalityDeadline ?? null, today)
      : generateMidyearSchedule(E, today);

  // E_date − today を「月数」として扱う（暦月ベースの概算値。仕様書の「残り月数が3ヶ月未満」判定用）
  //
  // 仕様書の疑似コードは "entry_type == april and 残り<3ヶ月" とだけ書かれているが、
  // テストケース#5（随時入園・入園希望月が実行月の翌月）でも同じ警告表示が期待されている。
  // 残り期間が短い場合に自治体へ直接確認を促す警告は、申込み区分によらず有用なため、
  // ここでは entry_type を問わず「残り3ヶ月未満」を条件とする（申込み区分の限定は行わない）。
  const remainingMonths = monthDiffFloat(today, E);
  const urgentAlert = remainingMonths < 3;

  return { milestones, urgentAlert };
}

/** today から E までの月数（端数含む概算値。3ヶ月未満判定に使う） */
function monthDiffFloat(today: SimpleDate, E: SimpleDate): number {
  const wholeMonths = (E.year - today.year) * 12 + (E.month - today.month);
  const dayFraction = (E.day - today.day) / daysInMonth(today.year, today.month);
  return wholeMonths + dayFraction;
}

function generateAprilSchedule(
  E: SimpleDate,
  municipalityDeadline: SimpleDate | null,
  today: SimpleDate,
): Milestone[] {
  const dPrimary = municipalityDeadline ?? withDay(addMonths(E, -6), 25);

  const raw: Omit<Milestone, "status">[] = [
    {
      key: "info",
      name: "情報収集・希望園リストアップ開始",
      start: addMonths(E, -12),
      end: addMonths(E, -12),
      description: "希望する保育園・認定こども園の候補をリストアップし、情報収集を始めましょう。",
    },
    {
      key: "tour",
      name: "保育園見学",
      start: addMonths(E, -10),
      end: addMonths(E, -7),
      description: "気になる園に見学の申し込みをし、実際に見学しましょう。",
    },
    {
      key: "docs",
      name: "申込書類の準備開始（就労証明書等）",
      start: addMonths(dPrimary, -1),
      end: addMonths(dPrimary, -1),
      description: "就労証明書など、申込みに必要な書類の準備・取得依頼を始めましょう。",
    },
    {
      key: "primary-deadline",
      name: "一次申込み締切",
      start: dPrimary,
      end: dPrimary,
      description: "自治体が定める一次申込みの締切日（目安）です。",
    },
    {
      key: "primary-result",
      name: "一次選考結果通知",
      start: capDate(withDay(addMonths(dPrimary, 2), 20), addMonths(E, -3)),
      end: capDate(withDay(addMonths(dPrimary, 2), 20), addMonths(E, -3)),
      description: "一次選考（利用調整）の結果が通知される目安の時期です。",
    },
    {
      key: "secondary-deadline",
      name: "（落選時）二次申込み締切",
      start: withDay(addMonths(E, -3), 15),
      end: withDay(addMonths(E, -3), 15),
      description: "一次で内定が出なかった場合の二次申込みの締切目安です（実施の有無は自治体により異なります）。",
    },
    {
      key: "secondary-result",
      name: "（落選時）二次選考結果通知",
      start: withDay(addMonths(E, -2), 15),
      end: withDay(addMonths(E, -2), 15),
      description: "二次選考の結果が通知される目安の時期です。",
    },
    {
      key: "prep",
      name: "入園前健診・面談・書類提出",
      start: addMonths(E, -1),
      end: withDay(addMonths(E, -1), daysInMonth(addMonths(E, -1).year, addMonths(E, -1).month)),
      description: "内定後、入園前の健康診断・面談・必要書類の提出を行います。",
    },
    {
      key: "entry",
      name: "入園",
      start: E,
      end: E,
      description: "入園希望月です。",
    },
  ];

  return raw.map((m) => withStatus(m, today));
}

/**
 * 一次選考結果通知の上限（E-3ヶ月）を超えないようにする。
 * 「一次締切+2ヶ月」が「E-3ヶ月」より後になる場合は E-3ヶ月 に丸める。
 */
function capDate(date: SimpleDate, limit: SimpleDate): SimpleDate {
  return compareDates(date, limit) > 0 ? limit : date;
}

function generateMidyearSchedule(E: SimpleDate, today: SimpleDate): Milestone[] {
  const raw: Omit<Milestone, "status">[] = [
    {
      key: "info",
      name: "情報収集・希望園リストアップ開始",
      start: addMonths(E, -3),
      end: addMonths(E, -3),
      description: "希望する保育園・認定こども園の候補をリストアップし、情報収集を始めましょう。",
    },
    {
      key: "tour",
      name: "保育園見学",
      start: addMonths(E, -2),
      end: addMonths(E, -2),
      description: "気になる園に見学の申し込みをし、実際に見学しましょう。",
    },
    {
      key: "docs",
      name: "空き状況の自治体窓口への確認・申込書類準備",
      start: withDay(addMonths(E, -2), 15),
      end: withDay(addMonths(E, -2), 15),
      description: "自治体の保育課窓口で空き状況を確認し、申込書類の準備を始めましょう。",
    },
    {
      key: "deadline",
      name: "申込み締切（目安）",
      start: withDay(addMonths(E, -1), 10),
      end: withDay(addMonths(E, -1), 10),
      description: "随時（年度途中）入園の申込み締切の目安です。",
    },
    {
      key: "result",
      name: "選考結果通知（目安）",
      start: withDay(addMonths(E, -1), 25),
      end: withDay(addMonths(E, -1), 25),
      description: "選考（利用調整）結果が通知される目安の時期です。",
    },
    {
      key: "prep",
      name: "入園前健診・面談",
      start: addDays(E, -14),
      end: addDays(E, -14),
      description: "内定後、入園前の健康診断・面談を行います。",
    },
    {
      key: "entry",
      name: "入園",
      start: E,
      end: E,
      description: "入園希望月です。",
    },
  ];

  return raw.map((m) => withStatus(m, today));
}

/** 1〜3月入園希望（随時入園）の場合、年度切り替え運用の注記が必要かどうか */
export function needsFiscalYearBoundaryNote(targetMonth: SimpleDate, entryType: EntryType): boolean {
  return entryType === "midyear" && targetMonth.month >= 1 && targetMonth.month <= 3;
}

export const HOKATSU_DISCLAIMER =
  "このスケジュールは全国の傾向をもとに算出した目安であり、入園の可否・選考結果を保証するものではありません。締切日・必要書類・選考基準は市区町村ごとに異なります。必ずお住まいの自治体の保育担当窓口・公式サイトで最新情報をご確認ください。";
