"use client";

import { useEffect, useState } from "react";
import { DateField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcNinshinKenshinSchedule,
  formatJapaneseDate,
  sanpuCoveredCount,
  sanpuImplementingMunicipalities,
  todayISO,
  totalMunicipalities,
  visitStatus,
  type NinshinKenshinResult,
  type NinshinKenshinVisit,
} from "./NinshinKenshinSchedule.calc";

/*
 * 妊婦健診スケジュール生成（P2-T14）。
 * 仕様: specs/b-tools/p2-t14-ninshin-kenshin-schedule.md
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 基準日は「今日」固定（SSR/SSGのキャッシュとずれないよう、マウント後にクライアント側で取得する。Getsurei.tsxと同じ方式）。
 * 計算ロジック本体は NinshinKenshinSchedule.calc.ts の純関数（calcNinshinKenshinSchedule 等）。
 */

export function NinshinKenshinSchedule() {
  const [today, setToday] = useState<string | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [lmpInput, setLmpInput] = useState("");

  useEffect(() => {
    setToday(todayISO());
  }, []);

  if (!today) {
    // マウント直後（クライアント側の今日の日付を取得するまで）は何も計算しない
    return <Callout>読み込み中です。</Callout>;
  }

  const hasInput = !!dueDateInput || !!lmpInput;
  const result = hasInput
    ? calcNinshinKenshinSchedule({ dueDate: dueDateInput || undefined, lmp: lmpInput || undefined }, today)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="出産予定日"
          value={dueDateInput}
          onChange={(e) => setDueDateInput(e.target.value)}
          hint="医師から伝えられた出産予定日を入力してください"
        />
        <DateField
          label="最終月経開始日（任意）"
          value={lmpInput}
          onChange={(e) => setLmpInput(e.target.value)}
          hint="出産予定日が未確定の場合、この日から280日後を出産予定日の目安として計算します"
        />
      </div>

      {!hasInput && (
        <Callout>出産予定日（または最終月経開始日）を入れると、その場で健診スケジュールを計算します。</Callout>
      )}

      {result && !result.ok && <Callout tone="caution">{result.message}</Callout>}

      {result?.ok && <ScheduleResult result={result.result} today={today} />}
    </div>
  );
}

function ScheduleResult({
  result,
  today,
}: {
  result: NinshinKenshinResult;
  today: string;
}) {
  const { visits, lmp, dueDate, standardVisitCount, lmpDueDateMismatchDays } = result;
  const mismatchIsLarge =
    lmpDueDateMismatchDays !== null && Math.abs(lmpDueDateMismatchDays) >= 7;

  return (
    <div className="space-y-4">
      <ResultCard
        label="標準的な受診スケジュール"
        value={`${visits.length}`}
        unit="回"
        note={`出産予定日: ${formatJapaneseDate(dueDate)} ／ 最終月経開始日の目安: ${formatJapaneseDate(lmp)}`}
      />

      {mismatchIsLarge && (
        <Callout tone="caution">
          入力した最終月経開始日から計算した出産予定日と、入力した出産予定日に
          {Math.abs(lmpDueDateMismatchDays as number)}
          日のずれがあります。ここでは出産予定日を優先して計算しています。医師から伝えられた出産予定日が確定している場合はそちらをご確認ください。
        </Callout>
      )}

      <ul className="space-y-2">
        {visits.map((v) => (
          <VisitRow key={v.index} visit={v} today={today} />
        ))}
      </ul>

      <Callout>
        {standardVisitCount}回の目安回数の範囲内であれば、公費助成の対象になり得ます（2026-07-17時点のこども家庭庁調査では、全ての市区町村が14回以上を助成しています）。ただし助成の金額・対象となる検査項目・受診券の方式は市区町村ごとに異なります。実際の助成内容は、お住まいの市区町村の母子保健担当窓口でご確認ください。
      </Callout>

      <SanpuKenshinSection result={result} />

      <Callout tone="caution">
        この結果は、厚生労働省が示す標準的な受診間隔（妊娠週数に応じた目安）から日付を計算した参考スケジュールです。実際に何回・いつ受診するかは、妊娠経過・体調・医療機関の方針によって異なります。必ず担当医の指示を優先してください。
      </Callout>
    </div>
  );
}

function VisitRow({ visit, today }: { visit: NinshinKenshinVisit; today: string }) {
  const status = visitStatus(visit, today);
  return (
    <li className="rounded-card border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">
          {visit.index}回目（妊娠{visit.gestationalWeek}週0日ごろ）
        </p>
        <p className="text-sm text-ink-muted">
          {status === "past" ? "目安時期を過ぎています" : status === "today" ? "今日が目安です" : "今後"}
        </p>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{formatJapaneseDate(visit.date)}（目安）</p>
      <p className="mt-1 text-sm text-ink-muted">
        {visit.phaseLabel}
        {visit.intervalWeeksFromPrevious !== null && `／前回から${visit.intervalWeeksFromPrevious}週間`}
      </p>
    </li>
  );
}

function SanpuKenshinSection({ result }: { result: NinshinKenshinResult }) {
  return (
    <div className="rounded-card border border-line p-4 text-sm sm:text-base">
      <p className="font-medium">産後の産婦健康診査（参考）</p>
      <p className="mt-2 text-ink-muted">
        産後2週間の目安: {formatJapaneseDate(result.sanpuFirstCheckupDate)}
      </p>
      <p className="text-ink-muted">
        産後1か月の目安: {formatJapaneseDate(result.sanpuSecondCheckupDate)}
      </p>
      <p className="mt-2 text-ink-muted">
        国が費用の一部を補助する産婦健康診査（{sanpuCoveredCount}回分）は、2026-07-17時点で全
        {totalMunicipalities}市区町村中{sanpuImplementingMunicipalities}市区町村が実施しています。すべての市区町村で受けられるとは限らないため、お住まいの市区町村で実施の有無をご確認ください。
      </p>
    </div>
  );
}
