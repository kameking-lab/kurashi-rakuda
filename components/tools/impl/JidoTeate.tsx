"use client";

import { useState } from "react";
import { DateField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calculateJidoTeate,
  JIDO_TEATE_DISCLAIMER,
  type JidoTeateAgeCategory,
} from "./JidoTeate.calc";

/*
 * 児童手当計算（Q3-08）。
 * 世帯の子ども（きょうだい）を生年月日で1人ずつ登録し、その場で
 * 月額・世帯合計・年額・1回あたり支給額を計算する（送信なし・クライアント内計算）。
 *
 * 多子加算の数え方は、支給対象（0〜18歳年度末）より広い22歳年度末までの
 * 兄姉を年齢が上から数える。18〜22歳年度末の兄姉は「経済的に養っているか」を
 * 追加で質問し、YESの場合のみカウントに含める（jido-teate.json の note を参照）。
 */

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

const CATEGORY_LABEL: Record<JidoTeateAgeCategory, string> = {
  under3: "0〜2歳",
  age3ToHighSchool: "3歳〜高校生年代",
  over18to22: "高校生年代を超過（大学生年代等）",
  over22: "対象外（22歳年度末を超過）",
};

let idSeed = 0;
function nextId(): string {
  idSeed += 1;
  return `child-${idSeed}`;
}

interface ChildRow {
  key: string;
  birthDate: string;
  economicallySupported: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function JidoTeate() {
  const [baseDate, setBaseDate] = useState(todayISO());
  const [rows, setRows] = useState<ChildRow[]>([
    { key: nextId(), birthDate: "", economicallySupported: false },
  ]);

  function addRow() {
    setRows((prev) => [...prev, { key: nextId(), birthDate: "", economicallySupported: false }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<ChildRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const filledRows = rows.filter((r) => r.birthDate.trim() !== "");
  const calc =
    filledRows.length > 0
      ? calculateJidoTeate(
          filledRows.map((r) => ({
            birthDate: r.birthDate,
            economicallySupported: r.economicallySupported,
          })),
          baseDate || undefined,
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField
          label="基準日"
          value={baseDate}
          onChange={(e) => setBaseDate(e.target.value)}
          hint="未入力の場合は今日の日付で計算します"
        />
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const bd = row.birthDate.trim() === "" ? null : row.birthDate;
          const singleCalc =
            bd && baseDate
              ? calculateJidoTeate([{ birthDate: bd, economicallySupported: row.economicallySupported }], baseDate)
              : null;
          const category =
            singleCalc && singleCalc.ok ? singleCalc.result.children[0].ageCategory : null;
          const showEconomicField = category === "over18to22";

          return (
            <div key={row.key} className="rounded-card border border-line p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <DateField
                    label={`第${i + 1}子の生年月日`}
                    value={row.birthDate}
                    onChange={(e) => updateRow(row.key, { birthDate: e.target.value })}
                    hint="対象の子ども（きょうだい）を年齢の上下を問わず登録してください"
                  />
                  {showEconomicField && (
                    <label className="flex min-h-12 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={row.economicallySupported}
                        onChange={(e) =>
                          updateRow(row.key, { economicallySupported: e.target.checked })
                        }
                      />
                      <span>
                        この子を経済的に養っている（監護相当・生計費の負担がある）
                      </span>
                    </label>
                  )}
                </div>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => removeRow(row.key)}
                    aria-label={`第${i + 1}子を削除`}
                  >
                    削除
                  </Button>
                )}
              </div>
              {category && (
                <p className="mt-2 text-sm text-ink-muted">区分: {CATEGORY_LABEL[category]}</p>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="secondary" onClick={addRow}>
        + 子どもを追加
      </Button>

      {calc && !calc.ok && (
        <Callout tone="caution">
          <ul className="list-disc pl-4">
            {calc.errors.map((e, i) => (
              <li key={i}>
                第{e.index + 1}子: {e.message}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      {calc && calc.ok && (
        <>
          <ResultCard
            label="世帯合計月額"
            value={fmt(calc.result.totalMonthly)}
            unit="円/月"
            note={`年額 ${fmt(calc.result.totalAnnual)}円 ／ 1回あたり ${fmt(calc.result.perPaymentAmount)}円（偶数月年6回のうち1回分）`}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="py-2 pr-3">子</th>
                  <th className="py-2 pr-3">区分</th>
                  <th className="py-2 pr-3">多子カウント順位</th>
                  <th className="py-2 pr-3">月額</th>
                </tr>
              </thead>
              <tbody>
                {calc.result.children.map((c) => (
                  <tr key={c.index} className="border-b border-line/50">
                    <td className="py-2 pr-3">第{c.index + 1}子</td>
                    <td className="py-2 pr-3">{CATEGORY_LABEL[c.ageCategory]}</td>
                    <td className="py-2 pr-3">
                      {c.countedForRanking ? `${c.rank}人目` : "カウント対象外"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {c.isRecipient ? `${fmt(c.monthlyAmount)}円` : "対象外（0円）"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(!calc || filledRows.length === 0) && (
        <Callout>お子さまの生年月日を入力すると、その場で月額を計算します。</Callout>
      )}

      <Callout tone="caution">{JIDO_TEATE_DISCLAIMER}</Callout>
    </div>
  );
}
