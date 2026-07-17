"use client";

import { useEffect, useState } from "react";
import { DateField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcSangoTetsuzuki,
  validateBirthDate,
  isBirthDateFarInFuture,
  isBirthDateVeryOld,
  SHUSSHO_NATIONALITY_WARNING,
  SHUSSHO_LATE_FILING_STILL_ACCEPTED,
  SHUSSHO_PENALTY_AMOUNT,
  JIDO_TEATE_START_MONTH_NOTE,
  type BirthLocation,
  type SangoTetsuzukiResult,
} from "./SangoTetsuzukiChecklist.calc";

/*
 * 産後手続きリスト生成（期限つき）（P2-T18）
 * — specs/b-tools/p2-t18-sango-tetsuzuki-checklist.md
 *
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値は data/seido/shussho-todoke-kigen.json・jido-teate.json・ikukyu-kyufu.json
 * のみを参照する（SangoTetsuzukiChecklist.calc.ts 経由）。
 *
 * ★このUIが必ず出すもの★
 *   - 期限日そのもの（断定的に計算するが、煽り口調にはしない）
 *   - 国外出生時の国籍留保届の警告
 *   - 期限を過ぎても出生届は必ず受理される旨（誤解防止）
 */

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function fmtJa(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

export function SangoTetsuzukiChecklist() {
  const [today, setToday] = useState<string | null>(null);
  const [birthDateInput, setBirthDateInput] = useState("");
  const [location, setLocation] = useState<BirthLocation>("domestic");

  useEffect(() => {
    setToday(todayIso());
  }, []);

  if (!today) {
    return <Callout>読み込み中です。</Callout>;
  }

  const validation = birthDateInput ? validateBirthDate(birthDateInput) : null;

  return (
    <div className="space-y-5">
      <DateField
        label="出生日（出産日）"
        value={birthDateInput}
        hint="赤ちゃんが生まれた日を入れてね"
        onChange={(e) => setBirthDateInput(e.target.value)}
      />

      <SelectField
        label="出生した場所"
        value={location}
        onChange={(e) => setLocation(e.target.value as BirthLocation)}
        hint="出生届の届出期間（国内14日／国外3か月）の判定にのみ使うよ"
      >
        <option value="domestic">国内で出生</option>
        <option value="abroad">国外で出生</option>
      </SelectField>

      {!birthDateInput && (
        <Callout>出生日を入れると、その場で手続きの期限日リストを表示します。</Callout>
      )}

      {birthDateInput && validation && !validation.ok && (
        <Callout tone="caution">{validation.error}</Callout>
      )}

      {birthDateInput && validation?.ok && (
        <ResultView birthDate={birthDateInput} location={location} today={today} />
      )}
    </div>
  );
}

function ResultView({
  birthDate,
  location,
  today,
}: {
  birthDate: string;
  location: BirthLocation;
  today: string;
}) {
  const result: SangoTetsuzukiResult = calcSangoTetsuzuki({ birthDate, location, today });

  const farFuture = isBirthDateFarInFuture(birthDate, today);
  const veryOld = isBirthDateVeryOld(birthDate, today);

  if (result.expired) {
    return (
      <Callout tone="caution">
        制度データを更新中のため、この結果は一時的に表示できません。しばらくしてから再度お試しください。
      </Callout>
    );
  }

  const next = result.procedures[0];

  return (
    <div className="space-y-4">
      {farFuture && (
        <Callout tone="caution">
          出生日が今日から1年以上先になっています。入力値をご確認ください。
        </Callout>
      )}
      {veryOld && (
        <Callout tone="caution">
          出生日が今日から2年以上前になっています。多くの手続きで期限を過ぎている可能性があります。
        </Callout>
      )}

      {next && (
        <ResultCard
          label="次の期限"
          value={fmtJa(next.deadlineDate)}
          unit={next.label}
          note={
            next.overdue
              ? `期限を${-next.daysRemaining}日過ぎています`
              : next.daysRemaining === 0
                ? "今日が期限です"
                : `あと${next.daysRemaining}日`
          }
        />
      )}

      <ol className="space-y-3">
        {result.procedures.map((p, i) => (
          <li
            key={p.key}
            className={`rounded-card border p-4 text-sm sm:text-base ${
              p.overdue ? "border-caution/40" : "border-line"
            }`}
          >
            <p className="font-medium">
              <span className="mr-2 text-ink-muted">{i + 1}.</span>
              {p.label}
            </p>
            <p className="mt-1">
              期限：<strong>{fmtJa(p.deadlineDate)}</strong>
              {p.overdue ? (
                <span className="ml-2 text-sm">（{-p.daysRemaining}日超過）</span>
              ) : p.daysRemaining === 0 ? (
                <span className="ml-2 text-sm">（今日が期限）</span>
              ) : (
                <span className="ml-2 text-sm text-ink-muted">（あと{p.daysRemaining}日）</span>
              )}
            </p>
            <p className="mt-1 text-ink-muted">
              {p.periodNote}。{p.kisanbiNote}。
            </p>
            <p className="mt-1 text-ink-muted">{p.description}</p>
            <p className="mt-1 text-xs text-ink-muted">根拠: {p.legalBasis}</p>
          </li>
        ))}
      </ol>

      {location === "abroad" && (
        <Callout tone="caution">{SHUSSHO_NATIONALITY_WARNING}</Callout>
      )}

      <Callout>
        <p>
          出生届は、期限を過ぎても市区町村長が必ず受理します（{SHUSSHO_LATE_FILING_STILL_ACCEPTED}
          ）。正当な理由なく期限内に届け出ないと過料（上限{SHUSSHO_PENALTY_AMOUNT.toLocaleString()}
          円）の対象になることがありますが、届出自体をあきらめる必要はありません。遅れてしまった場合も、気づいた時点でできるだけ早く届け出てください。
        </p>
      </Callout>

      <Callout>
        <p>
          児童手当の15日特例の期限を過ぎた場合、原則どおり「申請した月の翌月分から」の支給になります（{JIDO_TEATE_START_MONTH_NOTE}
          ）。出生月・翌月分にさかのぼって支給されるわけではないため、早めの手続きがおすすめです。
        </p>
      </Callout>
    </div>
  );
}
