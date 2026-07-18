"use client";

import { useState } from "react";
import { DateField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcYuukyuuFuyoNissuu,
  fmtDate,
  EMPLOYMENT_TYPE_LABELS,
  type EmploymentType,
  MANDATORY_5DAYS_THRESHOLD,
  MANDATORY_5DAYS_REQUIRED_DAYS,
  PRESCRIPTION_YEARS,
  ELIGIBLE_CONTINUOUS_SERVICE_MONTHS,
  ELIGIBLE_ATTENDANCE_RATE,
} from "./YuukyuuFuyoNissuuKijun.calc";

const attendanceRatePercent = Math.round(ELIGIBLE_ATTENDANCE_RATE * 100);

function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/*
 * 有給残・取得計画（P3-T02）— specs/b-tools/p3-t02-yuukyuu-fuyo-nissuu-kijun.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度事実は data/seido/yuukyuu-fuyo-nissuu-kijun.json のみを参照する（.calc.ts経由）。
 *
 * ★このツールが出さないもの★
 *   実際に何日取得済み・何日残っているかという「利用実績」は入力を受け取らないため出力しない。
 *   出すのは「制度上、いつ・何日付与されるか」という取得計画（スケジュール）にとどめる。
 */

const EMPLOYMENT_OPTIONS: EmploymentType[] = ["standard", "days4", "days3", "days2", "days1"];

export function YuukyuuFuyoNissuuKijun() {
  const today = todayISO();
  const [hireDate, setHireDate] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("standard");
  const [attendanceRateOk, setAttendanceRateOk] = useState(true);

  const entered = hireDate.trim() !== "";
  const result = entered ? calcYuukyuuFuyoNissuu(hireDate, employmentType, attendanceRateOk, today) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="雇い入れ日（入社日）"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
          hint="今の勤務先で働き始めた日を入力してください"
        />
        <SelectField
          label="勤務形態"
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
          hint="週の所定労働時間が30時間以上、または週の所定労働日数が5日以上ならフルタイム相当です"
        >
          {EMPLOYMENT_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {EMPLOYMENT_TYPE_LABELS[key]}
            </option>
          ))}
        </SelectField>
      </div>

      <SelectField
        label="直近1年間（6か月経過時のみ直近6か月間）の出勤率"
        value={attendanceRateOk ? "ok" : "ng"}
        onChange={(e) => setAttendanceRateOk(e.target.value === "ok")}
        hint={`全労働日のうち${attendanceRatePercent}%以上出勤していれば「${attendanceRatePercent}%以上」を選んでください（自己申告で構いません）`}
      >
        <option value="ok">{attendanceRatePercent}%以上出勤した</option>
        <option value="ng">{attendanceRatePercent}%未満だった</option>
      </SelectField>

      {!result && (
        <Callout>雇い入れ日と勤務形態を入れると、有給休暇の付与予定日と日数の計画をその場で表示します。</Callout>
      )}

      {result && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result && result.ok && (
        <div className="space-y-4">
          {result.expired && (
            <Callout tone="caution">
              制度データを更新中のため、この結果は一時的に表示できません。しばらくしてから再度お試しください。
            </Callout>
          )}

          {!result.expired && (
            <>
              {result.isFutureHire && (
                <Callout>
                  雇い入れ日が今日より先の日付になっています。入社前の見込みとして計画を表示します。
                </Callout>
              )}

              {!result.eligible ? (
                <ResultCard
                  label="年次有給休暇の発生"
                  value={`あと${result.daysUntilFirstEligible}日`}
                  unit={`で発生要件①（継続勤務${ELIGIBLE_CONTINUOUS_SERVICE_MONTHS}か月）を満たします`}
                  note={`最初の付与日: ${fmtDate(result.schedule[0]!.basisDate)}（そこまでの出勤率が${attendanceRatePercent}%以上であれば${result.schedule[0]!.grantDays}日が付与されます）`}
                />
              ) : (
                <ResultCard
                  label={
                    result.currentGrantWithheld
                      ? `直近の基準日（出勤率${attendanceRatePercent}%未満のため付与なし）`
                      : `直近の基準日（${result.current!.serviceLabel}）で付与された日数`
                  }
                  value={result.currentGrantWithheld ? "0" : String(result.current!.grantDays)}
                  unit="日"
                  note={`基準日: ${fmtDate(result.current!.basisDate)}${
                    result.current!.subjectToMandatory5Days
                      ? "／年5日の時季指定義務の対象です"
                      : `／付与日数が${MANDATORY_5DAYS_THRESHOLD}日未満のため年5日の時季指定義務の対象外です`
                  }`}
                />
              )}

              {result.currentGrantWithheld && (
                <Callout tone="caution">
                  直近の基準期間の出勤率が{attendanceRatePercent}
                  %未満だったため、この基準日での新たな付与はありません。ただし
                  <strong>継続勤務年数はリセットされません</strong>
                  。次の基準期間に{attendanceRatePercent}
                  %以上出勤すれば、その時点の継続勤務年数に応じた日数が通常どおり付与されます。
                </Callout>
              )}

              <div className="rounded-card border border-line p-4 text-sm sm:text-base">
                <p className="font-medium">次の基準日の見込み</p>
                <p className="mt-1 text-ink-muted">
                  {fmtDate(result.next.basisDate)}（{result.next.serviceLabel}
                  相当）に、その日までの出勤率が{attendanceRatePercent}
                  %以上であれば
                  <strong className="text-ink">{result.next.grantDays}日</strong>
                  が付与される見込みです。
                  {result.next.subjectToMandatory5Days &&
                    "この日数は年5日の時季指定義務の対象になります。"}
                </p>
              </div>

              <div className="overflow-x-auto rounded-card border border-line p-4 text-sm sm:text-base">
                <p className="font-medium">取得計画（雇い入れ日からの基準日と付与日数の一覧）</p>
                <table className="mt-2 w-full min-w-[28rem] text-left">
                  <thead>
                    <tr className="text-ink-muted">
                      <th className="pb-1 pr-2 font-normal">継続勤務年数</th>
                      <th className="pb-1 pr-2 font-normal">基準日</th>
                      <th className="pb-1 pr-2 font-normal">付与日数</th>
                      <th className="pb-1 font-normal">年5日義務</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row) => (
                      <tr
                        key={row.index}
                        className={row.isReached ? "text-ink" : "text-ink-muted"}
                      >
                        <td className="py-1 pr-2">{row.serviceLabel}</td>
                        <td className="py-1 pr-2 tabular-nums">{fmtDate(row.basisDate)}</td>
                        <td className="py-1 pr-2 tabular-nums">{row.grantDays}日</td>
                        <td className="py-1">{row.subjectToMandatory5Days ? "対象" : "対象外"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-ink-muted">
                  6年6か月以降は、以後1年ごとに同じ日数（{result.schedule[6]!.grantDays}
                  日）が繰り返し付与されます。
                </p>
              </div>

              <Callout>
                年次有給休暇は、①雇い入れの日から継続勤務{ELIGIBLE_CONTINUOUS_SERVICE_MONTHS}
                か月、②その期間の全労働日の{attendanceRatePercent}
                %以上出勤、の両方を満たすと発生します。年5日以上（{MANDATORY_5DAYS_THRESHOLD}
                日以上）付与される方は、使用者が基準日から1年以内に労働者ごとに時季を指定して
                {MANDATORY_5DAYS_REQUIRED_DAYS}
                日を取得させる義務があります（既に自分で5日以上取得・請求している場合は不要です）。繰り越した年次有給休暇の請求権は
                {PRESCRIPTION_YEARS}
                年で時効消滅するため、保有できるのは当年度分と前年度分の合計が上限です。
              </Callout>

              <Callout tone="caution">
                このツールは「制度上、いつ・何日付与されるか」という計画までを示すもので、実際に何日取得済みかは記録していません（利用実績の入力を受け付けていないため）。実際の残日数・繰越し・時効消滅の管理は、勤務先の給与明細や就業規則の記載を必ずご確認ください。出勤率も自己申告のため、正確な要件充足は勤務先にご確認ください。
              </Callout>
            </>
          )}
        </div>
      )}
    </div>
  );
}
