"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import {
  calculateKaigoShigotoRyouritsu,
  RELATION_OPTIONS,
  DISCLAIMER,
  type RelationOption,
  type YesNoUnsure,
  type SystemStatus,
} from "./KaigoShigotoRyouritsuChecker.calc";

/*
 * 介護と仕事の両立制度チェッカー（P2-T38）。
 * 対象家族との続柄・要介護状態の見込み・雇用形態（勤続年数／週の所定労働日数／
 * 有期契約か）・深夜の同居家族の有無を選ぶと、介護関係の両立支援制度6本について
 * 対象／条件付き（要確認）／対象外をその場で一覧表示する（送信なし・クライアント内計算）。
 */

const YES_NO_OPTIONS: { value: "true" | "false"; label: string }[] = [
  { value: "false", label: "いいえ" },
  { value: "true", label: "はい" },
];

const YES_NO_UNSURE_OPTIONS: { value: YesNoUnsure; label: string }[] = [
  { value: "yes", label: "はい" },
  { value: "no", label: "いいえ" },
  { value: "unsure", label: "わからない" },
];

const STATUS_TONE: Record<SystemStatus, "info" | "caution"> = {
  target: "info",
  conditional: "caution",
  notTarget: "caution",
};

const STATUS_BADGE_CLASS: Record<SystemStatus, string> = {
  target: "bg-result-bg text-result-ink",
  conditional: "border border-caution/40 text-ink",
  notTarget: "border border-line text-ink-muted",
};

export function KaigoShigotoRyouritsuChecker() {
  const [relation, setRelation] = useState<RelationOption | "">("");
  const [careNeedLikely, setCareNeedLikely] = useState<YesNoUnsure | "">("");
  const [lessThanOneYear, setLessThanOneYear] = useState<"true" | "false">("false");
  const [twoOrFewerDaysPerWeek, setTwoOrFewerDaysPerWeek] = useState<"true" | "false">("false");
  const [fixedTermContract, setFixedTermContract] = useState<"true" | "false">("false");
  const [nightCareSubstitute, setNightCareSubstitute] = useState<YesNoUnsure>("no");

  const calc = calculateKaigoShigotoRyouritsu({
    relation: relation === "" ? undefined : relation,
    careNeedLikely: careNeedLikely === "" ? undefined : careNeedLikely,
    lessThanOneYear: lessThanOneYear === "true",
    twoOrFewerDaysPerWeek: twoOrFewerDaysPerWeek === "true",
    fixedTermContract: fixedTermContract === "true",
    nightCareSubstitute,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="対象家族との続柄"
          value={relation}
          onChange={(e) => setRelation(e.target.value as RelationOption)}
          hint="介護をしている（する予定の）ご家族との続柄を選んでください"
        >
          <option value="">選択してください</option>
          {RELATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="要介護状態（2週間以上、常時介護が必要な状態）の見込み"
          value={careNeedLikely}
          onChange={(e) => setCareNeedLikely(e.target.value as YesNoUnsure)}
          hint="介護保険の要介護認定の有無ではなく、実際の状態でお答えください"
        >
          <option value="">選択してください</option>
          {YES_NO_UNSURE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="勤続1年未満ですか"
          value={lessThanOneYear}
          onChange={(e) => setLessThanOneYear(e.target.value as "true" | "false")}
          hint="今の勤務先に引き続き雇用されている期間が1年に満たない場合は「はい」"
        >
          {YES_NO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="週の所定労働日数は2日以下ですか"
          value={twoOrFewerDaysPerWeek}
          onChange={(e) => setTwoOrFewerDaysPerWeek(e.target.value as "true" | "false")}
        >
          {YES_NO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="有期契約（契約社員・パート等の期間の定めがある契約）で働いていますか"
          value={fixedTermContract}
          onChange={(e) => setFixedTermContract(e.target.value as "true" | "false")}
        >
          {YES_NO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="深夜（午後10時〜午前5時）に代わって対象家族を介護できる同居の家族がいますか"
          value={nightCareSubstitute}
          onChange={(e) => setNightCareSubstitute(e.target.value as YesNoUnsure)}
          hint="「深夜業の制限」の判定にのみ使います"
        >
          {YES_NO_UNSURE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </div>

      {!calc.ok && <Callout>{calc.error}</Callout>}

      {calc.ok && (
        <div className="space-y-3">
          {calc.result.map((sys) => (
            <div key={sys.key} className="rounded-card border border-line p-4 text-sm sm:text-base">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{sys.label}</p>
                <span
                  className={`rounded-card px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[sys.status]}`}
                >
                  {sys.statusLabel}
                </span>
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                {sys.numbers.map((n) => (
                  <li key={n}>{n}</li>
                ))}
                {sys.deadline && <li>申出期限の目安: {sys.deadline}</li>}
              </ul>
              {sys.notes.length > 0 && (
                <div className="mt-2">
                  <Callout tone={STATUS_TONE[sys.status]}>
                    <ul className="list-disc space-y-1 pl-4">
                      {sys.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </Callout>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Callout tone="caution">{DISCLAIMER}</Callout>
    </div>
  );
}
