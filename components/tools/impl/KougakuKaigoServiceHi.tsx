"use client";

import { useEffect, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { todayJst } from "@/lib/tools/seido";
import {
  calcKougakuKaigo,
  fmtYen,
  nenkinBoundary,
  type IncomeCategory,
  type KougakuKaigoInput,
} from "./KougakuKaigoServiceHi.calc";

/*
 * 高額介護サービス費 該当チェック（P2-T06）
 * specs/s-tools/10-kougaku-kaigo-service-hi.md
 * すべてクライアント内で即時計算（送信なし）。
 */
const CATEGORY_OPTIONS: { value: IncomeCategory; label: string }[] = [
  { value: "kazei690", label: "課税所得690万円以上（年収約1,160万円〜）" },
  { value: "kazei380", label: "課税所得380万〜690万円未満（年収約770万〜1,160万円）" },
  { value: "kazei-under380", label: "市町村民税課税〜課税所得380万円未満" },
  { value: "hikazei", label: "世帯全員が市町村民税非課税（年金収入等が高め）" },
  { value: "hikazei-nenkin", label: "世帯全員が非課税 かつ 年金収入等が低い／老齢福祉年金" },
  { value: "seikatsu-hogo", label: "生活保護を受けている" },
];

export function KougakuKaigoServiceHi() {
  const [today, setToday] = useState<string | null>(null);
  const [userSelfPay, setUserSelfPay] = useState("");
  const [householdOtherSelfPay, setHouseholdOtherSelfPay] = useState("");
  const [category, setCategory] = useState<IncomeCategory>("kazei-under380");

  useEffect(() => {
    setToday(todayJst());
  }, []);

  const toNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const v = Number(s);
    return Number.isFinite(v) ? v : undefined;
  };

  const entered = userSelfPay.trim() !== "";
  const input: KougakuKaigoInput = {
    userSelfPay: toNum(userSelfPay) ?? 0,
    householdOtherSelfPay: toNum(householdOtherSelfPay),
    category,
  };
  const r = calcKougakuKaigo(input);
  const boundary = today ? nenkinBoundary(today) : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="本人の1か月の介護サービス利用者負担（円）"
          hint="介護サービス（1〜3割負担）の1か月の自己負担額。福祉用具購入・住宅改修・食費・居住費は含めません"
          min={0}
          step={1000}
          value={userSelfPay}
          onChange={(e) => setUserSelfPay(e.target.value)}
        />
        <NumberField
          label="同じ世帯で介護サービスを使う家族の負担合計（円・任意）"
          hint="夫婦とも介護サービスを使っている場合など。いなければ空欄でOK"
          min={0}
          step={1000}
          value={householdOtherSelfPay}
          onChange={(e) => setHouseholdOtherSelfPay(e.target.value)}
        />
      </div>

      <SelectField
        label="世帯の所得区分"
        hint="世帯内の65歳以上の方の課税所得（サービス利用月の前年分）で判定します。分からない場合は市区町村にご確認ください"
        value={category}
        onChange={(e) => setCategory(e.target.value as IncomeCategory)}
      >
        {CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>

      {(category === "hikazei" || category === "hikazei-nenkin") && boundary && (
        <Callout>
          「年金収入等が低い」の基準は、前年の年金収入等（＋その他の合計所得金額）が
          <strong>{fmtYen(boundary)}円以下</strong>
          （老齢福祉年金の受給権者を含む）です（{today && today >= "2026-08-01" ? "2026年8月1日〜" : "〜2026年7月31日"}
          の基準）。この基準に当てはまる方は「非課税 かつ 年金収入等が低い」を選んでください。
        </Callout>
      )}

      {!r.ok ? (
        entered && <Callout tone="caution">{r.error}</Callout>
      ) : (
        <>
          {r.eligible ? (
            <ResultCard
              label="高額介護サービス費として払い戻される見込み額（本人分・月額）"
              value={fmtYen(r.userRefund)}
              unit="円"
              note={`負担限度額 ${fmtYen(r.appliedLimit)}円を超えた分。払い戻し後の実質負担は約${fmtYen(
                r.userNetPay,
              )}円`}
            />
          ) : (
            <Callout>
              1か月の利用者負担（{fmtYen(input.userSelfPay)}円）は、この区分の負担限度額（
              {fmtYen(r.appliedLimit)}円）以下のため、高額介護サービス費の払い戻しは発生しない見込みです。
            </Callout>
          )}

          {r.individualApplied && (
            <Callout>
              世帯非課税かつ年金収入等が低い方には、世帯の限度額（24,600円）ではなく
              <strong>個人の限度額15,000円</strong>
              を適用した方が有利なため、そちらで計算しています（介護保険法施行令の規定）。
            </Callout>
          )}

          {(input.householdOtherSelfPay ?? 0) > 0 && !r.category.individualOnly && (
            <p className="text-sm text-ink-muted">
              世帯合計 {fmtYen(r.householdTotal)}円で判定し、世帯全体の払い戻し {fmtYen(r.householdRefund)}
              円を本人の負担割合で按分しています。
            </p>
          )}

          <Callout tone="caution">
            <p className="font-medium">この金額に含まれない費用</p>
            <p className="mt-1">
              福祉用具の購入費・住宅改修費（別枠の給付）、施設の食費・居住費・日常生活費、区分支給限度基準額を超えて全額自己負担になった分は、高額介護サービス費の対象外です。
            </p>
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は介護保険法施行令に基づく<strong>目安</strong>
        です。所得区分の判定は世帯内の65歳以上の方の課税所得（年少扶養控除の調整等を含む）で行われ、月ごとに判定されます。初回は市区町村への申請が必要です。実際の該当・支給額は必ずお住まいの市区町村（介護保険担当）にご確認ください。
      </Callout>
    </div>
  );
}
