"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcJoseiTekiseiTaijuu,
  fmtBmi,
  fmtKg,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  MIN_WEIGHT_KG,
  MAX_WEIGHT_KG,
  MIN_AGE_YEARS,
  MAX_AGE_YEARS,
  TEKISEI_TAIJUU_DISCLAIMER,
  type JoseiTekiseiTaijuuResult,
} from "./JoseiTekiseiTaijuuShihyou.calc";

/*
 * 女性の適正体重・体型指標（P2-T30）。
 * 仕様: specs/b-tools/p2-t30-josei-tekisei-taijuu-shihyou.md
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック本体は JoseiTekiseiTaijuuShihyou.calc.ts の純関数
 * （data/tables/tekisei-taijuu-kijun.json をSSOTとして参照）。
 *
 * YMYL配慮: 「痩せましょう」「太りすぎです」等の指導・断定・煽り表現は一切行わない。
 * 判定は分類名の提示にとどめ、行動を指示しない（docs/09準拠）。
 */

export function JoseiTekiseiTaijuuShihyou() {
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");

  const hasHeightWeight = heightInput !== "" && weightInput !== "";
  const heightCm = heightInput === "" ? NaN : Number(heightInput);
  const weightKg = weightInput === "" ? NaN : Number(weightInput);
  const ageYears = ageInput === "" ? undefined : Number(ageInput);

  const result = hasHeightWeight
    ? calcJoseiTekiseiTaijuu({ heightCm, weightKg, ageYears })
    : null;

  return (
    <div className="space-y-4">
      <NumberField
        label="身長（cm）"
        value={heightInput}
        min={MIN_HEIGHT_CM}
        max={MAX_HEIGHT_CM}
        step={0.1}
        onChange={(e) => setHeightInput(e.target.value)}
      />
      <NumberField
        label="体重（kg）"
        value={weightInput}
        min={MIN_WEIGHT_KG}
        max={MAX_WEIGHT_KG}
        step={0.1}
        onChange={(e) => setWeightInput(e.target.value)}
      />
      <NumberField
        label="年齢（任意）"
        value={ageInput}
        min={MIN_AGE_YEARS}
        max={MAX_AGE_YEARS}
        step={1}
        onChange={(e) => setAgeInput(e.target.value)}
        hint="入力すると、年齢別の『目標とするBMIの範囲』（厚生労働省）とも比較します"
      />

      {!hasHeightWeight && (
        <Callout>身長・体重を入れると、その場でBMIと肥満度分類の目安を表示します。</Callout>
      )}

      {result && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result?.ok && <TekiseiTaijuuResultView result={result.result} />}
    </div>
  );
}

function TekiseiTaijuuResultView({ result }: { result: JoseiTekiseiTaijuuResult }) {
  const {
    bmi,
    standardWeightKg,
    obesityCategory,
    targetRange,
    targetRangeNotApplicableUnder18,
    pregnancyWeightGainRef,
  } = result;

  return (
    <div className="space-y-4">
      <ResultCard
        label="BMI（体格指数）"
        value={fmtBmi(bmi)}
        note={`肥満度分類: ${obesityCategory.label}（${obesityCategory.rangeLabel}）`}
      />

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <p className="font-medium">標準体重の計算基準（BMI22）</p>
        <p className="mt-1 text-ink-muted">
          {fmtKg(standardWeightKg)}kg（身長(m)の2乗 × 22。日本肥満学会が標準体重の計算に用いる基準であり、あなた個人の目標体重ではありません）
        </p>
      </div>

      {targetRange && (
        <div className="rounded-card border border-line p-4 text-sm sm:text-base">
          <p className="font-medium">
            目標とするBMIの範囲（{targetRange.range.ageLabel}）: {targetRange.range.rangeLabel}
          </p>
          <p className="mt-1 text-ink-muted">
            {targetRange.position === "withinRange" &&
              "あなたのBMIはこの範囲内です（厚生労働省「日本人の食事摂取基準（2025年版）」）。"}
            {targetRange.position === "belowRange" &&
              "あなたのBMIはこの範囲の下です（厚生労働省「日本人の食事摂取基準（2025年版）」）。"}
            {targetRange.position === "aboveRange" &&
              "あなたのBMIはこの範囲の上です（厚生労働省「日本人の食事摂取基準（2025年版）」）。"}
          </p>
        </div>
      )}

      {targetRangeNotApplicableUnder18 && (
        <Callout>
          「目標とするBMIの範囲」は18歳以上が対象のため、入力された年齢では比較できません。18歳未満の体格は成長曲線・肥満度など別の指標で評価します。
        </Callout>
      )}

      {!targetRange && !targetRangeNotApplicableUnder18 && (
        <Callout>年齢を入れると、年齢別の「目標とするBMIの範囲」（厚生労働省）とも比較できます。</Callout>
      )}

      {pregnancyWeightGainRef.label && (
        <Callout>
          参考: 妊娠前の体格が「{pregnancyWeightGainRef.label}」に近い方向けの、妊娠中の体重増加指導の目安は
          {pregnancyWeightGainRef.gainLabel}です（こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針
          解説要領」表8）。{pregnancyWeightGainRef.cautionQuote}
          妊娠週数に応じた計算は「妊娠中の体重増加チェッカー」など別のツールをご利用ください。
        </Callout>
      )}

      <Callout tone="caution">{TEKISEI_TAIJUU_DISCLAIMER}</Callout>
    </div>
  );
}
