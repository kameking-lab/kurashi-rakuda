"use client";

import { useMemo, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calculate,
  type IncomeMode,
  type PartShiftShunyuuInput,
} from "@/components/tools/impl/PartShiftShunyuuKeisan.calc";
import type { FuyoTarget, EmployerSize, WallResult } from "@/lib/tools/impl/fuyo-kabe";

/*
 * パートシフト収入計算（壁警告付き）（P2-T27）— specs/b-tools/p2-t27-part-shift-shunyuu-keisan.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 壁の判定は @/lib/tools/impl/fuyo-kabe（Q3-18で検収済み）にそのまま委譲する。
 */

const yen = (n: number) => Math.round(n).toLocaleString("ja-JP");
const man = (n: number) => `${(n / 10000).toLocaleString("ja-JP")}万円`;

function WallRow({ w }: { w: WallResult }) {
  const tone =
    w.status === "safe" ? "border-line" : w.status === "crossed" ? "border-caution/40" : "border-line";
  const badge = w.status === "safe" ? "まだ手前" : w.status === "crossed" ? "超えています" : "要確認";

  return (
    <li className={`rounded-card border p-4 ${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">{w.name}</p>
        <p className="text-sm text-ink-muted">{badge}</p>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">
        {w.amount === null ? "市区町村により異なります" : man(w.amount)}
        {w.isSlope && (
          <span className="ml-2 align-middle text-xs font-normal text-ink-muted">崖ではなく坂</span>
        )}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{w.effect}</p>
      {w.note && <p className="mt-1 text-sm text-ink-muted">{w.note}</p>}
    </li>
  );
}

export function PartShiftShunyuuKeisan() {
  const [incomeMode, setIncomeMode] = useState<IncomeMode>("shift");
  const [hourlyWage, setHourlyWage] = useState("1200");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [hoursPerDay, setHoursPerDay] = useState("5");
  const [monthlyIncome, setMonthlyIncome] = useState("100000");
  const [weeklyHoursForMonthlyMode, setWeeklyHoursForMonthlyMode] = useState("20");
  const [commuteAllowanceMonthly, setCommuteAllowanceMonthly] = useState("0");
  const [age, setAge] = useState("40");
  const [target, setTarget] = useState<FuyoTarget>("spouse");
  const [isStudent, setIsStudent] = useState(false);
  const [employerSize, setEmployerSize] = useState<EmployerSize>("unknown");
  const [supporterSalary, setSupporterSalary] = useState("6000000");
  const [baseMonth, setBaseMonth] = useState("2026-07");

  const input: PartShiftShunyuuInput = useMemo(
    () => ({
      income:
        incomeMode === "shift"
          ? {
              mode: "shift",
              hourlyWage: Number(hourlyWage),
              daysPerWeek: Number(daysPerWeek),
              hoursPerDay: Number(hoursPerDay),
            }
          : {
              mode: "monthlyDirect",
              monthlyIncome: Number(monthlyIncome),
              weeklyHoursForMonthlyMode: Number(weeklyHoursForMonthlyMode),
            },
      commuteAllowanceMonthly: Number(commuteAllowanceMonthly) || 0,
      age: Number(age),
      target,
      isStudent,
      employerSize,
      overTwoMonths: true,
      supporterSalary: target === "spouse" ? Number(supporterSalary) || 0 : undefined,
      sameHousehold: true,
      baseMonth,
    }),
    [
      incomeMode,
      hourlyWage,
      daysPerWeek,
      hoursPerDay,
      monthlyIncome,
      weeklyHoursForMonthlyMode,
      commuteAllowanceMonthly,
      age,
      target,
      isStudent,
      employerSize,
      supporterSalary,
      baseMonth,
    ],
  );

  const calcResult = useMemo(() => calculate(input), [input]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="収入の入力方法"
          value={incomeMode}
          hint="シフト表から時給・勤務時間で計算するか、月収を直接入力するか選べます"
          onChange={(e) => setIncomeMode(e.target.value as IncomeMode)}
        >
          <option value="shift">時給・勤務時間から計算する</option>
          <option value="monthlyDirect">月収を直接入力する</option>
        </SelectField>

        {incomeMode === "shift" ? (
          <>
            <NumberField
              label="時給（円）"
              value={hourlyWage}
              min={0}
              step="10"
              onChange={(e) => setHourlyWage(e.target.value)}
            />
            <NumberField
              label="週の勤務日数"
              value={daysPerWeek}
              min={0}
              max={7}
              step="1"
              onChange={(e) => setDaysPerWeek(e.target.value)}
            />
            <NumberField
              label="1日の勤務時間"
              value={hoursPerDay}
              min={0}
              max={24}
              step="0.5"
              onChange={(e) => setHoursPerDay(e.target.value)}
            />
          </>
        ) : (
          <>
            <NumberField
              label="月収（通勤手当を除く。円）"
              value={monthlyIncome}
              min={0}
              step="1000"
              hint="通勤手当は別欄（下）で入力してください"
              onChange={(e) => setMonthlyIncome(e.target.value)}
            />
            <NumberField
              label="週の所定労働時間"
              value={weeklyHoursForMonthlyMode}
              min={0}
              max={60}
              step="1"
              hint="社会保険に入るかの判定に使います"
              onChange={(e) => setWeeklyHoursForMonthlyMode(e.target.value)}
            />
          </>
        )}

        <NumberField
          label="月あたりの通勤手当等（円）"
          value={commuteAllowanceMonthly}
          min={0}
          step="1000"
          hint="106万円の壁の判定には含めず、130万円の壁の判定にのみ含めます"
          onChange={(e) => setCommuteAllowanceMonthly(e.target.value)}
        />
        <NumberField label="あなたの年齢" value={age} min={1} max={120} onChange={(e) => setAge(e.target.value)} />
        <SelectField
          label="誰の扶養に入っていますか"
          value={target}
          onChange={(e) => setTarget(e.target.value as FuyoTarget)}
        >
          <option value="spouse">配偶者</option>
          <option value="parent">親</option>
          <option value="none">扶養に入っていない</option>
        </SelectField>
        <SelectField
          label="学生ですか"
          value={isStudent ? "yes" : "no"}
          hint="夜間・通信・定時制の方は「いいえ」を選んでください"
          onChange={(e) => setIsStudent(e.target.value === "yes")}
        >
          <option value="no">いいえ</option>
          <option value="yes">はい（昼間部）</option>
        </SelectField>
        <SelectField
          label="勤務先の従業員数"
          value={employerSize}
          hint="社会保険に入るかの判定に使います"
          onChange={(e) => setEmployerSize(e.target.value as EmployerSize)}
        >
          <option value="unknown">わからない</option>
          <option value="51plus">51人以上</option>
          <option value="under51">51人未満</option>
        </SelectField>
        {target === "spouse" && (
          <NumberField
            label="配偶者の年間給与収入"
            value={supporterSalary}
            min={0}
            step="100000"
            onChange={(e) => setSupporterSalary(e.target.value)}
          />
        )}
        <SelectField
          label="いつの時点で試算しますか"
          value={baseMonth}
          hint="2026年10月に社会保険の賃金要件が撤廃される予定です"
          onChange={(e) => setBaseMonth(e.target.value)}
        >
          {[
            "2026-04",
            "2026-05",
            "2026-06",
            "2026-07",
            "2026-08",
            "2026-09",
            "2026-10",
            "2026-11",
            "2026-12",
            "2027-01",
            "2027-02",
            "2027-03",
          ].map((m) => (
            <option key={m} value={m}>
              {m.replace("-", "年")}月
            </option>
          ))}
        </SelectField>
      </div>

      {!calcResult.ok ? (
        <Callout tone="caution">{calcResult.error}</Callout>
      ) : (
        <>
          <ResultCard
            label="月収の見込み（通勤手当込み）"
            value={`${yen(calcResult.result.monthly.totalMonthly)} 円`}
            note={`年収に換算すると ${yen(calcResult.result.annualTotal)} 円（年52週換算の目安）です。`}
          />

          <Callout>
            シフト制の実務目安として、被扶養者でいるためには月の収入（通勤手当込み）を
            <strong>{yen(calcResult.result.monthlyGuide)} 円以下</strong>
            に収めるのが基本です（年収130万円 ÷ 12）。
            {calcResult.result.monthlyDependentRemaining >= 0
              ? `あと月 ${yen(calcResult.result.monthlyDependentRemaining)} 円まで、この目安の範囲内です。`
              : `目安を月 ${yen(-calcResult.result.monthlyDependentRemaining)} 円超えています。`}
            ただし年齢や続柄によっては150万円・180万円が基準になる場合があります（下の一覧を確認してください）。
          </Callout>

          <Callout>
            <strong>通勤手当の扱いに注意</strong>：106万円の壁（勤務先の社会保険に入るか）は通勤手当を
            <strong>含めない</strong>
            所定内賃金で判定し、130万円の壁（扶養から外れるか）は通勤手当を<strong>含める</strong>
            全ての収入で判定します。同じ「月の収入」でも制度により範囲が異なります。
          </Callout>

          <div>
            <h2 className="text-base font-bold">あなたに関係する壁</h2>
            <ul className="mt-2 space-y-2">
              {calcResult.result.walls.map((w) => (
                <WallRow key={w.key} w={w} />
              ))}
            </ul>
          </div>

          {calcResult.result.shaho.enrolled === true && (
            <Callout tone="caution">
              勤務先の社会保険に加入する条件（通勤手当を除く所定内賃金ベース）を満たしています。
              加入すると将来の年金が増え、傷病手当金なども使えるようになります。
            </Callout>
          )}
          {calcResult.result.shaho.enrolled === "unknown" && (
            <Callout>
              勤務先の従業員数がわからないため、社会保険に入るかどうかは51人以上か未満かで変わります。
              勤務先にご確認ください。
            </Callout>
          )}

          {!calcResult.result.dependent.isDependent && (
            <Callout>
              扶養から外れる見込みです。ただし、人手不足による一時的な収入増であれば、
              勤務先の証明により原則連続2回まで扶養にとどまれる場合があります（年収の壁・支援強化パッケージ）。
              恒常的な収入増の場合は使えないため、勤務先にご相談ください。
            </Callout>
          )}
        </>
      )}
    </div>
  );
}
