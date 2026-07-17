"use client";

import { useEffect, useState } from "react";
import { DateField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { todayJst, formatJaDate } from "@/lib/tools/seido";
import {
  calcFukkiBi,
  validateBirthDate,
  RATE_FIRST,
  RATE_AFTER,
  RATE_SWITCH_DAYS,
  BENEFIT_EXTENSION_REQUIREMENT_1,
  BENEFIT_EXTENSION_REQUIREMENT_2,
  BENEFIT_EXTENSION_REQUIREMENT_3,
  NURSERY_UNAVAILABLE_FIRST,
  NURSERY_UNAVAILABLE_SECOND,
  OTHER_EXTENSION_REASONS,
  TWO_SEPARATE_SYSTEMS_NOTE,
  COPY_BEFORE_APPLYING_NOTE,
  FRAUD_WARNING,
  type ExtensionIntent,
  type ReturnCandidate,
} from "./FukkiBiKeisan.calc";

/*
 * 復帰日計算（P2-T34）— specs/b-tools/p2-t34-fukki-bi-keisan.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 産休・育休の各期限、延長した場合の期限、それぞれに対応する複数の「復帰候補日」を
 * 一覧で提示する。金額計算は行わない（金額は「産休育休まるごとお金シミュレーター」の範囲）。
 */

const pct = (r: number) => `${Math.round(r * 100)}%`;

const INTENT_OPTIONS: { value: ExtensionIntent; label: string }[] = [
  { value: "none", label: "延長しない（1歳で復帰したい）" },
  { value: "until18m", label: "1歳6か月まで延長したい" },
  { value: "until24m", label: "2歳まで延長したい" },
];

export function FukkiBiKeisan() {
  const [today, setToday] = useState<string | null>(null);
  const [birthInput, setBirthInput] = useState("");
  const [extensionIntent, setExtensionIntent] = useState<ExtensionIntent>("none");

  useEffect(() => {
    setToday(todayJst());
  }, []);

  if (!today) {
    // マウント直後（クライアント側の今日の日付を取得するまで）は何も計算しない
    return <Callout>読み込み中です。</Callout>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="出産日（未定の場合は出産予定日）"
          value={birthInput}
          onChange={(e) => setBirthInput(e.target.value)}
          hint="実際の出産日が分かったら入れ直してください"
        />
        <SelectField
          label="育休を延長する意向"
          value={extensionIntent}
          onChange={(e) => setExtensionIntent(e.target.value as ExtensionIntent)}
          hint="保育園に入れなかった場合などに限り延長できます。候補は延長しない場合もすべて表示します"
        >
          {INTENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>

      {!birthInput && (
        <Callout>出産日（出産予定日）を入れると、その場で各期限と復帰候補日を計算します。</Callout>
      )}

      {birthInput && <FukkiBiKeisanResult birthDate={birthInput} today={today} extensionIntent={extensionIntent} />}
    </div>
  );
}

function FukkiBiKeisanResult({
  birthDate,
  today,
  extensionIntent,
}: {
  birthDate: string;
  today: string;
  extensionIntent: ExtensionIntent;
}) {
  const validation = validateBirthDate(birthDate, today);
  if (!validation.ok) {
    return <Callout tone="caution">{validation.error}</Callout>;
  }

  const result = calcFukkiBi({ birthDate, extensionIntent });
  const recommended =
    result.candidates.find((c) => c.matchesIntent) ??
    result.candidates.find((c) => c.key === "principal")!;

  return (
    <div className="space-y-5">
      <ResultCard
        label="入力条件に合う復帰候補日の目安"
        value={formatJaDate(recommended.returnDate)}
        note={`${recommended.label}。下の一覧で他の選択肢も確認できます。`}
      />

      <div>
        <h2 className="text-base font-bold">各期限</h2>
        <ul className="mt-2 space-y-2">
          {result.deadlines.map((d) => (
            <li key={d.key} className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-medium">{d.label}</p>
                <p className="text-lg font-bold tabular-nums">{formatJaDate(d.date)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink-muted">
          産後休業終了日は出産日を起点とした目安です。育休の各期限は「◯歳に達する日（誕生日の前日）」で数えます。
        </p>
      </div>

      <div>
        <h2 className="text-base font-bold">復帰候補日の一覧</h2>
        <ul className="mt-2 space-y-3">
          {result.candidates.map((c) => (
            <CandidateRow key={c.key} candidate={c} />
          ))}
        </ul>
      </div>

      <Callout>
        産後6週間（{formatJaDate(result.postnatalSixWeekDate)}）を経過した後は、本人が請求し医師が支障ないと認めた業務に限り就業できる特例が労働基準法にあります。ただしこれは産休や育児休業給付とは別の話で、実際に働く場合は出産手当金の対象から外れる可能性があります。検討する場合は必ず勤務先・医師にご相談ください。
      </Callout>

      <ExtensionRequirementsNote />

      <Callout tone="caution">
        {TWO_SEPARATE_SYSTEMS_NOTE}
        育児休業そのものの延長（勤務先への申出）と、育児休業給付金の支給対象期間の延長（ハローワークへの申請）は別々に手続きが必要です。
      </Callout>

      <Callout>
        この結果は制度上の一般的な目安です。育休の延長には保育園に入れなかった等の要件を満たす必要があり、勤務先の規定（法律を上回る独自の育休制度等）により実際の期限が異なる場合があります。必ず勤務先の人事担当・ハローワークにご確認ください。
      </Callout>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: ReturnCandidate }) {
  return (
    <li className="rounded-card border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">
          {candidate.label}
          {candidate.matchesIntent && (
            <span className="ml-2 rounded-full bg-sand-soft px-2 py-0.5 text-xs">入力した意向に対応</span>
          )}
        </p>
        <p className="text-lg font-bold tabular-nums">{formatJaDate(candidate.returnDate)}</p>
      </div>

      {candidate.leave ? (
        <div className="mt-2 space-y-1 text-sm text-ink-muted">
          <p>
            育休の対象日数は{candidate.leave.totalDays}日です。育児休業給付金は、休業開始から通算
            {RATE_SWITCH_DAYS}日目まで給付率{pct(RATE_FIRST)}（{candidate.leave.days67}日）、
            {candidate.leave.days50 > 0
              ? `それ以降は給付率${pct(RATE_AFTER)}（${candidate.leave.days50}日）に下がります。`
              : `${RATE_SWITCH_DAYS}日以内に収まるため、給付率は${pct(RATE_FIRST)}のまま復帰します。`}
            {candidate.leave.rateSwitchDate && (
              <> 給付率が切り替わるのは{formatJaDate(candidate.leave.rateSwitchDate)}です。</>
            )}
          </p>
          <p>
            保育園入園の申込みは、一般的な目安として{formatJaDate(candidate.nurseryCheckWindow.from)}〜
            {formatJaDate(candidate.nurseryCheckWindow.to)}頃から検討を始めると安心です（自治体により大きく異なります）。
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          育児休業給付金は発生しません（産後休業の出産手当金までが対象です）。
        </p>
      )}

      {candidate.requiresExtension && (
        <p className="mt-2 text-sm font-medium">
          ★育休の延長手続きが必要です。保育園に入れなかった等の要件を満たさない場合、この日までに復帰できないことがあります。
        </p>
      )}
    </li>
  );
}

function ExtensionRequirementsNote() {
  return (
    <div className="rounded-card border border-caution/40 p-4 text-sm sm:text-base">
      <p className="font-bold">育休を延長するための要件（1歳6か月・2歳とも共通の考え方）</p>
      <p className="mt-2">
        <strong>育児休業そのものの延長</strong>
        （育児・介護休業法）は、次のような場合に限り認められます。
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">
        <li>{NURSERY_UNAVAILABLE_FIRST}</li>
        <li>{NURSERY_UNAVAILABLE_SECOND}</li>
        <li>その他の事由: {OTHER_EXTENSION_REASONS}</li>
      </ul>
      <p className="mt-3">
        <strong>育児休業給付金の支給対象期間の延長</strong>
        （雇用保険法）は、次の3つの要件をすべて満たす必要があります。2025年4月から審査が厳格化されています。
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">
        <li>{BENEFIT_EXTENSION_REQUIREMENT_1}</li>
        <li>{BENEFIT_EXTENSION_REQUIREMENT_2}</li>
        <li>{BENEFIT_EXTENSION_REQUIREMENT_3}</li>
      </ul>
      <p className="mt-3 text-ink-muted">{COPY_BEFORE_APPLYING_NOTE}</p>
      <p className="mt-2 text-ink-muted">{FRAUD_WARNING}</p>
    </div>
  );
}
