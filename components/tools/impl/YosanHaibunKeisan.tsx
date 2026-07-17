"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { calcBudgetAllocation, fmtYen, fmtPercent } from "./YosanHaibunKeisan.calc";

/*
 * 手取りからの予算配分計算（費目テンプレ）（P2-T29）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcBudgetAllocation）は YosanHaibunKeisan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 */

export function YosanHaibunKeisan() {
  const [ninzuuInput, setNinzuuInput] = useState("2");
  const [tedoriInput, setTedoriInput] = useState("300000");

  const parsedNinzuu = ninzuuInput === "" ? NaN : Number(ninzuuInput);
  const parsedTedori = tedoriInput === "" ? NaN : Number(tedoriInput);
  const bothEntered = ninzuuInput !== "" && tedoriInput !== "";
  const result = calcBudgetAllocation(parsedNinzuu, parsedTedori);

  return (
    <div className="space-y-4">
      <NumberField
        label="世帯人員数"
        value={ninzuuInput}
        min={1}
        max={10}
        step={1}
        onChange={(e) => setNinzuuInput(e.target.value)}
        hint="単身（1人）から入力できます。6人以上はすべて『6人以上』の統計区分で計算します"
      />

      <NumberField
        label="手取り月収（円）"
        value={tedoriInput}
        min={0}
        step={1000}
        onChange={(e) => setTedoriInput(e.target.value)}
        hint="税金・社会保険料を引いたあと、実際に使える金額（可処分所得）を入力してください"
      />

      {!bothEntered && (
        <Callout>世帯人員数と手取り月収を入れると、その場で費目別の配分の目安を表示します。</Callout>
      )}

      {bothEntered && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label={`${result.bucket.label}・費目別の配分の目安（手取り${fmtYen(result.inputTedori)}円/月）`}
            value={fmtYen(
              result.bucket.categories.find((c) => c.key === "shokuryou")?.amount ?? 0,
            )}
            unit="円（食料）"
            note="下に全10費目の内訳を表示しています"
          />

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">費目別の配分（目安）</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {result.bucket.categories.map((c) => (
                <li key={c.key} className="flex items-baseline justify-between gap-2">
                  <span>{c.label}</span>
                  <span className="tabular-nums text-ink">
                    {fmtYen(c.amount)}円
                    <span className="ml-1 text-xs text-ink-muted">（{fmtPercent(c.ratio)}%）</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {result.isOverBucketed && (
            <Callout>
              入力した{result.inputNinzuu}人そのものの統計区分はありません。総務省統計局の集計は「6人以上」までのため、この区分（実際の平均世帯人員は6.3人）の構成比をそのまま使っています。
            </Callout>
          )}

          <Callout>
            この金額は総務省統計局「家計調査」の世帯人員別・費目別の支出構成比（全国平均）を、入力した手取り月収にそのまま当てはめた目安です。実際の家計調査の「消費支出」は貯蓄に回した分を含まない実際の支出額であり、あなたの手取り収入や貯蓄の状況とは無関係に計算しています。地域・生活スタイル・住居費（持家か賃貸か）などによって、実際に望ましい配分は大きく異なります。「この通りに配分すべき」という指導ではありません。
          </Callout>
        </div>
      )}
    </div>
  );
}
