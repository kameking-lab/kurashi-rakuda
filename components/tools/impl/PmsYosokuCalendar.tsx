"use client";

import { useState } from "react";
import { DateField, NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcPmsYosokuCalendar,
  formatJa,
  formatJaShort,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  PMS_PREVALENCE_FROM_PERCENT,
  PMS_PREVALENCE_TO_PERCENT,
  PMS_CONSULTATION_GUIDANCE_TEXT,
} from "./PmsYosokuCalendar.calc";

/*
 * PMS・体調予測カレンダー（記録なし版）（P2-T31）。
 * すべてクライアント内で即時計算（送信なし・記録なし・localStorageへの保存もしない）。
 * ★医療判断なし（仕様で固定）★ 症状の診断・重症度判定は一切行わない。
 * 黄体期間・PMS症状が出やすいとされる時期の目安をカレンダー表示するのみ。
 */

export function PmsYosokuCalendar() {
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
      ? calcPmsYosokuCalendar({ lmp, cycleLength: cycleLengthNum, calendarCount: 3 })
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

      {!lmp && (
        <Callout>
          最終月経開始日を入れると、黄体期間とPMS症状が出やすいとされる時期の目安をその場で計算します。入力値や結果は保存されません（記録機能なし）。
        </Callout>
      )}

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
          />
          <ResultCard
            label="黄体期間（排卵後〜次回月経前。目安）"
            value={`${formatJaShort(result.current.lutealPhaseStart)}〜${formatJaShort(
              result.current.lutealPhaseEnd,
            )}`}
            note="プロゲステロン（黄体ホルモン）の作用で、むくみ・食欲増加・眠気・イライラなどが起こりやすいとされる期間です。"
          />
          <ResultCard
            label="PMS症状が出やすいとされる時期の目安"
            value={`${formatJaShort(result.current.pmsWindowStart)}〜${formatJaShort(
              result.current.pmsWindowEnd,
            )}`}
            note="日本産婦人科学会の定義（月経前3〜10日の間続く症状）に基づく、黄体期間後半の目安です。月経開始とともに軽快・消失するとされています。"
          />

          <div>
            <h3 className="text-sm font-medium">今後の周期カレンダー（目安）</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {result.calendar.map((c) => (
                <li key={c.cycleNumber}>
                  第{c.cycleNumber}回（月経開始予定
                  {formatJaShort(c.periodDate)}）: 黄体期間 {formatJaShort(c.lutealPhaseStart)}〜
                  {formatJaShort(c.lutealPhaseEnd)}／PMS目安 {formatJaShort(c.pmsWindowStart)}〜
                  {formatJaShort(c.pmsWindowEnd)}
                </li>
              ))}
            </ul>
          </div>

          <Callout>
            PMSは月経がある女性の{PMS_PREVALENCE_FROM_PERCENT}〜{PMS_PREVALENCE_TO_PERCENT}
            %に起こるとされています。この目安を表示しても、症状の出方には個人差があり、すべての人に当てはまるものではありません。
          </Callout>
          <Callout tone="caution">
            これは黄体期・PMSの定義に基づく日付計算上の目安であり、診断ではありません。症状の有無・重さの判定は行っていません。{PMS_CONSULTATION_GUIDANCE_TEXT}
            排卵日を含むため、避妊・妊活の判断にこの予測のみを用いることはお控えください。
          </Callout>
        </div>
      )}
    </div>
  );
}
