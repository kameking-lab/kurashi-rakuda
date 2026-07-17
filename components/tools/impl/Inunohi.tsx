"use client";

import { useState } from "react";
import { DateField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcInunohi,
  formatDateJa,
  type InunohiInputMode,
} from "./Inunohi.calc";

/*
 * 戌の日計算・安産祈願カレンダー（Q3-02）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック本体は Inunohi.calc.ts に分離（テスト対象）。
 */

const MODES: { value: InunohiInputMode; label: string }[] = [
  { value: "lmp", label: "最終月経開始日から計算" },
  { value: "edd", label: "出産予定日（医師の診断済み）から計算" },
];

export function Inunohi() {
  const [inputMode, setInputMode] = useState<InunohiInputMode>("lmp");
  const [lmp, setLmp] = useState("");
  const [edd, setEdd] = useState("");
  const [calendarCount, setCalendarCount] = useState("6");

  const parsedCount = Number(calendarCount);
  const hasDateInput = inputMode === "lmp" ? lmp !== "" : edd !== "";

  const out = hasDateInput
    ? calcInunohi({
        inputMode,
        lmp: inputMode === "lmp" ? lmp : undefined,
        edd: inputMode === "edd" ? edd : undefined,
        calendarCount: Number.isFinite(parsedCount) ? parsedCount : undefined,
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="入力方式"
          value={inputMode}
          onChange={(e) => setInputMode(e.target.value as InunohiInputMode)}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectField>
        {inputMode === "lmp" ? (
          <DateField
            label="最終月経開始日"
            value={lmp}
            onChange={(e) => setLmp(e.target.value)}
          />
        ) : (
          <DateField
            label="出産予定日"
            value={edd}
            onChange={(e) => setEdd(e.target.value)}
          />
        )}
        <NumberField
          label="カレンダー表示件数"
          hint="1〜12件（既定6件）"
          value={calendarCount}
          min={1}
          max={12}
          step="1"
          onChange={(e) => setCalendarCount(e.target.value)}
        />
      </div>

      {!out && (
        <Callout>
          最終月経開始日（または出産予定日）を入れると、妊娠5ヶ月最初の戌の日をその場で計算します。
        </Callout>
      )}

      {out && !out.ok && <Callout tone="caution">{out.error}</Callout>}

      {out && out.ok && (
        <>
          <ResultCard
            label="妊娠5ヶ月最初の戌の日"
            value={formatDateJa(out.result.firstInuNoHi)}
            note={`妊娠5ヶ月に入る日: ${formatDateJa(out.result.month5Start)}〜`}
          />

          {out.result.isPast ? (
            <Callout tone="caution">
              妊娠5ヶ月最初の戌の日はすでに過ぎています。次にお参りしやすい戌の日は
              {out.result.nextInuNoHi && ` ${formatDateJa(out.result.nextInuNoHi)} `}
              です。
            </Callout>
          ) : (
            <Callout>これからです。日程の目安としてお使いください。</Callout>
          )}

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">回</th>
                  <th className="px-4 py-2 font-medium">戌の日</th>
                </tr>
              </thead>
              <tbody>
                {out.result.calendar.map((date, i) => (
                  <tr key={date} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2 text-ink-muted">{i + 1}</td>
                    <td className="px-4 py-2 tabular-nums">{formatDateJa(date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Callout tone="caution">
            戌の日は、妊娠5ヶ月に入って最初に巡ってくる十二支の日を計算したものです。安産祈願（帯祝い）は日本の伝統的な風習であり、この日にお参りすることが医学的な安産を保証するものではありません。妊娠経過に関して気になることがある場合は、必ず担当医にご確認ください。また、神社によっては予約制・混雑状況が異なるため、事前に参拝先へご確認ください。
          </Callout>
        </>
      )}
    </div>
  );
}
