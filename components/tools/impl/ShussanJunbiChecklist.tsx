"use client";

import { useState } from "react";
import { DateField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcShussanJunbiChecklist,
  formatJapaneseDate,
  todayISO,
} from "./ShussanJunbiChecklist.calc";

/*
 * 出産準備チェックリスト（予定日逆算）（P2-T16）。
 * 出産予定日を入力すると、今日の日付から「安定期／臨月／産後」の時期区分を判定し、
 * 時期別の出産準備チェックリスト（一般的な目安）を表示する。
 * すべてクライアント内で即時計算（送信・登録なし）。医学的な判断は行わない。
 */

export function ShussanJunbiChecklist() {
  const [dueDate, setDueDate] = useState("");

  const today = todayISO();
  const result = dueDate ? calcShussanJunbiChecklist(dueDate, today) : null;

  return (
    <div className="space-y-4">
      <DateField
        label="出産予定日"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        hint="母子健康手帳や産院で伝えられた出産予定日を入れてね"
      />

      {!result ? (
        <Callout>出産予定日を入れると、その場で今の時期に合わせた準備リストを表示します。</Callout>
      ) : !result.ok ? (
        <Callout tone="caution">{result.message}</Callout>
      ) : (
        <div className="space-y-4">
          <ResultCard
            label="今の時期"
            value={result.period}
            unit={
              result.overdue
                ? `出産予定日（${formatJapaneseDate(result.dueDate)}）を${-result.daysUntilDue}日経過`
                : `出産予定日（${formatJapaneseDate(result.dueDate)}）まであと${result.daysUntilDue}日`
            }
            note={
              result.period === "安定期"
                ? `臨月（${formatJapaneseDate(result.ringetsuStartDate)}）まであと${result.daysUntilRingetsu}日`
                : result.period === "臨月"
                  ? `臨月（${formatJapaneseDate(result.ringetsuStartDate)}）に入っています`
                  : "出産予定日を過ぎています。実際の出産日を踏まえて参考にしてね"
            }
          />

          <div className="space-y-3">
            {result.categories.map((category) => (
              <div
                key={category.id}
                className={`rounded-card border p-4 text-sm sm:text-base ${
                  category.isCurrent ? "border-brand" : "border-line"
                }`}
              >
                <p className="font-medium">
                  {category.label}
                  {category.isCurrent && (
                    <span className="ml-2 text-xs font-normal text-ink-muted">
                      いまの時期に近いよ
                    </span>
                  )}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                  {category.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Callout>
            このチェックリストは一般的に知られている出産準備の目安をまとめたもので、公的機関が定めた基準や統計調査の結果ではないよ。必要なものは体調・地域・産院の方針によって変わるから、母子健康手帳や産院からの案内もあわせて確認してね。
          </Callout>
          {result.period === "産後" && (
            <Callout tone="caution">
              実際の出産日は予定日どおりとは限らないよ。ここでは出産予定日を基準に計算しているから、実際の出産日を踏まえて参考にしてね。
            </Callout>
          )}
        </div>
      )}
    </div>
  );
}
