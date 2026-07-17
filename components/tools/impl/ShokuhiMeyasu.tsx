"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { calcFoodCostEstimate, fmtYen } from "./ShokuhiMeyasu.calc";

/*
 * 食費の目安計算（P2-T28）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcFoodCostEstimate）は ShokuhiMeyasu.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 */

export function ShokuhiMeyasu() {
  const [ninzuuInput, setNinzuuInput] = useState("2");

  const parsed = ninzuuInput === "" ? NaN : Number(ninzuuInput);
  const result = calcFoodCostEstimate(parsed);

  return (
    <div className="space-y-4">
      <NumberField
        label="世帯人員数"
        value={ninzuuInput}
        min={1}
        max={10}
        step={1}
        onChange={(e) => setNinzuuInput(e.target.value)}
        hint="単身（1人）から入力できます。6人以上はすべて『6人以上』の統計区分で表示します"
      />

      {ninzuuInput === "" && <Callout>世帯人員数を入れると、その場で目安を表示します。</Callout>}

      {ninzuuInput !== "" && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label={`${result.bucket.label}の食費（食料）の目安・1か月`}
            value={fmtYen(result.bucket.shokuryou)}
            unit="円"
            note={`同区分の消費支出（生活費全体）の目安は${fmtYen(result.bucket.shouhiShishutsu)}円`}
          />

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">食費の内訳（目安）</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              <li>外食: {fmtYen(result.bucket.gaishoku)}円</li>
              <li>調理食品（惣菜・弁当など）: {fmtYen(result.bucket.chouriShokuhin)}円</li>
              <li>その他（食材の購入・飲料・酒類など）: {fmtYen(result.bucket.sonota)}円</li>
            </ul>
          </div>

          {result.isOverBucketed && (
            <Callout>
              入力した{result.inputNinzuu}人そのものの統計区分はありません。総務省統計局の集計は「6人以上」までのため、この区分（実際の平均世帯人員は6.3人）の実額をそのまま表示しています。
            </Callout>
          )}

          <Callout>
            この金額は総務省統計局「家計調査」による世帯人員別の平均値（目安）です。地域・生活スタイル・自炊の頻度などによって実際の食費は大きく異なります。この金額に合わせることを目指す必要はありません。
          </Callout>
        </div>
      )}
    </div>
  );
}
