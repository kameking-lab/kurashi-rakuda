"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcSuihanMizu,
  BASIS_NOTICE,
  INPUT_MODE_LABELS,
  RICE_COOKER_SCALE_NOTICE,
  RICE_TYPES,
  RICE_TYPE_NOTES,
  type RiceType,
  type SuihanInputMode,
} from "./SuihanMizu.calc";

/*
 * 炊飯の水の量・合数⇄g換算（Q3-15）。
 * 「合数」「米の重量(g)」「計量カップ(ml)」のいずれかと米の種類を入れると、
 * 米の重量・体積・必要な水の量をその場で計算する。
 * すべてクライアント内で計算し、送信・登録は行わない（docs/05 §1-4）。
 */

const INPUT_MODES: SuihanInputMode[] = ["go", "g", "ml"];

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function SuihanMizu() {
  const [inputMode, setInputMode] = useState<SuihanInputMode>("go");
  const [value, setValue] = useState("1");
  const [riceType, setRiceType] = useState<RiceType>("白米");

  const parsed = value === "" ? null : Number(value);
  const result = calcSuihanMizu({ inputMode, value: parsed, riceType });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="入力方法"
          value={inputMode}
          onChange={(e) => setInputMode(e.target.value as SuihanInputMode)}
        >
          {INPUT_MODES.map((m) => (
            <option key={m} value={m}>
              {INPUT_MODE_LABELS[m]}
            </option>
          ))}
        </SelectField>
        <NumberField
          label={INPUT_MODE_LABELS[inputMode]}
          value={value}
          min={0}
          step="0.1"
          onChange={(e) => setValue(e.target.value)}
        />
        <SelectField
          label="米の種類"
          value={riceType}
          onChange={(e) => setRiceType(e.target.value as RiceType)}
        >
          {RICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      </div>

      {!result.ok ? (
        <Callout tone="caution">{result.message}</Callout>
      ) : (
        <>
          <ResultCard
            label={`${result.riceType} ${fmt(result.go)}合（${fmt(result.riceG)}g／${fmt(result.riceMl)}ml）に必要な水の量`}
            value={
              result.water.kind === "白米"
                ? `${fmt(result.water.weightMethodMl)}`
                : result.water.kind === "無洗米"
                  ? `${fmt(result.water.minMl)}〜${fmt(result.water.maxMl)}`
                  : `${fmt(result.water.ml)}`
            }
            unit="ml"
            note={
              result.water.kind === "白米"
                ? `重量ベース目安（米×1.2）: ${fmt(result.water.weightMethodMl)}ml ／ 合数簡易法目安（合数×200ml）: ${fmt(result.water.simpleMethodMl)}ml`
                : result.water.kind === "無洗米"
                  ? `白米の合数簡易法（合数×200ml）に大さじ1〜2杯分を加算した目安です`
                  : undefined
            }
          />

          <Callout>{RICE_TYPE_NOTES[result.riceType]}</Callout>

          {result.largeAmountNotice && (
            <Callout tone="caution">
              家庭用炊飯器は5合炊き・1升(10合)炊きが一般的です。1升を超える量は分けて炊くことをおすすめします。
            </Callout>
          )}
          {result.smallAmountNotice && (
            <Callout>
              少量の場合は計量カップより誤差が出にくいキッチンスケールでの計量をおすすめします。
            </Callout>
          )}

          <Callout>{RICE_COOKER_SCALE_NOTICE}</Callout>
          <p className="text-sm text-ink-muted">{BASIS_NOTICE}</p>
        </>
      )}
    </div>
  );
}
