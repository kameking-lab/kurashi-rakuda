"use client";

import { useState } from "react";
import { DateField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcTaishokuTiming,
  fmtDate,
  type LeaveReason,
  type TaishokuTimingInput,
} from "./TaishokuTimingSongeki.calc";

/*
 * 退職タイミング損得カレンダー（P2-T09）
 * specs/s-tools/17-taishoku-timing-songeki.md
 * すべてクライアント内で即時計算（送信なし）。
 *
 * ★保険料の実額は標準報酬・自治体で異なるため算出しない★
 *   月末退職の社保の扱い・住民税の一括徴収・雇用保険の所定給付日数という
 *   「タイミングで変わる制度上の扱い」を示す。
 */
export function TaishokuTimingSongeki() {
  const [resignDate, setResignDate] = useState("");
  const [reason, setReason] = useState<LeaveReason>("jiko-tsugou");
  const [age, setAge] = useState("");
  const [insuredYears, setInsuredYears] = useState("");

  const toNum = (s: string): number => {
    const v = Number(s);
    return s.trim() !== "" && Number.isFinite(v) ? v : 0;
  };

  const entered = resignDate.trim() !== "";
  const input: TaishokuTimingInput = {
    resignDate,
    reason,
    age: toNum(age),
    insuredYears: toNum(insuredYears),
  };
  const r = calcTaishokuTiming(input);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="退職予定日"
          hint="末日か、その前日かで社会保険料の扱いが変わります"
          value={resignDate}
          onChange={(e) => setResignDate(e.target.value)}
        />
        <SelectField
          label="離職理由"
          value={reason}
          onChange={(e) => setReason(e.target.value as LeaveReason)}
        >
          <option value="jiko-tsugou">自己都合退職（一般の離職者）</option>
          <option value="kaisha-tsugou">会社都合（倒産・解雇等＝特定受給資格者）</option>
          <option value="shuushoku-konnan">就職困難者（障害者等）</option>
        </SelectField>
        <NumberField
          label="離職日時点の年齢"
          min={0}
          step={1}
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
        <NumberField
          label="雇用保険の被保険者期間（年）"
          hint="おおよその通算年数でOK"
          min={0}
          step={1}
          value={insuredYears}
          onChange={(e) => setInsuredYears(e.target.value)}
        />
      </div>

      {!r.ok ? (
        entered && <Callout tone="caution">{r.error}</Callout>
      ) : (
        <>
          {r.kyufu && r.kyufu.days != null && (
            <ResultCard
              label={`雇用保険（基本手当）の所定給付日数の目安（${r.kyufu.ageLabel}）`}
              value={String(r.kyufu.days)}
              unit="日"
              note={
                r.restrictionMonths > 0
                  ? `受給までに待期${r.waitingDays}日＋給付制限${r.restrictionMonths}か月があります`
                  : `待期${r.waitingDays}日の後に受給開始（会社都合等は給付制限なし）`
              }
            />
          )}

          {r.kyufu && r.kyufu.days == null && (
            <Callout tone="caution">
              入力された年齢と被保険者期間の組み合わせは、給付日数表に該当がありません（例:
              若年で被保険者期間が20年以上など、通常あり得ない組み合わせ）。年齢・年数をご確認ください。
            </Callout>
          )}

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">① 社会保険料（退職月の扱い）</p>
            <p className="mt-1 text-ink-muted">
              退職日 {fmtDate(r.resign)} の翌日 {fmtDate(r.shikakuSoushitsu)} が資格喪失日です。
            </p>
            {r.isMonthEnd ? (
              <p className="mt-2">
                <strong>月末退職</strong>
                のため、退職月分の社会保険料まで会社経由（労使折半）で最後の給与から控除されます。翌月から国民健康保険・国民年金等に切り替わります。
              </p>
            ) : (
              <p className="mt-2">
                <strong>月末以外の退職</strong>
                のため、退職月分の社会保険料は会社経由では控除されず、退職月から自分で国民健康保険・国民年金等（または任意継続）に加入して負担することになります。1日違いで負担者が変わるため、月末退職と比べて損得が生じます。
              </p>
            )}
          </div>

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">② 住民税（退職{r.resign.m}月）</p>
            <p className="mt-1 text-ink-muted">{r.juuminzeiText}</p>
          </div>

          <Callout>
            雇用保険の受給には、離職前の被保険者期間の要件（一般は離職前2年に通算12か月以上、会社都合等は離職前1年に通算6か月以上）があります。所定給付日数は年齢・被保険者期間・離職理由で決まり、公共職業訓練の受講指示があると延長される場合があります。会社都合か自己都合かで給付制限の有無が変わるため、離職理由の判断は重要です。
          </Callout>

          <Callout tone="caution">
            <strong>保険料や税の実際の金額は、標準報酬月額・お住まいの自治体・前年所得によって異なるため、本ツールでは金額を計算していません。</strong>
            退職後の健康保険は「任意継続（退職日の翌日から20日以内に申請）」「国民健康保険（減免制度あり）」「家族の被扶養者」の3択で、どれが得かは人により異なります。賞与の支給日在籍要件は就業規則によります。
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は退職の時期によって変わる制度上の扱いの<strong>目安</strong>
        です。実際の給付・保険料・税額は、勤務先・ハローワーク・保険者・お住まいの市区町村にご確認ください。
      </Callout>
    </div>
  );
}
