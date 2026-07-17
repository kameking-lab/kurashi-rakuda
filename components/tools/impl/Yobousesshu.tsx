"use client";

import { useState } from "react";
import { DateField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calculateYobousesshu,
  YOBOUSESSHU_DISCLAIMER,
  type Sex,
  type VaccineResult,
  type VaccineStatus,
} from "./Yobousesshu.calc";

/*
 * 予防接種スケジューラー（Q3-06）。
 * 生年月日（必須）・性別（HPV欄の表示切り替えにのみ使用）を入力すると、
 * 定期接種（A類疾病）全ワクチンの「制度上の標準的な対象時期」を一覧表示する。
 *
 * ★YMYL上、本コンポーネントは「受けるべきかどうか」の判断・助言を一切行わない。
 * 表示するのは制度上のカレンダー情報のみ（specs/b-tools/18-vaccination-scheduler.md）。
 */

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "unspecified", label: "指定しない" },
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
];

const STATUS_BADGE_CLASS: Record<VaccineStatus, string> = {
  before: "bg-sand-soft text-sand-strong",
  within: "bg-brand-soft text-brand-strong",
  ended: "border border-caution/40 text-caution",
  "male-not-applicable": "bg-line text-ink-muted",
};

function StatusBadge({ status, label }: { status: VaccineStatus; label: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE_CLASS[status]}`}
    >
      {label}
    </span>
  );
}

function VaccineRow({ v }: { v: VaccineResult }) {
  return (
    <div className="rounded-card border border-line p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{v.name}</p>
          <p className="text-sm text-ink-muted">{v.disease}</p>
        </div>
        <StatusBadge status={v.status} label={v.statusLabel} />
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-muted">対象年齢</dt>
          <dd>{v.ageRangeLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-muted">回数・間隔</dt>
          <dd>{v.doseLabel}</dd>
        </div>
      </dl>

      {v.doseEstimates.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {v.doseEstimates.map((d) => (
            <li key={d.doseNumber}>
              {v.doseEstimates.length > 1 ? `${d.doseNumber}回目の目安: ` : "目安: "}
              {d.label}
            </li>
          ))}
        </ul>
      )}

      {v.note && <p className="mt-2 text-sm text-ink-muted">{v.note}</p>}
      {v.catchupNote && (
        <p className="mt-2 text-sm text-ink-muted">{v.catchupNote}</p>
      )}
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Yobousesshu() {
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex>("unspecified");

  const calc =
    birthDate.trim() === ""
      ? null
      : calculateYobousesshu({ birthDate, sex });

  return (
    <div className="space-y-4">
      <Callout>{YOBOUSESSHU_DISCLAIMER[0]}</Callout>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="お子さまの生年月日"
          value={birthDate}
          max={todayISO()}
          onChange={(e) => setBirthDate(e.target.value)}
          hint="必須。0〜18歳（19歳の誕生日前日まで）が対象です"
        />
        <SelectField
          label="性別（HPV欄の表示切り替えにのみ使用）"
          value={sex}
          onChange={(e) => setSex(e.target.value as Sex)}
        >
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>

      {!calc && (
        <Callout>生年月日を入力すると、その場で定期接種のスケジュールを表示します。</Callout>
      )}

      {calc && !calc.ok && <Callout tone="caution">{calc.error}</Callout>}

      {calc && calc.ok && (
        <>
          <ResultCard
            label="お子さまの年齢"
            value={calc.ageSummary.label}
            note={`準拠年度: ${calc.basisYear}`}
          />

          <div className="space-y-3">
            {calc.vaccines.map((v) => (
              <VaccineRow key={v.id} v={v} />
            ))}
          </div>
        </>
      )}

      <div className="space-y-2">
        {YOBOUSESSHU_DISCLAIMER.slice(1).map((p, i) => (
          <Callout key={i} tone="caution">
            {p}
          </Callout>
        ))}
      </div>
    </div>
  );
}
