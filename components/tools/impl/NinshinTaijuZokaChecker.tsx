"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcNinshinTaijuZoka,
  fmtBmi,
  fmtGainKg,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  MIN_PRE_WEIGHT_KG,
  MAX_PRE_WEIGHT_KG,
  MIN_CURRENT_WEIGHT_KG,
  MAX_CURRENT_WEIGHT_KG,
  GAIN_GUIDANCE_FOOTNOTE,
  PREGNANCY_GAIN_CAUTION,
  APPLICABILITY_NOTE,
  type NinshinTaijuZokaResult,
} from "./NinshinTaijuZokaChecker.calc";

/*
 * 妊娠中の体重増加チェッカー（P2-T15）。
 * 仕様: specs/b-tools/p2-t15-ninshin-taiju-zoka-checker.md
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック本体は NinshinTaijuZokaChecker.calc.ts の純関数
 * （data/tables/tekisei-taijuu-kijun.json の pregnancyWeightGain をSSOTとして参照）。
 *
 * YMYL配慮: 「食べ過ぎです」「もっと増やして」等の指導・断定・煽り表現は一切行わない。
 * 判定は「目安の範囲より多い／範囲内／範囲より少ない」という事実の提示にとどめる。
 * 肥満2度以上は数値目安を出さず主治医相談に誘導する。多胎（双子等）は非対応。
 */

export function NinshinTaijuZokaChecker() {
  const [heightInput, setHeightInput] = useState("");
  const [preWeightInput, setPreWeightInput] = useState("");
  const [currentWeightInput, setCurrentWeightInput] = useState("");

  const hasAllInputs =
    heightInput !== "" && preWeightInput !== "" && currentWeightInput !== "";
  const heightCm = heightInput === "" ? NaN : Number(heightInput);
  const preWeightKg = preWeightInput === "" ? NaN : Number(preWeightInput);
  const currentWeightKg = currentWeightInput === "" ? NaN : Number(currentWeightInput);

  const result = hasAllInputs
    ? calcNinshinTaijuZoka({ heightCm, preWeightKg, currentWeightKg })
    : null;

  return (
    <div className="space-y-4">
      <NumberField
        label="妊娠前の身長（cm）"
        value={heightInput}
        min={MIN_HEIGHT_CM}
        max={MAX_HEIGHT_CM}
        step={0.1}
        onChange={(e) => setHeightInput(e.target.value)}
      />
      <NumberField
        label="妊娠前の体重（kg）"
        value={preWeightInput}
        min={MIN_PRE_WEIGHT_KG}
        max={MAX_PRE_WEIGHT_KG}
        step={0.1}
        onChange={(e) => setPreWeightInput(e.target.value)}
      />
      <NumberField
        label="現在の体重（kg）"
        value={currentWeightInput}
        min={MIN_CURRENT_WEIGHT_KG}
        max={MAX_CURRENT_WEIGHT_KG}
        step={0.1}
        onChange={(e) => setCurrentWeightInput(e.target.value)}
        hint="今日の体重、または直近に測った体重を入力してください"
      />

      {!hasAllInputs && (
        <Callout>
          妊娠前の身長・体重と現在の体重を入れると、その場で体重増加の目安と現在の増加量を比較して表示します。
        </Callout>
      )}

      {result && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result?.ok && <NinshinTaijuZokaResultView result={result.result} />}

      <Callout>
        {APPLICABILITY_NOTE}
        （多胎（双子など）の場合の目安値は本ツールでは扱っていません。）
      </Callout>
    </div>
  );
}

function NinshinTaijuZokaResultView({ result }: { result: NinshinTaijuZokaResult }) {
  const { bmi, category, currentGainKg, isIndividualCase, comparison } = result;

  return (
    <div className="space-y-4">
      <ResultCard
        label="妊娠前BMI（体格指数）"
        value={fmtBmi(bmi)}
        note={`妊娠前の体格: ${category.label}（${category.bmiRangeLabel}）`}
      />

      {isIndividualCase ? (
        <div className="rounded-card border border-line p-4 text-sm sm:text-base">
          <p className="font-medium">体重増加の目安: 個別対応</p>
          <p className="mt-1 text-ink-muted">
            妊娠前の体格が「肥満（2度以上）」に当たる場合、こども家庭庁の資料では体重増加量の目安が数値のレンジではなく「個別対応」（上限5kgまでが目安）とされています。この場合、本ツールでは自動計算した目安をお示しすることができません。現在の増加量は
            {fmtGainKg(currentGainKg)}
            kgです。体重管理については、必ず担当の産科医にご相談ください。
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-line p-4 text-sm sm:text-base">
          <p className="font-medium">
            体重増加指導の目安（{category.label}）: {category.gainLabel}
          </p>
          <p className="mt-1 text-ink-muted">
            現在の増加量: {fmtGainKg(currentGainKg)}kg
            {comparison === "belowTarget" && "（目安の範囲より少なめです）"}
            {comparison === "withinTarget" && "（目安の範囲内です）"}
            {comparison === "aboveTarget" && "（目安の範囲より多めです）"}
          </p>
          {category.note && <p className="mt-2 text-ink-muted">{category.note}</p>}
        </div>
      )}

      <Callout>{PREGNANCY_GAIN_CAUTION}</Callout>

      <Callout tone="caution">{GAIN_GUIDANCE_FOOTNOTE}</Callout>
    </div>
  );
}
