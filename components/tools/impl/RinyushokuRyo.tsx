"use client";

import { useState } from "react";
import { DateField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { todayJst } from "@/lib/tools/seido";
import {
  calculateRinyushokuRyo,
  FOOD_GROUP_LABELS,
  FOOD_GROUP_ORDER,
  COMMON_NOTES,
  PROTEIN_NOTE,
  RINYUSHOKU_DISCLAIMER,
  RINYUSHOKU_PREMATURE_DISCLAIMER,
} from "./RinyushokuRyo.calc";

/*
 * 離乳食の量・固さ早見（Q3-07）。
 * 生年月日（必須）と出産予定日（任意・修正月齢用）を入力すると、
 * その場で該当する離乳段階と食品群別の目安量・固さを表示する（送信なし・クライアント内計算）。
 * データ本体は data/tables/rinyushoku-ryo.json（厚生労働省「授乳・離乳の支援ガイド」基準）。
 */

function todayISO(): string {
  // ★JST基準★ UTC の toISOString では 0:00〜8:59 が前日になり月齢境界がずれる
  return todayJst();
}

export function RinyushokuRyo() {
  const [birthDate, setBirthDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weaningStarted, setWeaningStarted] = useState(true);

  const calc =
    birthDate.trim() !== ""
      ? calculateRinyushokuRyo({
          birthDate,
          dueDate: dueDate.trim() === "" ? undefined : dueDate,
          today: todayISO(),
          weaningStarted,
        })
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="お子さまの生年月日"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          hint="必須。今日の日付から3歳未満の範囲で入力してください"
        />
        <DateField
          label="出産予定日（任意）"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          hint="早産の場合、修正月齢の参考表示に使います（未入力可）"
        />
      </div>

      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={!weaningStarted}
          onChange={(e) => setWeaningStarted(!e.target.checked)}
        />
        <span>まだ離乳食を始めていない</span>
      </label>

      {!calc && (
        <Callout>お子さまの生年月日を入力すると、その場で段階と目安量を表示します。</Callout>
      )}

      {calc && !calc.ok && <Callout tone="caution">{calc.error}</Callout>}

      {calc && calc.ok && (
        <>
          <ResultCard
            label="現在の段階"
            value={calc.result.stage.label}
            note={
              calc.result.usingCorrectedAge && calc.result.correctedAgeMonths !== null
                ? `修正月齢${calc.result.correctedAgeMonths}ヶ月（実齢${calc.result.actualAgeMonths}ヶ月）`
                : `生後${calc.result.actualAgeMonths}ヶ月`
            }
          >
            {calc.result.stage.mealsPerDay && (
              <p className="mt-2 text-sm opacity-90">食事回数の目安: {calc.result.stage.mealsPerDay}</p>
            )}
            {calc.result.stage.textureLabel && (
              <p className="mt-1 text-sm opacity-90">固さの目安: {calc.result.stage.textureLabel}</p>
            )}
          </ResultCard>

          {calc.result.stage.message && <Callout>{calc.result.stage.message}</Callout>}

          {calc.result.nextStage && (
            <Callout>
              あと{calc.result.nextStage.monthsRemaining}ヶ月ほどで
              {calc.result.nextStage.label}の目安です。
            </Callout>
          )}

          {calc.result.stage.foodGroups && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 pr-3">食品群</th>
                    <th className="py-2 pr-3">1回あたりの目安量</th>
                  </tr>
                </thead>
                <tbody>
                  {FOOD_GROUP_ORDER.map((key) => (
                    <tr key={key} className="border-b border-line/50">
                      <td className="py-2 pr-3">{FOOD_GROUP_LABELS[key]}</td>
                      <td className="py-2 pr-3">{calc.result.stage.foodGroups![key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm text-ink-muted">{PROTEIN_NOTE}</p>
            </div>
          )}

          <div className="space-y-2">
            {COMMON_NOTES.map((n) => (
              <Callout key={n.title}>
                <strong>{n.title}</strong>: {n.content}
              </Callout>
            ))}
          </div>

          {calc.result.usingCorrectedAge && (
            <Callout tone="caution">{RINYUSHOKU_PREMATURE_DISCLAIMER}</Callout>
          )}

          <Callout tone="caution">{RINYUSHOKU_DISCLAIMER}</Callout>
        </>
      )}
    </div>
  );
}
