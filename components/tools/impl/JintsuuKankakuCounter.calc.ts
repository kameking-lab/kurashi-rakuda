/**
 * 陣痛間隔カウンター（P2-T17）— 純粋なロジック・localStorage永続化用の関数群。
 * 仕様: specs/b-tools/p2-t17-jintsuu-kankaku-counter.md
 *
 * すべてUIから独立したテスト可能な純関数として提供する。
 * ネットワーク通信は一切発生しない（window.fetch等を参照しない）。
 * 実際の localStorage.getItem/setItem 呼び出しは UI 層（JintsuuKankakuCounter.tsx）の責務とし、
 * このファイルはシリアライズ／デシリアライズと記録配列の変換ロジックのみを扱う。
 */

/** localStorage に保存するキー。バージョン番号を含め、将来のスキーマ変更に備える */
export const STORAGE_KEY = "rakuda:jintsuu-kankaku-counter:v1";

/** 直近何件を平均計算の対象にするか（デフォルト） */
export const DEFAULT_AVERAGE_SAMPLE_SIZE = 5;

/** 陣痛1回分の記録。startedAt/endedAt は epoch ミリ秒（UTC基準の絶対時刻なので日をまたいでも自然に扱える） */
export interface ContractionRecord {
  id: string;
  startedAt: number;
  /** 陣痛が終わっていない（進行中）場合は null */
  endedAt: number | null;
}

/** 表示用に間隔・持続時間を計算済みの行 */
export interface ContractionRow extends ContractionRecord {
  /** 持続時間（秒）。進行中、または時計のズレでendedAt<startedAtの不正値の場合は null */
  durationSec: number | null;
  /** 前回の開始時刻からの間隔（秒）。先頭の記録、または不正値の場合は null */
  intervalSec: number | null;
}

export interface AverageResult {
  avgIntervalSec: number | null;
  avgDurationSec: number | null;
  /** 平均計算に使えたサンプル数（間隔） */
  intervalSampleSize: number;
  /** 平均計算に使えたサンプル数（持続時間） */
  durationSampleSize: number;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 生のオブジェクトを ContractionRecord として妥当か検証する（localStorageの壊れたデータ対策） */
function isValidRecord(v: unknown): v is ContractionRecord {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id.length === 0) return false;
  if (!isFiniteNumber(r.startedAt)) return false;
  if (r.endedAt !== null && !isFiniteNumber(r.endedAt)) return false;
  return true;
}

/**
 * "YYYY-MM-DDTHH:mm:ss.sssZ" 相当の内部表現(JSON文字列)を記録配列へ復元する。
 * 壊れたJSON・想定外の型が混じっている場合は、その要素だけを除外し例外は投げない
 * （陣痛中にストレージが壊れていても記録全体が消えないようにするため）。
 */
export function parseRecords(raw: string | null | undefined): ContractionRecord[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(isValidRecord).map((r) => ({
    id: r.id,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
  }));
}

/** 記録配列をlocalStorage保存用の文字列にシリアライズする */
export function serializeRecords(records: ContractionRecord[]): string {
  return JSON.stringify(records);
}

/** 開始時刻の昇順（古い→新しい）にソートしたコピーを返す */
export function sortByStartedAt(records: ContractionRecord[]): ContractionRecord[] {
  return [...records].sort((a, b) => a.startedAt - b.startedAt);
}

/** 「陣痛が終わっていない」記録（endedAt === null）のうち最新のものを返す。なければ null */
export function getOngoingRecord(records: ContractionRecord[]): ContractionRecord | null {
  const ongoing = records.filter((r) => r.endedAt === null);
  if (ongoing.length === 0) return null;
  return ongoing.reduce((latest, r) => (r.startedAt > latest.startedAt ? r : latest));
}

export function hasOngoing(records: ContractionRecord[]): boolean {
  return getOngoingRecord(records) !== null;
}

/**
 * 「陣痛が始まった」操作。進行中の記録が既にある場合は誤操作防止のため何もしない
 * （UI側は開始ボタンを進行中は無効化する想定だが、防御的にここでもガードする）。
 */
export function startContraction(
  records: ContractionRecord[],
  startedAt: number,
  id: string = `c${startedAt}`,
): ContractionRecord[] {
  if (hasOngoing(records)) return records;
  return [...records, { id, startedAt, endedAt: null }];
}

/**
 * 「陣痛が終わった」操作。進行中の記録がなければ何もしない。
 * endedAt が startedAt より前（端末の時計のズレ等）でもそのまま記録する。
 * 不正な区間として扱うかどうかは calcDurationSec 側の責務とする（ここでは記録の欠落を避ける）。
 */
export function endContraction(records: ContractionRecord[], endedAt: number): ContractionRecord[] {
  const ongoing = getOngoingRecord(records);
  if (!ongoing) return records;
  return records.map((r) => (r.id === ongoing.id ? { ...r, endedAt } : r));
}

/** 全記録を削除する（リセット） */
export function resetRecords(): ContractionRecord[] {
  return [];
}

/** 1件の持続時間（秒）。進行中(null)、またはendedAt<startedAtの不正値は null を返す */
export function calcDuration(record: ContractionRecord): number | null {
  if (record.endedAt === null) return null;
  const diffMs = record.endedAt - record.startedAt;
  if (diffMs < 0) return null;
  return Math.round(diffMs / 1000);
}

/**
 * 前回の開始時刻から今回の開始時刻までの間隔（秒）。
 * previous が null（先頭の記録）、または現在の開始時刻が前回より前（時計のズレ等）の場合は null。
 */
export function calcInterval(
  current: ContractionRecord,
  previous: ContractionRecord | null,
): number | null {
  if (!previous) return null;
  const diffMs = current.startedAt - previous.startedAt;
  if (diffMs < 0) return null;
  return Math.round(diffMs / 1000);
}

/**
 * 記録配列（順不同でよい）から、開始時刻の古い順に「間隔・持続時間」を計算した行を返す。
 * 表示（新しい順）への並べ替えはUI側の責務とする。
 */
export function buildRows(records: ContractionRecord[]): ContractionRow[] {
  const sorted = sortByStartedAt(records);
  return sorted.map((record, i) => ({
    ...record,
    durationSec: calcDuration(record),
    intervalSec: calcInterval(record, i === 0 ? null : sorted[i - 1]),
  }));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}

/** 直近 n 件（有効な値のみ）の平均間隔・平均持続時間を計算する */
export function calcAverages(
  records: ContractionRecord[],
  n: number = DEFAULT_AVERAGE_SAMPLE_SIZE,
): AverageResult {
  const rows = buildRows(records);
  const intervals = rows
    .map((r) => r.intervalSec)
    .filter((v): v is number => v !== null)
    .slice(-n);
  const durations = rows
    .map((r) => r.durationSec)
    .filter((v): v is number => v !== null)
    .slice(-n);
  return {
    avgIntervalSec: average(intervals),
    avgDurationSec: average(durations),
    intervalSampleSize: intervals.length,
    durationSampleSize: durations.length,
  };
}

/** 秒数を「◯分◯秒」形式の文字列にする。null は "—"（未確定・不正値）を返す */
export function formatSecondsLabel(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}
