/**
 * 暦日演算の共通土台（診断 A-12: SimpleDate 系の15重実装を統合）。
 *
 * ★SimpleDate 方式（{year, month, day} の素の暦日）★
 * グレゴリオ暦上の「日付そのもの」を扱う純関数群。タイムゾーンに依存しないよう内部計算は UTC で行う
 * （Date.UTC / getUTC*）。月齢・保育スケジュール・離乳食・予防接種・有給付与などの日付ツールが共有する。
 *
 * ここが唯一の定義元。各ツールの *.calc.ts はこのモジュールを import / 再エクスポートするだけにする
 * （うるう年・月末クランプ等のバグ修正を1箇所で完結させる）。
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

/** SimpleDate を UTC のエポック日数（1970-01-01 からの日数）へ */
export function toEpochDay(d: SimpleDate): number {
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
 * 応当日が存在しない月（例: 1/31 生まれの2月）はその月の末日にクランプする。
 */
export function addMonths(date: SimpleDate, n: number): SimpleDate {
  const idx = date.year * 12 + (date.month - 1) + n;
  const y = Math.floor(idx / 12);
  const m = (((idx % 12) + 12) % 12) + 1;
  const d = Math.min(date.day, daysInMonth(y, m));
  return { year: y, month: m, day: d };
}
