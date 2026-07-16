"use client";

import { useState } from "react";
import { DateField, NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcSeiriShuki,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
} from "./SeiriShuki.calc";

/*
 * 生理周期・排卵日予測（Q3-03）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 黄体期14日固定モデルによる簡易予測であり、診断・避妊/妊活の成否判定は一切行わない。
 */

function formatJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function formatJaShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}月${d}日`;
}

export function SeiriShuki() {
  const [lmp, setLmp] = useState("");
  const [cycleLength, setCycleLength] = useState("28");

  const cycleLengthNum = Number(cycleLength);
  const cycleLengthValid =
    Number.isFinite(cycleLengthNum) &&
    Number.isInteger(cycleLengthNum) &&
    cycleLengthNum >= CYCLE_LENGTH_MIN &&
    cycleLengthNum <= CYCLE_LENGTH_MAX;

  const result =
    lmp && cycleLengthValid
      ? calcSeiriShuki({ lmp, cycleLength: cycleLengthNum })
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="最終月経開始日"
          value={lmp}
          onChange={(e) => setLmp(e.target.value)}
        />
        <NumberField
          label="平均月経周期日数"
          value={cycleLength}
          min={CYCLE_LENGTH_MIN}
          max={CYCLE_LENGTH_MAX}
          step="1"
          hint={`${CYCLE_LENGTH_MIN}〜${CYCLE_LENGTH_MAX}日の範囲で入力してください（デフォルト28日）`}
          onChange={(e) => setCycleLength(e.target.value)}
        />
      </div>

      {!lmp && <Callout>最終月経開始日を入れると、その場で予測します。</Callout>}

      {lmp && !cycleLengthValid && (
        <Callout tone="caution">
          周期日数は{CYCLE_LENGTH_MIN}〜{CYCLE_LENGTH_MAX}の範囲で入力してください
        </Callout>
      )}

      {lmp && cycleLengthValid && result && !result.ok && (
        <Callout tone="caution">{result.message}</Callout>
      )}

      {result?.ok && (
        <div className="space-y-4">
          <ResultCard
            label="次回の月経開始予定日（目安）"
            value={formatJa(result.nextPeriodDate)}
            note={`次々回: ${formatJa(result.next2PeriodDate)}（目安）`}
          />
          <ResultCard
            label="排卵予測日（目安）"
            value={`${formatJa(result.ovulationDate)}ごろ`}
            note={`妊娠しやすい期間の目安: ${formatJaShort(
              result.fertileWindowStart,
            )}〜${formatJaShort(result.fertileWindowEnd)}ごろ`}
          />
          <Callout>{result.ovulationStatus}</Callout>
          <Callout tone="caution">
            この予測は、入力された周期日数をもとにした計算上の目安です。実際の排卵日や妊娠しやすい時期は、ストレスや体調によって毎周期ずれることがあり、この計算だけで正確に特定することはできません。より正確に把握したい場合は、基礎体温の記録や排卵日検査薬の利用、婦人科への相談をおすすめします。避妊の目的でこの予測のみに頼ることはお控えください。妊活・体調について気になることがある場合は、必ず医師にご相談ください。
          </Callout>
        </div>
      )}
    </div>
  );
}
