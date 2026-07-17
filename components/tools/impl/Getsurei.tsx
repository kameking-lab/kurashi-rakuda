"use client";

import { useEffect, useState } from "react";
import { DateField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcBasicAge,
  calcCorrectedAge,
  calcMilestones,
  calcPrematureDays,
  compareDates,
  isBirthDateTooOld,
  isDueDateFarFromBirth,
  parseDate,
  validateBirthDate,
  type SimpleDate,
} from "./Getsurei.calc";

/*
 * 月齢計算（Q3-05）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 基準日は「今日」固定（SSR/SSGのキャッシュとずれないよう、マウント後にクライアント側で取得する）。
 */

function todayAsSimpleDate(): SimpleDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toInputValue(d: SimpleDate): string {
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

function fmtDate(d: SimpleDate): string {
  return `${d.year}年${d.month}月${d.day}日`;
}

export function Getsurei() {
  const [today, setToday] = useState<SimpleDate | null>(null);
  const [birthInput, setBirthInput] = useState("");
  const [dueInput, setDueInput] = useState("");

  useEffect(() => {
    setToday(todayAsSimpleDate());
  }, []);

  if (!today) {
    // マウント直後（クライアント側の今日の日付を取得するまで）は何も計算しない
    return <Callout>読み込み中です。</Callout>;
  }

  const baseDate = today;
  const birthDate = birthInput ? parseDate(birthInput) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="生年月日"
          value={birthInput}
          max={toInputValue(baseDate)}
          onChange={(e) => setBirthInput(e.target.value)}
        />
        <DateField
          label="出産予定日（早産児の修正月齢を出す場合のみ）"
          value={dueInput}
          onChange={(e) => setDueInput(e.target.value)}
          hint="任意項目です。入力すると修正月齢も表示します"
        />
      </div>

      {!birthInput && <Callout>生年月日を入れると、その場で計算します。</Callout>}

      {birthInput && !birthDate && (
        <Callout tone="caution">生年月日の形式が正しくありません。</Callout>
      )}

      {birthDate && (
        <GetsureiResult
          birthDate={birthDate}
          baseDate={baseDate}
          dueInput={dueInput}
        />
      )}
    </div>
  );
}

function GetsureiResult({
  birthDate,
  baseDate,
  dueInput,
}: {
  birthDate: SimpleDate;
  baseDate: SimpleDate;
  dueInput: string;
}) {
  const validation = validateBirthDate(birthDate, baseDate);
  if (!validation.ok) {
    return <Callout tone="caution">{validation.error}</Callout>;
  }

  const basic = calcBasicAge(birthDate, baseDate);
  const tooOld = isBirthDateTooOld(birthDate, baseDate);
  const milestones = calcMilestones(birthDate, baseDate);

  const dueDate = dueInput ? parseDate(dueInput) : null;
  let dueError: string | null = null;
  if (dueInput && !dueDate) {
    dueError = "出産予定日の形式が正しくありません。";
  } else if (dueDate && compareDates(dueDate, birthDate) < 0) {
    dueError = "出産予定日は生年月日以降の日付にしてください。";
  }
  const validDue = dueInput && dueDate && !dueError ? dueDate : null;

  return (
    <div className="space-y-4">
      <ResultCard
        label={`${fmtDate(birthDate)}生まれ・${fmtDate(baseDate)}時点`}
        value={`${basic.months}`}
        unit={`か月${basic.monthRemainderDays}日`}
        note={`生後${basic.daysSinceBirth}日／${basic.weeks}週${basic.weekRemainderDays}日`}
      />

      {tooOld && (
        <Callout tone="caution">
          生年月日が基準日から120年以上前です。本ツールは主に乳幼児の月齢計算を想定しているため、結果はご参考程度にご覧ください。
        </Callout>
      )}

      {dueError && <Callout tone="caution">{dueError}</Callout>}

      {validDue && (
        <CorrectedAgeSection birthDate={birthDate} baseDate={baseDate} dueDate={validDue} />
      )}

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <p className="font-medium">節目までの日数（参考）</p>
        <ul className="mt-2 space-y-1 text-ink-muted">
          {milestones.map((m) => (
            <li key={m.label}>
              {m.label}（{fmtDate(m.date)}）:{" "}
              {m.daysRemaining > 0
                ? `あと${m.daysRemaining}日`
                : m.daysRemaining === 0
                  ? "今日です"
                  : `${-m.daysRemaining}日前に迎えました`}
            </li>
          ))}
        </ul>
      </div>

      <Callout>
        この結果は生年月日・出産予定日から計算した目安です。お子さまの発達の評価は乳幼児健診等で医師・保健師にご確認ください。
      </Callout>
    </div>
  );
}

function CorrectedAgeSection({
  birthDate,
  baseDate,
  dueDate,
}: {
  birthDate: SimpleDate;
  baseDate: SimpleDate;
  dueDate: SimpleDate;
}) {
  const corrected = calcCorrectedAge(dueDate, baseDate);
  const prematureDays = calcPrematureDays(birthDate, dueDate);
  const dueFar = isDueDateFarFromBirth(birthDate, dueDate);

  return (
    <div className="space-y-3">
      {corrected.status === "calculated" ? (
        <ResultCard
          label="修正月齢"
          value={`${corrected.months}`}
          unit={`か月${corrected.remainderDays}日`}
        />
      ) : (
        <ResultCard
          label="修正月齢"
          value="0か月未満"
          note={`予定日（${fmtDate(dueDate)}）まであと${corrected.daysUntilDue}日です`}
        />
      )}

      {prematureDays > 0 && (
        <p className="text-sm text-ink-muted">
          出産予定日より{prematureDays}日早く生まれました。
        </p>
      )}

      {dueFar && (
        <Callout tone="caution">
          生年月日と出産予定日の差が大きいようです。入力値をご確認ください。
        </Callout>
      )}

      <Callout>
        修正月齢は早産で生まれたお子さまの発達を考える際の目安の一つとして使われる考え方です。実際の発達評価は医療者にご相談ください。
      </Callout>
    </div>
  );
}
