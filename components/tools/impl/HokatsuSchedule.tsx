"use client";

import { useEffect, useId, useState } from "react";
import { DateField, SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import {
  daysInMonth,
  generateSchedule,
  needsFiscalYearBoundaryNote,
  parseDate,
  parseYearMonth,
  suggestEntryType,
  validateMunicipalityDeadline,
  validateTargetMonth,
  HOKATSU_DISCLAIMER,
  type EntryType,
  type FacilityType,
  type Milestone,
  type SimpleDate,
} from "./HokatsuSchedule.calc";

/*
 * 保活スケジュールメーカー（Q3-11）。
 * 仕様: specs/b-tools/23-hokatsu-schedule-maker.md
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 基準日は「今日」固定（SSR/SSGのキャッシュとずれないよう、マウント後にクライアント側で取得する）。
 * 計算ロジック本体は HokatsuSchedule.calc.ts の純関数（generateSchedule 等）。
 */

function todayAsSimpleDate(): SimpleDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toMonthInputValue(d: SimpleDate): string {
  return `${d.year}-${pad2(d.month)}`;
}

function fmtYM(d: SimpleDate): string {
  return `${d.year}年${d.month}月`;
}

function fmtYMD(d: SimpleDate): string {
  return `${d.year}年${d.month}月${d.day}日`;
}

function isWholeMonthRange(start: SimpleDate, end: SimpleDate): boolean {
  return (
    start.year === end.year &&
    start.month === end.month &&
    start.day === 1 &&
    end.day === daysInMonth(end.year, end.month)
  );
}

/** マイルストーンの目安時期を表示用に整形する（年月のみ／年月日／範囲表記） */
function formatPeriod(m: Milestone): string {
  if (m.start.year === m.end.year && m.start.month === m.end.month && m.start.day === m.end.day) {
    return m.start.day === 1 ? fmtYM(m.start) : fmtYMD(m.start);
  }
  if (isWholeMonthRange(m.start, m.end)) return fmtYM(m.start);
  return `${fmtYM(m.start)}〜${fmtYM(m.end)}`;
}

/** 入園希望年月を選ぶための月選択欄（既存の Field.tsx に MonthField がないためローカルで実装） */
function MonthField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="month"
        className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-12 items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-line"
      />
      {label}
    </label>
  );
}

export function HokatsuSchedule() {
  const [today, setToday] = useState<SimpleDate | null>(null);
  const [targetMonthInput, setTargetMonthInput] = useState("");
  const [manualEntryType, setManualEntryType] = useState<EntryType | null>(null);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [facilityType, setFacilityType] = useState<FacilityType>("ninka");
  const [hasSibling, setHasSibling] = useState(false);

  useEffect(() => {
    setToday(todayAsSimpleDate());
  }, []);

  const targetMonth = targetMonthInput ? parseYearMonth(targetMonthInput) : null;

  // 申込み区分: ユーザーが手動で選び直していなければ、入園希望月から自動提案する
  // （target_month が4月以外なら midyear。仕様書「入力仕様」参照）
  const entryType: EntryType =
    manualEntryType ?? (targetMonth ? suggestEntryType(targetMonth) : "april");
  const entryTypeTouched = manualEntryType !== null;

  if (!today) {
    // マウント直後（クライアント側の今日の日付を取得するまで）は何も計算しない
    return <Callout>読み込み中です。</Callout>;
  }

  const minMonth = toMonthInputValue(addMonthsForInput(today, 1));
  const maxMonth = toMonthInputValue(addMonthsForInput(today, 18));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MonthField
          label="入園希望年月"
          hint={`${minMonth} 〜 ${maxMonth} の範囲で選べます`}
          value={targetMonthInput}
          onChange={setTargetMonthInput}
        />
        <SelectField
          label="申込み区分"
          value={entryType}
          onChange={(e) => setManualEntryType(e.target.value as EntryType)}
        >
          <option value="april">4月一斉入園</option>
          <option value="midyear">年度途中・随時入園</option>
        </SelectField>
        <DateField
          label="お住まいの自治体の公表締切日（任意）"
          value={deadlineInput}
          onChange={(e) => setDeadlineInput(e.target.value)}
          hint="入力すると一次申込み締切以降の目安の精度が上がります"
        />
        <SelectField
          label="施設種別"
          value={facilityType}
          onChange={(e) => setFacilityType(e.target.value as FacilityType)}
        >
          <option value="ninka">認可保育所・認定こども園</option>
          <option value="other">認可外・企業主導型など</option>
        </SelectField>
      </div>

      <CheckboxField
        label="きょうだいが同一施設に在園中である"
        checked={hasSibling}
        onChange={setHasSibling}
      />

      {!targetMonthInput && (
        <Callout>入園希望年月を選ぶと、その場で保活スケジュールを逆算します。</Callout>
      )}

      {targetMonthInput && !targetMonth && (
        <Callout tone="caution">入園希望年月の形式が正しくありません。</Callout>
      )}

      {targetMonth && (
        <ScheduleResult
          targetMonth={targetMonth}
          entryType={entryType}
          entryTypeTouched={entryTypeTouched}
          deadlineInput={deadlineInput}
          facilityType={facilityType}
          hasSibling={hasSibling}
          today={today}
        />
      )}
    </div>
  );
}

/** UI表示専用: n か月後の SimpleDate（min/max month input 用。厳密な暦月演算は calc.ts 側の addMonths を使うが、
 * ここでは入力欄のヒント表示のみに使うため簡易実装で十分） */
function addMonthsForInput(date: SimpleDate, n: number): SimpleDate {
  const idx = date.year * 12 + (date.month - 1) + n;
  const y = Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12 + 1;
  return { year: y, month: m, day: 1 };
}

function ScheduleResult({
  targetMonth,
  entryType,
  entryTypeTouched,
  deadlineInput,
  facilityType,
  hasSibling,
  today,
}: {
  targetMonth: SimpleDate;
  entryType: EntryType;
  entryTypeTouched: boolean;
  deadlineInput: string;
  facilityType: FacilityType;
  hasSibling: boolean;
  today: SimpleDate;
}) {
  const validation = validateTargetMonth(targetMonth, today);
  if (!validation.ok) {
    return <Callout tone="caution">{validation.error}</Callout>;
  }

  const deadline = deadlineInput ? parseDate(deadlineInput) : null;
  let deadlineError: string | null = null;
  if (deadlineInput && !deadline) {
    deadlineError = "自治体締切日の形式が正しくありません。";
  } else if (deadline) {
    const v = validateMunicipalityDeadline(deadline, targetMonth);
    if (!v.ok) deadlineError = v.error ?? null;
  }

  if (deadlineError) {
    return <Callout tone="caution">{deadlineError}</Callout>;
  }

  const { milestones, urgentAlert } = generateSchedule({
    targetMonth,
    entryType,
    municipalityDeadline: deadline,
    today,
  });

  const showAprilHint = entryTypeTouched && entryType === "april" && targetMonth.month !== 4;
  const fiscalYearNote = needsFiscalYearBoundaryNote(targetMonth, entryType);

  return (
    <div className="space-y-4">
      {urgentAlert && (
        <Callout tone="caution">
          残り期間が短いため、一次・二次申込みの標準的な時期を過ぎている可能性が高いです。お住まいの自治体の保育課へ直接、二次募集・随時募集の有無を問い合わせてください。
        </Callout>
      )}

      {showAprilHint && (
        <Callout>
          {targetMonth.month}月入園は随時入園が一般的です。4月一斉入園として計算していますが、必要に応じて申込み区分を変更してください。
        </Callout>
      )}

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <p className="font-medium">入力内容</p>
        <p className="mt-1 text-ink-muted">
          入園希望年月: {fmtYM(targetMonth)} ／ 申込み区分:{" "}
          {entryType === "april" ? "4月一斉入園" : "年度途中・随時入園"} ／ 自治体締切:{" "}
          {deadline ? fmtYMD(deadline) : "未入力（全国目安値で計算）"}
        </p>
      </div>

      <ul className="space-y-3">
        {milestones.map((m) => (
          <li
            key={m.key}
            className={`rounded-card border p-4 ${
              m.status === "past" ? "border-caution/40" : "border-line"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-ink-muted">
                {m.status === "past" ? "既に目安時期を過ぎています" : "今後"}
              </p>
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatPeriod(m)}（目安）</p>
            <p className="mt-1 text-sm text-ink-muted">{m.description}</p>
          </li>
        ))}
      </ul>

      {facilityType === "other" && (
        <Callout>
          本ツールの逆算ロジックは主に認可施設を想定しています。認可外・企業主導型は施設ごとに申込方法が異なるため、各施設に直接ご確認ください。
        </Callout>
      )}

      {hasSibling && (
        <Callout>
          きょうだい同時入所・優先利用調整の扱いは自治体ごとに異なります。詳細はお住まいの自治体にご確認ください。
        </Callout>
      )}

      {fiscalYearNote && (
        <Callout>
          1〜3月入園をご希望の場合は、年度の切り替え時期（4月）の運用が自治体により異なります。
        </Callout>
      )}

      <Callout tone="caution">{HOKATSU_DISCLAIMER}</Callout>
    </div>
  );
}
