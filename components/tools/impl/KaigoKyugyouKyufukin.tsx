"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcKaigoKyugyou,
  fmtYen,
  MAX_COUNT,
  MAX_DAYS,
  type KaigoKyugyouInput,
} from "./KaigoKyugyouKyufukin.calc";

/*
 * 介護休業給付金 計算（P2-T05）
 * specs/s-tools/09-kaigo-kyugyou-kyufukin.md
 * すべてクライアント内で即時計算（送信なし）。
 */
export function KaigoKyugyouKyufukin() {
  const [monthlyWage, setMonthlyWage] = useState("");
  const [leaveDays, setLeaveDays] = useState("93");
  const [wagePaidPerPeriod, setWagePaidPerPeriod] = useState("");
  const [familyInScope, setFamilyInScope] = useState<"yes" | "no">("yes");
  const [resigning, setResigning] = useState<"yes" | "no">("no");

  const toNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const v = Number(s);
    return Number.isFinite(v) ? v : undefined;
  };

  const wageEntered = monthlyWage.trim() !== "";
  const input: KaigoKyugyouInput = {
    monthlyWage: toNum(monthlyWage) ?? 0,
    leaveDays: toNum(leaveDays) ?? 0,
    wagePaidPerPeriod: toNum(wagePaidPerPeriod),
    familyInScope: familyInScope === "yes",
    resigningAfterLeave: resigning === "yes",
  };
  const r = calcKaigoKyugyou(input);
  const hasWagePaid = (toNum(wagePaidPerPeriod) ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="介護休業開始前6か月間の平均月額賃金（円）"
          hint="ボーナスを除いた、月々の賃金（額面）のおおよその平均。賃金日額はこの1/30で計算します"
          min={0}
          step={10000}
          value={monthlyWage}
          onChange={(e) => setMonthlyWage(e.target.value)}
        />
        <NumberField
          label={`取得する介護休業の日数（1〜${MAX_DAYS}日）`}
          hint={`同一の対象家族について通算${MAX_DAYS}日・${MAX_COUNT}回まで。超過分は${MAX_DAYS}日で計算します`}
          min={1}
          max={MAX_DAYS}
          step={1}
          value={leaveDays}
          onChange={(e) => setLeaveDays(e.target.value)}
        />
      </div>

      <SelectField
        label="介護する家族は対象家族の範囲内ですか"
        hint="配偶者（事実婚含む）・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫が対象家族です"
        value={familyInScope}
        onChange={(e) => setFamilyInScope(e.target.value as "yes" | "no")}
      >
        <option value="yes">範囲内（上記のいずれか）</option>
        <option value="no">範囲外</option>
      </SelectField>

      <SelectField
        label="介護休業の終了後に離職する予定がありますか"
        hint="休業開始の時点で休業後の離職が予定されている場合は支給対象外です"
        value={resigning}
        onChange={(e) => setResigning(e.target.value as "yes" | "no")}
      >
        <option value="no">離職の予定はない（復職する）</option>
        <option value="yes">離職する予定がある</option>
      </SelectField>

      <NumberField
        label="休業中に会社から支払われる賃金（1支給対象期間あたり・円／任意）"
        hint="無給なら空欄でOK。賃金が支払われる場合は80%調整で給付が減額されます（各期間に同額が支払われる前提で計算）"
        min={0}
        step={10000}
        value={wagePaidPerPeriod}
        onChange={(e) => setWagePaidPerPeriod(e.target.value)}
      />

      {!r.ok ? (
        wageEntered && <Callout tone="caution">{r.error}</Callout>
      ) : (
        <>
          {r.ineligibleReasons.length > 0 && (
            <Callout tone="caution">
              <p className="font-medium">支給対象にならない可能性があります</p>
              <ul className="mt-1 list-disc pl-5">
                {r.ineligibleReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-1">
                下の金額は、これらの要件を満たした場合の目安として表示しています。
              </p>
            </Callout>
          )}

          <ResultCard
            label={`介護休業給付金の総額（${r.effectiveLeaveDays}日分）`}
            value={fmtYen(r.totalBenefit)}
            unit="円"
            note={
              hasWagePaid
                ? `休業中の賃金支払を考慮した額です（無給なら約${fmtYen(r.totalBenefitUnpaid)}円）`
                : `賃金日額 約${fmtYen(r.cappedDailyWage)}円 × 支給日数 × 67%`
            }
          />

          {r.cappedToMaxDays && (
            <Callout tone="caution">
              入力された日数は通算上限（{MAX_DAYS}日）を超えているため、{MAX_DAYS}
              日分で計算しました。
            </Callout>
          )}

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[420px] text-left text-sm">
              <caption className="sr-only">支給対象期間ごとの給付額</caption>
              <thead>
                <tr className="border-b border-line bg-sand-soft">
                  <th className="p-2 font-medium">支給対象期間</th>
                  <th className="p-2 font-medium">支給日数</th>
                  <th className="p-2 font-medium">給付額</th>
                </tr>
              </thead>
              <tbody>
                {r.periods.map((p, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="p-2">{i + 1}期</td>
                    <td className="p-2 tabular-nums">{p.periodDays}日</td>
                    <td className="p-2 tabular-nums font-bold">
                      {fmtYen(p.benefit)}円{p.reduced && "（80%調整後）"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Callout>
            賃金月額（賃金日額×30）には上限額（{fmtYen(r.cappedMonthlyWage)}
            円で計算中）があり、上限・下限に達すると給付額も頭打ち・底上げされます。上限額は毎年8月1日に改定されます。介護休業中は育児休業と異なり
            <strong>社会保険料は免除されません</strong>
            （別途保険料の負担が続きます）。
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は雇用保険法に基づく<strong>目安</strong>
        です。実際の受給には、休業開始日前2年間に賃金支払基礎日数11日以上の月が12か月以上あるなどの被保険者期間要件があり、賃金日額も実際の賃金台帳から算定されます。申請は原則として会社（事業主）がハローワークに行います。支給可否・支給額は必ずお勤め先とハローワークにご確認ください。
      </Callout>
    </div>
  );
}
