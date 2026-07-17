"use client";

import { useEffect, useState } from "react";
import { DateField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { SeidoNotice } from "@/components/tools/SeidoNotice";
import {
  calcJoseiKenshinSchedule,
  kenshinGankenshinDataset,
  COMPREHENSIVE_SCREENING_NOTE,
  UNDER_TREATMENT_EXCLUSION_NOTE,
  type EligibilityStatus,
  type JoseiKenshinResult,
  type ScreeningJudgement,
} from "./JoseiKenshinSchedule.calc";

/*
 * 健診・がん検診 年齢別スケジュール（女性）（P2-T33）。
 * 仕様: specs/b-tools/p2-t33-josei-kenshin-schedule.md
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 基準日は「今日」固定（SSR/SSGのキャッシュとずれないよう、マウント後にクライアント側で取得する。
 * NinshinKenshinSchedule.tsx と同じ方式）。
 * 計算ロジック本体は JoseiKenshinSchedule.calc.ts の純関数。
 */

function statusLabel(status: EligibilityStatus, yearsUntilEligible: number | null): string {
  if (status === "eligible") return "対象です";
  if (status === "notEligible") return "対象外（年齢上限を超えています）";
  return `あと${yearsUntilEligible}年で対象になります`;
}

export function JoseiKenshinSchedule() {
  const [today, setToday] = useState<string | null>(null);
  const [birthDateInput, setBirthDateInput] = useState("");

  useEffect(() => {
    setToday(
      (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      })(),
    );
  }, []);

  if (!today) {
    // マウント直後（クライアント側の今日の日付を取得するまで）は何も計算しない
    return <Callout>読み込み中です。</Callout>;
  }

  const hasInput = !!birthDateInput;
  const result = hasInput ? calcJoseiKenshinSchedule({ birthDate: birthDateInput }, today) : null;

  return (
    <div className="space-y-4">
      <DateField
        label="生年月日"
        value={birthDateInput}
        onChange={(e) => setBirthDateInput(e.target.value)}
        hint="満年齢を計算し、女性が対象になりうる健診・がん検診を一覧表示します"
      />

      {!hasInput && (
        <Callout>生年月日を入れると、その場で対象になる健診・がん検診を一覧計算します。</Callout>
      )}

      {result && !result.ok && <Callout tone="caution">{result.message}</Callout>}

      {result?.ok && <ScheduleResult result={result.result} today={today} />}
    </div>
  );
}

function ScheduleResult({ result, today }: { result: JoseiKenshinResult; today: string }) {
  const { age, judgements } = result;
  const eligibleCount = judgements.filter((j) => j.status === "eligible").length;

  return (
    <div className="space-y-4">
      <ResultCard
        label="現在の満年齢"
        value={`${age}`}
        unit="歳"
        note={`${judgements.length}件のうち${eligibleCount}件が現在対象です`}
      />

      <ul className="space-y-2">
        {judgements.map((j) => (
          <ScreeningRow key={j.id} judgement={j} />
        ))}
      </ul>

      <Callout>{UNDER_TREATMENT_EXCLUSION_NOTE}</Callout>

      <Callout>{COMPREHENSIVE_SCREENING_NOTE}</Callout>

      <Callout tone="caution">
        がん検診の実施主体は市区町村（努力義務。健康増進法第19条の2）、特定健診の実施主体は加入する医療保険者、後期高齢者健診の実施主体は後期高齢者医療広域連合です。
        実際に受けられる検診の種類・受診券の案内方法・自己負担額は、お住まいの市区町村・加入する医療保険者によって異なります。本ツールは対象年齢の目安を示すものであり、受診の要否や結果の判断など医学的な判断は一切行いません。必ずお住まいの市区町村・医療保険者の案内でご確認ください。
      </Callout>

      <SeidoNotice datasets={[kenshinGankenshinDataset]} today={today} />
    </div>
  );
}

function ScreeningRow({ judgement }: { judgement: ScreeningJudgement }) {
  const { name, targetAgeLabel, intervalLabel, status, yearsUntilEligible, note } = judgement;
  return (
    <li className="rounded-card border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">{name}</p>
        <p
          className={`text-sm ${
            status === "eligible"
              ? "font-bold text-ink"
              : status === "notEligible"
                ? "text-ink-muted"
                : "text-ink-muted"
          }`}
        >
          {statusLabel(status, yearsUntilEligible)}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">対象年齢: {targetAgeLabel}</p>
      <p className="text-sm text-ink-muted">受診間隔: {intervalLabel}</p>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
    </li>
  );
}
