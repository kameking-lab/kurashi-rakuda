"use client";

import { useMemo, useState } from "react";
import { DateField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { SeidoExpiredNotice } from "@/components/tools/SeidoNotice";
import { formatJaDate, todayJst } from "@/lib/tools/seido";
import {
  simulate,
  ikukyuKyufuDataset,
  SPOUSE_EXCEPTIONS,
  COMBINED_RATE,
  COMBINED_RATE_MAX_DAYS,
  RATE_FIRST,
  RATE_AFTER,
  RATE_SHUSSHO_GO,
  RATE_SWITCH_DAYS,
  type SankyuInput,
  type Role,
  type InsuredPeriod,
  type HealthInsurance,
  type SpouseException,
} from "@/lib/tools/impl/sankyu-ikukyu-money";

/*
 * 産休育休まるごとお金シミュレーター（Q3-04）— specs/s-tools/03-sankyu-ikukyu-money.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値は data/seido/ikukyu-kyufu.json のみを参照する（lib/tools/impl/sankyu-ikukyu-money.ts 経由）。
 */

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;
const pct = (r: number) => `${Math.round(r * 100)}%`;
const jaMonth = (m: string) => `${Number(m.slice(0, 4))}年${Number(m.slice(5, 7))}月`;

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className="rounded-card border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </div>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
    </li>
  );
}

export function SankyuIkukyuMoney() {
  const [role, setRole] = useState<Role>("mother");
  const [dueDate, setDueDate] = useState("2026-11-01");
  const [birthDate, setBirthDate] = useState("");
  const [babyCount, setBabyCount] = useState("1");
  const [monthlySalary, setMonthlySalary] = useState("300000");
  const [monthlyPremium, setMonthlyPremium] = useState("");
  const [insuredPeriod, setInsuredPeriod] = useState<InsuredPeriod>("over12months");
  const [healthInsurance, setHealthInsurance] = useState<HealthInsurance>("kyokai");
  const [leaveMonths, setLeaveMonths] = useState("12");
  const [spouseTakesLeave, setSpouseTakesLeave] = useState(false);
  const [spouseLeaveDays, setSpouseLeaveDays] = useState("14");
  const [spouseException, setSpouseException] = useState<SpouseException>("none");
  const [hasObstetricCompensation, setHasObstetricCompensation] = useState(true);
  const [worksDuringLeave, setWorksDuringLeave] = useState(false);
  const [wagePerPeriod, setWagePerPeriod] = useState("0");
  const [papaLeaveDays, setPapaLeaveDays] = useState("28");

  const salary = Number(monthlySalary);
  const valid = Number.isFinite(salary) && salary > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dueDate);

  const input: SankyuInput = useMemo(
    () => ({
      role,
      dueDate,
      birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null,
      babyCount: Number(babyCount) || 1,
      monthlySalary: valid ? salary : 0,
      monthlyPremium: Number(monthlyPremium) || 0,
      insuredPeriod,
      healthInsurance,
      leaveMonths: Number(leaveMonths) || 0,
      leaveCount: 1,
      spouseTakesLeave,
      spouseLeaveDays: Number(spouseLeaveDays) || 0,
      spouseException,
      hasObstetricCompensation,
      wagePerPeriod: worksDuringLeave ? Number(wagePerPeriod) || 0 : 0,
      papaLeaveDays: role === "father" ? Number(papaLeaveDays) || 0 : 0,
      today: todayJst(),
    }),
    [
      role,
      dueDate,
      birthDate,
      babyCount,
      valid,
      salary,
      monthlyPremium,
      insuredPeriod,
      healthInsurance,
      leaveMonths,
      spouseTakesLeave,
      spouseLeaveDays,
      spouseException,
      hasObstetricCompensation,
      worksDuringLeave,
      wagePerPeriod,
      papaLeaveDays,
    ],
  );

  const r = useMemo(() => simulate(input), [input]);
  const tl = r.timeline;

  const form = (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="どちらの試算ですか"
        value={role}
        hint="産休があるかどうかで、給付の計算の起算点が変わります"
        onChange={(e) => setRole(e.target.value as Role)}
      >
        <option value="mother">出産するご本人（母）</option>
        <option value="father">配偶者・パートナー（父）</option>
      </SelectField>
      <DateField
        label="出産予定日"
        value={dueDate}
        hint="産前休業はこの日から逆算して始まります"
        onChange={(e) => setDueDate(e.target.value)}
      />
      <DateField
        label="実際の出産日（決まっていれば）"
        value={birthDate}
        hint="未入力なら予定日で試算します。予定日とずれると産前の期間が変わります"
        onChange={(e) => setBirthDate(e.target.value)}
      />
      <SelectField
        label="お子さんの人数"
        value={babyCount}
        hint="多胎の場合、産前が42日から98日に延びます（産後は56日のまま）"
        onChange={(e) => setBabyCount(e.target.value)}
      >
        <option value="1">1人（単胎）</option>
        <option value="2">2人（双子）</option>
        <option value="3">3人（三つ子）</option>
      </SelectField>
      <NumberField
        label="産休前の月給（額面）"
        value={monthlySalary}
        min={0}
        max={2_000_000}
        step="10000"
        hint="賞与は含めないでください（育児休業給付の賃金日額には算入しません）"
        onChange={(e) => setMonthlySalary(e.target.value)}
      />
      <NumberField
        label="給与明細の社会保険料（月額・任意）"
        value={monthlyPremium}
        min={0}
        step="1000"
        hint="健康保険料＋厚生年金保険料の本人負担額。免除でいくら浮くかの集計に使います"
        onChange={(e) => setMonthlyPremium(e.target.value)}
      />
      <SelectField
        label="雇用保険の被保険者期間"
        value={insuredPeriod}
        hint="育児休業給付の受給要件です"
        onChange={(e) => setInsuredPeriod(e.target.value as InsuredPeriod)}
      >
        <option value="over12months">12か月以上ある</option>
        <option value="under12months">12か月に満たない・わからない</option>
      </SelectField>
      <SelectField
        label="加入している健康保険"
        value={healthInsurance}
        onChange={(e) => setHealthInsurance(e.target.value as HealthInsurance)}
      >
        <option value="kyokai">協会けんぽ</option>
        <option value="kumiai">健康保険組合</option>
        <option value="kyosai">共済組合（公務員）</option>
        <option value="kokuho">国民健康保険</option>
        <option value="hifuyou">家族の被扶養者</option>
      </SelectField>
      <NumberField
        label="育休の取得予定期間（月数）"
        value={leaveMonths}
        min={0}
        max={24}
        step="1"
        hint={`通算${RATE_SWITCH_DAYS}日目までは給付率${pct(RATE_FIRST)}、${RATE_SWITCH_DAYS + 1}日目以降は${pct(RATE_AFTER)}になります`}
        onChange={(e) => setLeaveMonths(e.target.value)}
      />
      {role === "father" && (
        <NumberField
          label="産後パパ育休の日数"
          value={papaLeaveDays}
          min={0}
          max={28}
          step="1"
          hint="お子さんの出生日から8週間を経過する日の翌日までの期間内。通算28日まで"
          onChange={(e) => setPapaLeaveDays(e.target.value)}
        />
      )}
      <SelectField
        label="配偶者・パートナーも育休を取りますか"
        value={spouseTakesLeave ? "yes" : "no"}
        hint="出生後休業支援給付金（13%上乗せ）の要件です"
        onChange={(e) => setSpouseTakesLeave(e.target.value === "yes")}
      >
        <option value="no">取らない・わからない</option>
        <option value="yes">取る</option>
      </SelectField>
      {spouseTakesLeave ? (
        <NumberField
          label="配偶者の休業日数"
          value={spouseLeaveDays}
          min={0}
          max={56}
          step="1"
          hint="出生日から8週間を経過する日の翌日までに通算14日以上あることが要件です"
          onChange={(e) => setSpouseLeaveDays(e.target.value)}
        />
      ) : (
        <SelectField
          label="配偶者が育休を取れない理由はありますか"
          value={String(spouseException)}
          hint="いずれかに当てはまれば、配偶者が育休を取らなくても13%の上乗せの対象になります"
          onChange={(e) =>
            setSpouseException(
              e.target.value === "none" ? "none" : (Number(e.target.value) as SpouseException),
            )
          }
        >
          <option value="none">当てはまらない・わからない</option>
          {SPOUSE_EXCEPTIONS.map((x, i) => (
            <option key={x} value={i}>
              {i + 1}. {x}
            </option>
          ))}
        </SelectField>
      )}
      <SelectField
        label="産科医療補償制度に加入している医療機関で出産しますか"
        value={hasObstetricCompensation ? "yes" : "no"}
        hint="出産育児一時金の額が変わります"
        onChange={(e) => setHasObstetricCompensation(e.target.value === "yes")}
      >
        <option value="yes">はい（在胎22週以降）</option>
        <option value="no">いいえ・在胎22週未満</option>
      </SelectField>
      <SelectField
        label="育休中に就業しますか"
        value={worksDuringLeave ? "yes" : "no"}
        hint="就業日数が10日を超える場合は80時間以下であることが必要です"
        onChange={(e) => setWorksDuringLeave(e.target.value === "yes")}
      >
        <option value="no">しない</option>
        <option value="yes">する（賃金の支払いがある）</option>
      </SelectField>
      {worksDuringLeave && (
        <NumberField
          label="1か月（支給単位期間）あたりに支払われる賃金"
          value={wagePerPeriod}
          min={0}
          step="10000"
          hint="賃金日額×日数の13%を超えると給付が減り、80%以上で支給されなくなります"
          onChange={(e) => setWagePerPeriod(e.target.value)}
        />
      )}
    </div>
  );

  if (r.expired) {
    return (
      <div className="space-y-5">
        {form}
        <SeidoExpiredNotice datasets={[ikukyuKyufuDataset]} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {form}

      {!valid ? (
        <Callout>
          出産予定日と産休前の月給を入れると、その場で産休・育休のお金を時系列で表示します。
        </Callout>
      ) : (
        <>
          <ResultCard
            label="産休・育休の間に受け取れる給付の合計（目安）"
            value={r.total === null ? "—" : r.total.toLocaleString("ja-JP")}
            unit={r.total === null ? undefined : "円"}
            note={
              r.total === null
                ? "金額を確定できない項目があるため、合計は表示していません。下の内訳をご覧ください。"
                : `${formatJaDate(tl.prenatalStart)}の産前休業開始から、${formatJaDate(tl.childcareLeaveEnd)}の育休終了までの合計です。社会保険料の免除ぶんは含みません。`
            }
          />

          {r.warnings.map((w) => (
            <Callout key={w} tone="caution">
              {w}
            </Callout>
          ))}

          <div>
            <h2 className="text-base font-bold">いつ・いくら（時系列）</h2>
            <ul className="mt-2 space-y-2">
              <Row
                label={`① 産前休業　${formatJaDate(tl.prenatalStart)} 〜 ${formatJaDate(tl.prenatalEnd)}`}
                value={`${tl.prenatalDays}日`}
                note={
                  tl.delayDays > 0
                    ? "出産手当金の産前の起算点は「出産の日（出産の日が予定日より後なら予定日）」です。予定日より遅れた日数も産前の支給対象に含まれます。"
                    : "産前休業は出産予定日から逆算して始まります。"
                }
              />
              <Row
                label={`② 産後休業　${formatJaDate(tl.postnatalStart)} 〜 ${formatJaDate(tl.postnatalEnd)}`}
                value={`${tl.postnatalDays}日`}
                note="産後の期間は多胎でも56日で変わりません。"
              />
              <Row
                label="③ 出産手当金"
                value={r.shussanTeate.amount === null ? "確認が必要です" : yen(r.shussanTeate.amount)}
                note={
                  r.shussanTeate.dailyAmount !== null
                    ? `支給日額 ${yen(r.shussanTeate.dailyAmount)} × ${r.shussanTeate.days}日。${r.shussanTeate.reason}`
                    : r.shussanTeate.reason
                }
              />
              <Row
                label="④ 出産育児一時金"
                value={yen(r.ichijikin.amount)}
                note={`${r.ichijikin.reason}${r.ichijikin.babyCount > 1 ? `／お子さん${r.ichijikin.babyCount}人ぶん` : ""}。多くの場合、直接支払制度で医療機関に直接支払われます。`}
              />
              {r.shusshoJi && (
                <Row
                  label={`⑤ 出生時育児休業給付金（産後パパ育休・${r.shusshoJi.days}日）`}
                  value={yen(r.shusshoJi.amount)}
                  note={`就業する場合の上限は、この休業日数では最大${r.shusshoJi.workDaysLimit}日（超える場合は${r.shusshoJi.workHoursLimit.toFixed(2)}時間以下）です。`}
                />
              )}
              <Row
                label={`⑥ 育児休業給付金　${formatJaDate(tl.childcareLeaveStart)} 〜 ${formatJaDate(tl.childcareLeaveEnd)}`}
                value={r.ikukyu.eligible ? yen(r.ikukyu.total) : "確認が必要です"}
                note={r.ikukyu.reason}
              />
              <Row
                label={`⑦ 出生後休業支援給付金（${pct(RATE_FIRST)}への上乗せ）`}
                value={r.shusshoGo.eligible ? yen(r.shusshoGo.amount) : "対象外"}
                note={r.shusshoGo.reason}
              />
            </ul>
          </div>

          {!r.shusshoGo.eligible && !r.shusshoGo.spouseOk && (
            <Callout>
              <p className="font-medium">
                配偶者が育休を取らなくても、あなたが対象になる場合があります。
              </p>
              <p className="mt-1">
                次のいずれかに当てはまれば、配偶者の休業がなくても出生後休業支援給付金の対象です（お子さんの出生日の翌日時点で判定します）。
                当てはまるものを上の入力欄で選ぶと、試算に反映されます。
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5">
                {SPOUSE_EXCEPTIONS.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Callout>
          )}

          {r.ikukyu.periods.length > 0 && (
            <div>
              <h2 className="text-base font-bold">支給単位期間ごとの育児休業給付金</h2>
              <p className="mt-1 text-sm text-ink-muted">
                支給単位期間は暦月ではなく、育休を開始した日の応当日で区切ります（
                {formatJaDate(tl.childcareLeaveStart)}開始なら、最初の期間は
                {formatJaDate(r.ikukyu.periods[0].end)}までです）。
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="py-2 pr-3 font-medium">回</th>
                      <th className="py-2 pr-3 font-medium">期間</th>
                      <th className="py-2 pr-3 font-medium">支給日数</th>
                      <th className="py-2 pr-3 font-medium">給付率</th>
                      <th className="py-2 font-medium">支給額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ikukyu.periods.map((p) => (
                      <tr key={p.index} className="border-b border-line/60">
                        <td className="py-2 pr-3 tabular-nums">{p.index}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {p.start.slice(5).replace("-", "/")}〜{p.end.slice(5).replace("-", "/")}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{p.days}</td>
                        <td className="py-2 pr-3">
                          {p.days50 === 0
                            ? pct(RATE_FIRST)
                            : p.days67 === 0
                              ? pct(RATE_AFTER)
                              : `${pct(RATE_FIRST)}${p.days67}日＋${pct(RATE_AFTER)}${p.days50}日`}
                        </td>
                        <td className="py-2 tabular-nums">{yen(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-base font-bold">社会保険料の免除</h2>
            <ul className="mt-2 space-y-2">
              <Row
                label="免除される月"
                value={`${r.menjo.totalMonths}か月`}
                note={
                  r.menjo.totalMonths === 0
                    ? "免除の対象になる月がありません。"
                    : `${[...new Set([...r.menjo.maternityMonths, ...r.menjo.childcareMonths])].map(jaMonth).join("・")}`
                }
              />
              <Row
                label="免除される保険料（目安）"
                value={r.menjo.estimated === null ? "—" : yen(r.menjo.estimated)}
                note={
                  r.menjo.estimated === null
                    ? "給与明細の社会保険料（健康保険＋厚生年金の本人負担・月額）を入力すると集計します。保険料は標準報酬月額と料率で決まり、都道府県・健康保険組合によって違うため、推測した金額はお見せしません。"
                    : "入力された月額 × 免除される月数の概算です。事業主負担も同時に免除されます。免除された期間も保険料を納めた期間として扱われるため、将来の年金額で不利にはなりません。"
                }
              />
            </ul>
            <Callout>
              社会保険料の免除は自動ではありません。勤務先から年金事務所へ「産前産後休業取得者申出書」「育児休業等取得者申出書」を提出してもらう必要があります。
            </Callout>
          </div>

          <Callout tone="caution">
            <p className="font-medium">「手取り10割」について</p>
            <p className="mt-1">
              よく言われる{pct(COMBINED_RATE)}は、育児休業給付金{pct(RATE_FIRST)}
              に出生後休業支援給付金{pct(RATE_SHUSSHO_GO)}
              を足した合算で、対象となるのは最大{COMBINED_RATE_MAX_DAYS}日間だけです。
              育児休業給付金の給付率そのものが80%に上がったわけではありません。
              {COMBINED_RATE_MAX_DAYS + 1}日目以降は{pct(RATE_FIRST)}に戻り、通算
              {RATE_SWITCH_DAYS + 1}日目以降は{pct(RATE_AFTER)}になります。
            </p>
          </Callout>
        </>
      )}
    </div>
  );
}
