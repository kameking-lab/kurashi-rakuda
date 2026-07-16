"use client";

import { useState } from "react";
import { DateField, NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcShussanYoteibi,
  formatJapaneseDate,
  todayISO,
} from "./ShussanYoteibi.calc";

/*
 * 出産予定日・妊娠週数計算（Q3-01）。
 * 最終月経開始日（LMP）と平均月経周期からネーゲレ概算法で出産予定日を算出し、
 * 今日時点の妊娠週数・月数・妊娠期を即時表示する。
 * すべてクライアント内で計算し、送信・登録は行わない（docs/05 §1-4）。
 * 医学的判断（診断・受診の要否）は一切行わない（YMYL配慮）。
 */

export function ShussanYoteibi() {
  const [lmp, setLmp] = useState("");
  const [cycleLength, setCycleLength] = useState("28");

  const today = todayISO();
  const cycleLengthNum = Number(cycleLength);
  const cycleValid = Number.isFinite(cycleLengthNum) && cycleLength !== "";

  const result =
    lmp && cycleValid
      ? calcShussanYoteibi({ lmp, cycleLength: cycleLengthNum, baseDate: today })
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="最終月経開始日（LMP）"
          value={lmp}
          max={today}
          onChange={(e) => setLmp(e.target.value)}
          hint="最後の生理が始まった日"
        />
        <NumberField
          label="平均月経周期（日）"
          value={cycleLength}
          min={20}
          max={45}
          step={1}
          onChange={(e) => setCycleLength(e.target.value)}
          hint="わからない場合は28日のままでOKです（20〜45日）"
        />
      </div>

      {!result ? (
        <Callout>最終月経開始日を入れると、その場で計算します。</Callout>
      ) : !result.ok ? (
        <Callout tone="caution">{result.message}</Callout>
      ) : (
        <>
          <ResultCard
            label="出産予定日（目安）"
            value={formatJapaneseDate(result.dueDate)}
            note={`最終月経開始日（${formatJapaneseDate(lmp)}）+ 280日${
              result.correctionDays !== 0
                ? `${result.correctionDays > 0 ? "+" : ""}${result.correctionDays}日（周期補正）`
                : ""
            }で算出（ネーゲレ概算法）`}
          />
          <ResultCard
            label="今日時点の妊娠週数"
            value={result.weeksLabel}
            unit={
              result.month
                ? `妊娠${result.month}ヶ月・${result.period}`
                : result.period
            }
            note={
              result.overdue
                ? `出産予定日を${result.remainingDays}日経過しています`
                : `出産予定日まであと${result.remainingDays}日`
            }
          />
          {result.pastDueDateNotice && (
            <Callout tone="caution">
              出産予定日を超えています。週数の表示は目安です。次の健診で医師にご確認ください。
            </Callout>
          )}
          <Callout tone="caution">
            この予定日・週数は最終月経開始日をもとにした計算上の目安です。実際の妊娠週数・出産予定日は、超音波検査などにより医師が診察のうえ判断します。体調に不安がある場合や、この計算結果と健診での説明が異なる場合は、必ず担当医にご確認ください。双子・多胎妊娠は経過が異なるため、個別に医師へご確認ください。
          </Callout>
        </>
      )}
    </div>
  );
}
