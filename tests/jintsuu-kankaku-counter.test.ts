import { describe, expect, it } from "vitest";
import {
  buildRows,
  calcAverages,
  calcDuration,
  calcInterval,
  endContraction,
  formatSecondsLabel,
  getOngoingRecord,
  hasOngoing,
  parseRecords,
  resetRecords,
  serializeRecords,
  sortByStartedAt,
  startContraction,
  STORAGE_KEY,
  type ContractionRecord,
} from "@/components/tools/impl/JintsuuKankakuCounter.calc";

/** 仕様書 specs/b-tools/p2-t17-jintsuu-kankaku-counter.md の「テストケース」を反映 */

function ts(iso: string): number {
  return new Date(iso).getTime();
}

function record(id: string, startedAtIso: string, endedAtIso: string | null): ContractionRecord {
  return {
    id,
    startedAt: ts(startedAtIso),
    endedAt: endedAtIso ? ts(endedAtIso) : null,
  };
}

describe("JintsuuKankakuCounter.calc — 仕様書テストケース表（15件）", () => {
  it("#1 記録なし → buildRowsは空配列、平均はnull・サンプル0", () => {
    expect(buildRows([])).toEqual([]);
    const avg = calcAverages([]);
    expect(avg.avgIntervalSec).toBeNull();
    expect(avg.avgDurationSec).toBeNull();
    expect(avg.intervalSampleSize).toBe(0);
    expect(avg.durationSampleSize).toBe(0);
  });

  it("#2 1件のみ・進行中 → duration/intervalともnull", () => {
    const r = record("a", "2026-07-17T10:00:00Z", null);
    expect(calcDuration(r)).toBeNull();
    expect(calcInterval(r, null)).toBeNull();
    const rows = buildRows([r]);
    expect(rows[0].durationSec).toBeNull();
    expect(rows[0].intervalSec).toBeNull();
  });

  it("#3 1件のみ・終了済み（45秒） → duration=45, interval=null", () => {
    const r = record("a", "2026-07-17T10:00:00Z", "2026-07-17T10:00:45Z");
    expect(calcDuration(r)).toBe(45);
    const rows = buildRows([r]);
    expect(rows[0].durationSec).toBe(45);
    expect(rows[0].intervalSec).toBeNull();
  });

  it("#4 2件連続 → 2件目のintervalは420秒(7分)、duration=50秒", () => {
    const r1 = record("a", "2026-07-17T10:00:00Z", "2026-07-17T10:00:40Z");
    const r2 = record("b", "2026-07-17T10:07:00Z", "2026-07-17T10:07:50Z");
    const rows = buildRows([r1, r2]);
    expect(rows[1].intervalSec).toBe(420);
    expect(rows[1].durationSec).toBe(50);
  });

  it("#5 開始順序が前後（時計のズレ）→ intervalはnull", () => {
    const earlier = record("later-typed-first", "2026-07-17T10:00:00Z", null);
    const evenEarlier = record("prev", "2026-07-17T09:59:00Z", null);
    // calcInterval に「currentのほうが古い previous」を渡すケースを直接検証
    const bogusPrevious = record("prev2", "2026-07-17T10:05:00Z", null);
    expect(calcInterval(earlier, bogusPrevious)).toBeNull();
    expect(calcInterval(evenEarlier, bogusPrevious)).toBeNull();
  });

  it("#6 endedAtがstartedAtより前（時計のズレ）→ durationはnull", () => {
    const r = record("a", "2026-07-17T10:00:10Z", "2026-07-17T10:00:00Z");
    expect(calcDuration(r)).toBeNull();
  });

  it("#7 日をまたぐ記録（23:58→翌0:02）→ duration=240秒(4分)", () => {
    const r = record("a", "2026-07-17T23:58:00Z", "2026-07-18T00:02:00Z");
    expect(calcDuration(r)).toBe(240);
  });

  it("#8 進行中の記録がある状態でstartContractionを呼ぶ → no-op", () => {
    const ongoing = record("a", "2026-07-17T10:00:00Z", null);
    const result = startContraction([ongoing], ts("2026-07-17T10:05:00Z"), "b");
    expect(result).toHaveLength(1);
    expect(result).toEqual([ongoing]);
  });

  it("#9 進行中の記録がない状態でendContractionを呼ぶ → no-op", () => {
    const completed = record("a", "2026-07-17T10:00:00Z", "2026-07-17T10:00:30Z");
    const result = endContraction([completed], ts("2026-07-17T10:05:00Z"));
    expect(result).toEqual([completed]);
  });

  it("#10 resetRecords() は空配列を返す", () => {
    expect(resetRecords()).toEqual([]);
  });

  it("#11 7件の完了記録でcalcAverages(records, 5) → 直近5件のみ平均に使う", () => {
    // 開始時刻を1分間隔で7回、それぞれ10秒後に終了する7件を作る
    const records: ContractionRecord[] = [];
    for (let i = 0; i < 7; i++) {
      const start = ts("2026-07-17T10:00:00Z") + i * 60_000;
      records.push({ id: `r${i}`, startedAt: start, endedAt: start + 10_000 });
    }
    const avg = calcAverages(records, 5);
    expect(avg.intervalSampleSize).toBe(5);
    expect(avg.durationSampleSize).toBe(5);
    // 全ての間隔が60秒、全ての持続時間が10秒なので平均も同じ値になる
    expect(avg.avgIntervalSec).toBe(60);
    expect(avg.avgDurationSec).toBe(10);
  });

  it("#12 parseRecords('{不正なJSON') → 空配列（例外を投げない）", () => {
    expect(() => parseRecords("{不正なJSON")).not.toThrow();
    expect(parseRecords("{不正なJSON")).toEqual([]);
  });

  it("#13 parseRecordsで妥当な要素と型不正な要素が混在 → 妥当な要素だけ復元", () => {
    const raw = JSON.stringify([
      { id: "a", startedAt: 1000, endedAt: 2000 },
      { id: "b", startedAt: "not-a-number", endedAt: null },
      { id: "c", startedAt: 3000, endedAt: null },
      { notAnId: true },
      null,
      42,
    ]);
    const result = parseRecords(raw);
    expect(result).toEqual([
      { id: "a", startedAt: 1000, endedAt: 2000 },
      { id: "c", startedAt: 3000, endedAt: null },
    ]);
  });

  it("#14 serializeRecords → parseRecords のラウンドトリップ", () => {
    const records: ContractionRecord[] = [
      { id: "a", startedAt: 1000, endedAt: 2000 },
      { id: "b", startedAt: 5000, endedAt: null },
    ];
    const roundTripped = parseRecords(serializeRecords(records));
    expect(roundTripped).toEqual(records);
  });

  it("#15 formatSecondsLabel: 0秒・59秒・60秒・125秒・null", () => {
    expect(formatSecondsLabel(0)).toBe("0秒");
    expect(formatSecondsLabel(59)).toBe("59秒");
    expect(formatSecondsLabel(60)).toBe("1分0秒");
    expect(formatSecondsLabel(125)).toBe("2分5秒");
    expect(formatSecondsLabel(null)).toBe("—");
  });
});

describe("JintsuuKankakuCounter.calc — 追加の単体テスト", () => {
  it("hasOngoing / getOngoingRecord は進行中の記録の有無を正しく判定する", () => {
    expect(hasOngoing([])).toBe(false);
    const completed = record("a", "2026-07-17T10:00:00Z", "2026-07-17T10:00:30Z");
    expect(hasOngoing([completed])).toBe(false);
    const ongoing = record("b", "2026-07-17T10:05:00Z", null);
    expect(hasOngoing([completed, ongoing])).toBe(true);
    expect(getOngoingRecord([completed, ongoing])).toEqual(ongoing);
  });

  it("startContraction は進行中の記録がなければ新しい記録を追加する", () => {
    const result = startContraction([], ts("2026-07-17T10:00:00Z"), "a");
    expect(result).toEqual([{ id: "a", startedAt: ts("2026-07-17T10:00:00Z"), endedAt: null }]);
  });

  it("endContraction は進行中の記録のendedAtを確定する", () => {
    const ongoing = record("a", "2026-07-17T10:00:00Z", null);
    const result = endContraction([ongoing], ts("2026-07-17T10:00:30Z"));
    expect(result[0].endedAt).toBe(ts("2026-07-17T10:00:30Z"));
  });

  it("sortByStartedAt は開始時刻の昇順に並べ替える（元配列は破壊しない）", () => {
    const b = record("b", "2026-07-17T10:05:00Z", null);
    const a = record("a", "2026-07-17T10:00:00Z", null);
    const input = [b, a];
    const sorted = sortByStartedAt(input);
    expect(sorted).toEqual([a, b]);
    expect(input).toEqual([b, a]); // 元配列は変更されない
  });

  it("STORAGE_KEY はバージョン番号を含む固定文字列である", () => {
    expect(STORAGE_KEY).toBe("rakuda:jintsuu-kankaku-counter:v1");
  });

  it("parseRecords(null) / parseRecords(undefined) / parseRecords('') は空配列", () => {
    expect(parseRecords(null)).toEqual([]);
    expect(parseRecords(undefined)).toEqual([]);
    expect(parseRecords("")).toEqual([]);
  });

  it("parseRecords はJSONが配列でない場合は空配列を返す", () => {
    expect(parseRecords(JSON.stringify({ id: "a" }))).toEqual([]);
  });
});
