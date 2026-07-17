"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcJunyuMilkRyo,
  JUNYU_MILK_RYO_GENERAL_NOTE,
  type FeedingType,
  type MlRange,
} from "./JunyuMilkRyo.calc";

/*
 * 授乳・ミルク量の目安（Q3-12）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック・データ表本体は JunyuMilkRyo.calc.ts / data/tables/junyu-milk-ryo.json を参照。
 */

const FEEDING_TYPES: { value: FeedingType; label: string }[] = [
  { value: "milkOnly", label: "ミルクのみ" },
  { value: "breastOnly", label: "母乳のみ" },
  { value: "mixed", label: "混合" },
];

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString("ja-JP");
}

function formatMlRange(range: MlRange): string {
  if (range.min === range.max) return `${fmt(range.min)}ml前後`;
  return `${fmt(range.min)}〜${fmt(range.max)}ml`;
}

export function JunyuMilkRyo() {
  const [ageMonths, setAgeMonths] = useState("1");
  const [weightKg, setWeightKg] = useState("5.0");
  const [feedingType, setFeedingType] = useState<FeedingType>("milkOnly");

  const parsedAge = Number(ageMonths);
  const parsedWeight = Number(weightKg);
  const inputsReady =
    ageMonths.trim() !== "" &&
    weightKg.trim() !== "" &&
    Number.isFinite(parsedAge) &&
    Number.isFinite(parsedWeight);

  const result = inputsReady
    ? calcJunyuMilkRyo({ ageMonths: parsedAge, weightKg: parsedWeight, feedingType })
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="月齢（か月）"
          value={ageMonths}
          min={0}
          step="1"
          hint="0は生後0〜1か月（新生児期）"
          onChange={(e) => setAgeMonths(e.target.value)}
        />
        <NumberField
          label="体重（kg）"
          value={weightKg}
          min={0}
          step="0.1"
          onChange={(e) => setWeightKg(e.target.value)}
        />
        <SelectField
          label="栄養方法"
          value={feedingType}
          onChange={(e) => setFeedingType(e.target.value as FeedingType)}
        >
          {FEEDING_TYPES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </SelectField>
      </div>

      {!result && <Callout>月齢・体重・栄養方法を入れると、その場で目安を計算します。</Callout>}

      {result && !result.ok && result.kind === "validationError" && (
        <Callout tone="caution">{result.message}</Callout>
      )}

      {result && !result.ok && result.kind === "outOfRange" && <Callout>{result.message}</Callout>}

      {result && result.ok && (
        <div className="space-y-3">
          {result.showMlValues ? (
            result.dailyMl ? (
              <ResultCard
                label={`${result.rowLabel}・1日量目安${feedingType === "mixed" ? "（ミルクを足す場合の合計）" : ""}`}
                value={
                  result.dailyMl.target !== undefined
                    ? fmt(result.dailyMl.target)
                    : `${fmt(result.dailyMl.min)}〜${fmt(result.dailyMl.max)}`
                }
                unit={result.dailyMl.target !== undefined ? "ml前後" : "ml"}
                note={`${
                  result.dailyMl.target !== undefined
                    ? `${fmt(result.dailyMl.min)}〜${fmt(result.dailyMl.max)}mlの目安幅／`
                    : ""
                }1回量目安 ${formatMlRange(result.perFeedMl)} ／ 1日${result.timesPerDayLabel}`}
              />
            ) : (
              <ResultCard
                label={`${result.rowLabel}・1回量目安${feedingType === "mixed" ? "（ミルクを足す場合）" : ""}`}
                value={fmt(result.perFeedMl.min)}
                unit="ml前後"
                note={`1日${result.timesPerDayLabel}／離乳食の進み具合により変動するため、1日の合計量は算出していません`}
              />
            )
          ) : (
            <ResultCard
              label={`${result.rowLabel}・授乳の目安`}
              value={`1日${result.timesPerDayLabel}`}
              note="母乳の量は目分量で測れないため、ml換算の目標値はお示ししていません。"
            />
          )}

          {result.notes.map((note, i) => (
            <Callout key={i} tone={note.tone}>
              {note.text}
            </Callout>
          ))}
        </div>
      )}

      <Callout>{JUNYU_MILK_RYO_GENERAL_NOTE}</Callout>
    </div>
  );
}
