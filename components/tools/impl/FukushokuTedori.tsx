"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DateField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { SeidoExpiredNotice } from "@/components/tools/SeidoNotice";
import {
  simulate,
  ikukyuKyufuDataset,
  MINIMUM_AMOUNT,
  SUPPORT_LIMIT,
  BENEFIT_TAX_EXEMPT_NOTE,
  type FukushokuInput,
  type FukushokuScenario,
  type InputMode,
  type InsuredMonths12,
} from "@/lib/tools/impl/fukushoku-tedori";
import { todayJst } from "@/lib/tools/seido";

/*
 * 復職後の手取りシミュレーター（P2-T01 / #56）
 * — specs/s-tools/07-fukushoku-tedori-simu.md
 *
 * 賃金・社会保険料・育児時短就業給付・8/1改定での停止は jitan-kyuyo エンジンに委譲し、
 * その各シナリオから利用者入力の保育料を差し引いて「手元に残る額」を示す。
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 */

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

function ScenarioCard({ s, benefitAmount }: { s: FukushokuScenario; benefitAmount: number | null }) {
  const { base } = s;
  return (
    <li className="rounded-card border border-line p-4">
      <p className="font-medium">{base.label}</p>
      <p className="mt-1 text-sm text-ink-muted">
        社会保険料の計算のもとになる報酬月額: {yen(base.premium.standardWage)}
      </p>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">時短後の賃金</dt>
          <dd className="tabular-nums">{yen(base.beforeTax + base.premium.total)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">社会保険料・雇用保険料の合計</dt>
          <dd className="tabular-nums">−{yen(base.premium.total)}</dd>
        </div>
        {benefitAmount !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">育児時短就業給付金（非課税）</dt>
            <dd className="tabular-nums">＋{yen(benefitAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-line pt-1">
          <dt className="text-ink-muted">保育料を引く前（税引前）</dt>
          <dd className="tabular-nums">
            {base.monthlyTotal === null ? "算定できません" : yen(base.monthlyTotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">保育料</dt>
          <dd className="tabular-nums">−{yen(s.hoikuryo)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-1 font-bold">
          <dt>手元に残る額（税引前・保育料を引いた後）</dt>
          <dd className="tabular-nums">
            {s.net === null ? "算定できません" : yen(s.net)}
          </dd>
        </div>
      </dl>
    </li>
  );
}

export function FukushokuTedori() {
  const [wageMonthBefore, setWageMonthBefore] = useState("300000");
  const [wageMonthAfter, setWageMonthAfter] = useState("240000");
  const [inputMode, setInputMode] = useState<InputMode>("direct");
  const [weeklyHoursBefore, setWeeklyHoursBefore] = useState("40");
  const [weeklyHoursAfter, setWeeklyHoursAfter] = useState("30");
  const [hoikuryoMonthly, setHoikuryoMonthly] = useState("40000");
  const [childBirthDate, setChildBirthDate] = useState("");
  const [jitanStartDate, setJitanStartDate] = useState(todayJst());
  const [continuedFromIkukyu, setContinuedFromIkukyu] = useState(true);
  const [insuredMonths12, setInsuredMonths12] = useState<InsuredMonths12>("unknown");
  const [receivingOtherBenefit, setReceivingOtherBenefit] = useState(false);
  const [koureishaKeizoku, setKoureishaKeizoku] = useState(false);
  const [insuredWholeMonth, setInsuredWholeMonth] = useState(true);
  const [prefecture, setPrefecture] = useState("");

  const input: FukushokuInput = useMemo(
    () => ({
      wageMonthBefore: Number(wageMonthBefore),
      wageMonthAfter: Number(wageMonthAfter),
      inputMode,
      weeklyHoursBefore: Number(weeklyHoursBefore),
      weeklyHoursAfter: Number(weeklyHoursAfter),
      hoikuryoMonthly: Number(hoikuryoMonthly),
      childBirthDate,
      jitanStartDate,
      continuedFromIkukyu,
      insuredMonths12,
      receivingOtherBenefit,
      koureishaKeizoku,
      insuredWholeMonth,
      prefecture: prefecture || null,
      today: todayJst(),
    }),
    [
      wageMonthBefore,
      wageMonthAfter,
      inputMode,
      weeklyHoursBefore,
      weeklyHoursAfter,
      hoikuryoMonthly,
      childBirthDate,
      jitanStartDate,
      continuedFromIkukyu,
      insuredMonths12,
      receivingOtherBenefit,
      koureishaKeizoku,
      insuredWholeMonth,
      prefecture,
    ],
  );

  const r = useMemo(() => simulate(input), [input]);
  const allErrors = [...r.errors, ...r.hoikuryoErrors];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="育児時短就業を始める前の賃金月額"
          value={wageMonthBefore}
          min={0}
          step="10000"
          hint="復職して時短を始める前の、直近6か月の月給の平均です。賞与は含めません"
          onChange={(e) => setWageMonthBefore(e.target.value)}
        />
        <SelectField
          label="時短後の賃金の入れ方"
          value={inputMode}
          hint="金額がまだ分からない場合は、所定労働時間から概算できます"
          onChange={(e) => setInputMode(e.target.value as InputMode)}
        >
          <option value="direct">金額を直接入れる</option>
          <option value="byHours">週の所定労働時間から概算する</option>
        </SelectField>

        {inputMode === "direct" ? (
          <NumberField
            label="時短後の1か月の賃金"
            value={wageMonthAfter}
            min={0}
            step="10000"
            hint="復職後に実際に支払われる予定の月給（税・社会保険料を引く前）"
            onChange={(e) => setWageMonthAfter(e.target.value)}
          />
        ) : (
          <>
            <NumberField
              label="時短前の週の所定労働時間"
              value={weeklyHoursBefore}
              min={0}
              max={80}
              step="0.5"
              hint="1週間の所定労働時間。残業は含めません"
              onChange={(e) => setWeeklyHoursBefore(e.target.value)}
            />
            <NumberField
              label="時短後の週の所定労働時間"
              value={weeklyHoursAfter}
              min={0}
              max={80}
              step="0.5"
              hint="6時間勤務なら30時間（6h×5日）。6時間でなくても対象です"
              onChange={(e) => setWeeklyHoursAfter(e.target.value)}
            />
          </>
        )}

        <NumberField
          label="復職後の保育料（1か月）"
          value={hoikuryoMonthly}
          min={0}
          step="1000"
          hint="実際に支払う認可保育園などの月額。分からない場合は保育料計算ツールで求めてください"
          onChange={(e) => setHoikuryoMonthly(e.target.value)}
        />

        <DateField
          label="お子さんの生年月日"
          value={childBirthDate}
          hint="時短の対象となるお子さんの誕生日"
          onChange={(e) => setChildBirthDate(e.target.value)}
        />
        <DateField
          label="育児時短就業（時短勤務）の開始日"
          value={jitanStartDate}
          hint="復職して時短勤務を始める（始めた）日"
          onChange={(e) => setJitanStartDate(e.target.value)}
        />
        <SelectField
          label="育児休業から引き続き時短を始めましたか"
          value={continuedFromIkukyu ? "yes" : "no"}
          hint="育児休業が終わった日の翌日、または14日以内に始めた場合は「はい」です"
          onChange={(e) => setContinuedFromIkukyu(e.target.value === "yes")}
        >
          <option value="yes">はい</option>
          <option value="no">いいえ</option>
        </SelectField>
        {!continuedFromIkukyu && (
          <SelectField
            label="開始日前2年に、賃金支払基礎日数11日以上の月が12か月ありますか"
            value={insuredMonths12}
            hint="わからない場合は「わからない」で構いません。ハローワークで確認できます"
            onChange={(e) => setInsuredMonths12(e.target.value as InsuredMonths12)}
          >
            <option value="unknown">わからない</option>
            <option value="yes">ある</option>
            <option value="no">ない</option>
          </SelectField>
        )}
        <SelectField
          label="その月の初日から末日まで被保険者ですか"
          value={insuredWholeMonth ? "yes" : "no"}
          hint="月の途中で入社・退職する月は「いいえ」を選んでください"
          onChange={(e) => setInsuredWholeMonth(e.target.value === "yes")}
        >
          <option value="yes">はい</option>
          <option value="no">いいえ</option>
        </SelectField>
        <SelectField
          label="同じ月に育児休業給付・介護休業給付を受け取りますか"
          value={receivingOtherBenefit ? "yes" : "no"}
          onChange={(e) => setReceivingOtherBenefit(e.target.value === "yes")}
        >
          <option value="no">受け取らない</option>
          <option value="yes">受け取る月がある</option>
        </SelectField>
        <SelectField
          label="高年齢雇用継続給付の受給対象ですか"
          value={koureishaKeizoku ? "yes" : "no"}
          hint="60歳以上で高年齢雇用継続給付を受けている場合は「はい」"
          onChange={(e) => setKoureishaKeizoku(e.target.value === "yes")}
        >
          <option value="no">いいえ</option>
          <option value="yes">はい</option>
        </SelectField>
        <SelectField
          label="お住まいの都道府県"
          value={prefecture}
          hint="健康保険料率は都道府県で少し違います（本ツールは全国平均で概算します）"
          onChange={(e) => setPrefecture(e.target.value)}
        >
          <option value="">選択しない</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectField>
      </div>

      {r.expired ? (
        <>
          <SeidoExpiredNotice datasets={[ikukyuKyufuDataset]} />
          <Callout tone="caution">
            育児時短就業給付の支給限度額（{yen(SUPPORT_LIMIT)}）・最低限度額（{yen(MINIMUM_AMOUNT)}）は
            <strong>令和8年7月31日までの額</strong>
            です。毎月勤労統計の平均定期給与額の増減をもとに
            <strong>毎年8月1日に改定</strong>
            されます。新しい額を反映するまで、誤った金額をお見せしないため計算を停止しています。
            最新の額は厚生労働省の「育児時短就業給付の内容と支給申請手続」でご確認ください。
          </Callout>
        </>
      ) : allErrors.length > 0 ? (
        <Callout tone="caution">
          <ul className="space-y-1">
            {allErrors.map((e) => (
              <li key={`${e.field}-${e.message}`}>{e.message}</li>
            ))}
          </ul>
        </Callout>
      ) : (
        <>
          <ResultCard
            label="育児時短就業給付金（1か月あたり・非課税）"
            value={r.benefit.amount === null ? "算定できません" : yen(r.benefit.amount)}
            note={r.benefit.reason}
          />

          {r.benefit.kubun === "rule2" && r.benefit.adjustedRatePercent !== null && (
            <Callout>
              時短による賃金の減り方が小さいため、支給率が10%から
              <strong>調整後の支給率 {r.benefit.adjustedRatePercent.toFixed(2)}%</strong>
              に逓減しています（雇用保険法施行規則第101条の47）。賃金額と支給額の合計が、時短を始める前の賃金月額を超えることはありません。
              端数処理の関係で、実際に支給される額と1円単位で異なる場合があります。
            </Callout>
          )}

          {r.scenarios.length > 0 && (
            <div>
              <h2 className="text-base font-bold">1か月に手元へ残る額（税引前・保育料を引いた後）</h2>
              <p className="mt-1 text-sm text-ink-muted">
                時短前（{yen(Number(wageMonthBefore) || 0)}）のときに、社会保険料と保育料を引いた税引前の手取りは
                およそ {yen(r.beforeJitanNet)} でした。
              </p>
              <ul className="mt-2 space-y-2">
                {r.scenarios.map((s) => (
                  <ScenarioCard key={s.base.scenario} s={s} benefitAmount={r.benefit.amount} />
                ))}
              </ul>
            </div>
          )}

          <Callout tone="caution">
            <strong>復職直後は「社会保険料が高いまま」「保育料も高いまま」が重なります。</strong>
            健康保険・厚生年金の保険料は標準報酬月額をもとに決まるため、時短にした直後の数か月は前の給料のままの保険料が引かれます。
            さらに保育料は<strong>前年（＝育休前のフル収入）の課税額</strong>をもとに決まるため、
            復職直後の収入が下がっていても保育料は高いままになりがちです。この2つの「時間差」が重なるのが復職直後です。
          </Callout>

          <Callout>
            <strong>育児休業給付金・育児時短就業給付金は非課税です。</strong>
            {BENEFIT_TAX_EXEMPT_NOTE}
            そのため、時短で収入が下がっていれば、翌年度の保育料の見直し（多くの自治体で9月に切り替わります）で
            保育料が下がる場合があります。ただし切替の時期・金額は自治体ごとに異なるため、
            具体的な金額は<Link className="underline" href="/tools/childcare/hoikuryo">保育料計算ツール</Link>やお住まいの自治体でご確認ください。
          </Callout>

          <div>
            <h2 className="text-base font-bold">各月の支給要件</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {r.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  <span className="shrink-0 text-ink-muted">
                    {c.ok ? "満たしています" : c.determinable ? "満たしていません" : "要確認"}
                  </span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {r.warnings.length > 0 && (
            <div>
              <h2 className="text-base font-bold">ご確認いただきたいこと</h2>
              <ul className="mt-2 space-y-2 text-sm text-ink-muted">
                {r.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
