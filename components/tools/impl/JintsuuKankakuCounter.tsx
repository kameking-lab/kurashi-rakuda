"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  buildRows,
  calcAverages,
  endContraction,
  formatSecondsLabel,
  parseRecords,
  resetRecords,
  serializeRecords,
  startContraction,
  STORAGE_KEY,
  type ContractionRecord,
  type ContractionRow,
} from "./JintsuuKankakuCounter.calc";

/*
 * 陣痛間隔カウンター（P2-T17）。
 * 仕様: specs/b-tools/p2-t17-jintsuu-kankaku-counter.md
 *
 * すべてクライアント内で完結する（送信なし・ネットワーク通信なし・オフライン動作）。
 * 記録は localStorage に永続化し、タブの再読み込み・ブラウザ再起動後も記録が消えないようにする。
 */

function fmtClockTime(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}:${ss}`;
}

export function JintsuuKankakuCounter() {
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<ContractionRecord[]>([]);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  // マウント後にlocalStorageから記録を読み込む（SSR/CSRのミスマッチ回避）
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setRecords(parseRecords(raw));
    } catch {
      // localStorageが使えない環境（プライベートモード等）でも画面をクラッシュさせない
      setRecords([]);
    }
    setMounted(true);
  }, []);

  // 記録が変化するたびに保存する（マウント完了前の空配列で既存データを上書きしないよう mounted を待つ）
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeRecords(records));
    } catch {
      // 保存に失敗しても画面上の記録自体は保持する（容量超過等）
    }
  }, [records, mounted]);

  const rows = buildRows(records);
  const ongoingRow = rows.find((r) => r.endedAt === null) ?? null;
  const ongoingId = ongoingRow ? ongoingRow.id : null;

  // 進行中の陣痛がある間は、経過時間表示を1秒ごとに更新する
  useEffect(() => {
    if (!ongoingId) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ongoingId]);

  if (!mounted) {
    return <Callout>読み込み中です。</Callout>;
  }

  function handleStart() {
    setRecords((prev) => startContraction(prev, Date.now()));
    setNow(Date.now());
  }

  function handleEnd() {
    setRecords((prev) => endContraction(prev, Date.now()));
  }

  function handleResetConfirmed() {
    setRecords(resetRecords());
    setConfirmingReset(false);
  }

  const averages = calcAverages(records);
  const displayRows = [...rows].reverse(); // 新しい順に表示
  const elapsedSec = ongoingRow
    ? Math.max(0, Math.round((now - ongoingRow.startedAt) / 1000))
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="primary"
          className="min-h-16 text-lg"
          onClick={handleStart}
          disabled={ongoingRow !== null}
        >
          陣痛が始まった
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-16 text-lg"
          onClick={handleEnd}
          disabled={ongoingRow === null}
        >
          陣痛が終わった
        </Button>
      </div>

      {ongoingRow && (
        <ResultCard
          label="進行中の陣痛の経過時間"
          value={formatSecondsLabel(elapsedSec)}
          note={`開始: ${fmtClockTime(ongoingRow.startedAt)}`}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultCard
          label={`平均間隔（直近${averages.intervalSampleSize}回）`}
          value={formatSecondsLabel(averages.avgIntervalSec)}
        />
        <ResultCard
          label={`平均持続時間（直近${averages.durationSampleSize}回）`}
          value={formatSecondsLabel(averages.avgDurationSec)}
        />
      </div>

      <Callout>
        一般的には、初産婦は陣痛が10分間隔に、経産婦は10〜15分間隔になったら病院・産院に連絡するとされています（国立成育医療研究センター
        産科の案内より）。破水した場合は、間隔に関わらずすぐに連絡してください。これは一施設の案内であり、実際の連絡タイミングは必ずご自身の受診先の指示を優先してください。本ツールは記録・計算のみを行い、医学的な判断や診断は行いません。
      </Callout>

      <div className="rounded-card border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">記録一覧（新しい順）</p>
          {records.length > 0 && !confirmingReset && (
            <Button type="button" variant="ghost" onClick={() => setConfirmingReset(true)}>
              記録をリセット
            </Button>
          )}
        </div>

        {confirmingReset && (
          <div className="mt-3 space-y-2 rounded-card border border-caution/40 p-3 text-sm">
            <p>本当にすべての記録を削除しますか？この操作は元に戻せません。</p>
            <div className="flex gap-2">
              <Button type="button" variant="primary" onClick={handleResetConfirmed}>
                削除する
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmingReset(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            記録がまだありません。「陣痛が始まった」ボタンで記録を開始してください。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {displayRows.map((row) => (
              <ContractionListItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>

      <Callout>
        記録はすべてこの端末（ブラウザ）内だけに保存され、外部には一切送信されません。オフラインでも問題なく記録・計算できます。タブを閉じたり再読み込みしても記録は残ります（この端末・このブラウザ限定です）。
      </Callout>
    </div>
  );
}

function ContractionListItem({ row }: { row: ContractionRow }) {
  const ongoing = row.endedAt === null;
  return (
    <li className="rounded-card border border-line p-3 text-sm sm:text-base">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium tabular-nums">{fmtClockTime(row.startedAt)} 開始</span>
        {ongoing && <span className="text-brand">進行中</span>}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
        <span>持続時間: {ongoing ? "計測中" : formatSecondsLabel(row.durationSec)}</span>
        <span>
          前回からの間隔:{" "}
          {row.intervalSec === null ? "（比較対象なし）" : formatSecondsLabel(row.intervalSec)}
        </span>
      </div>
    </li>
  );
}
