"use client";

import { useMemo, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcKougakuGassan,
  fmtYen,
  groupTiers,
  resolveGroup,
  type KougakuGassanInput,
} from "./KougakuIryouKaigoGassan.calc";

/*
 * 高額医療・高額介護合算療養費 チェック（P2-T07）
 * specs/s-tools/11-kougaku-iryou-kaigo-gassan.md
 * すべてクライアント内で即時計算（送信なし）。
 */
type Insurer = "kenpo" | "kokuho" | "kourei";

export function KougakuIryouKaigoGassan() {
  const [insurer, setInsurer] = useState<Insurer>("kokuho");
  const [over70, setOver70] = useState(true);
  const [tierKey, setTierKey] = useState("ippan");
  const [annualMedical, setAnnualMedical] = useState("");
  const [annualKaigo, setAnnualKaigo] = useState("");

  const group = resolveGroup(insurer, insurer === "kourei" ? true : over70);
  const tiers = useMemo(() => groupTiers(group), [group]);
  const effectiveTierKey = tiers.some((t) => t.key === tierKey) ? tierKey : tiers[0].key;

  const toNum = (s: string): number => {
    const v = Number(s);
    return s.trim() !== "" && Number.isFinite(v) ? v : 0;
  };

  const entered = annualMedical.trim() !== "" || annualKaigo.trim() !== "";
  const input: KougakuGassanInput = {
    group,
    tierKey: effectiveTierKey,
    annualMedical: toNum(annualMedical),
    annualKaigo: toNum(annualKaigo),
  };
  const r = calcKougakuGassan(input);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="加入している医療保険"
          value={insurer}
          onChange={(e) => setInsurer(e.target.value as Insurer)}
        >
          <option value="kenpo">健康保険（会社員・被用者保険）</option>
          <option value="kokuho">国民健康保険</option>
          <option value="kourei">後期高齢者医療（75歳以上等）</option>
        </SelectField>
        {insurer !== "kourei" && (
          <SelectField
            label="年齢区分"
            value={over70 ? "over70" : "under70"}
            onChange={(e) => setOver70(e.target.value === "over70")}
          >
            <option value="under70">70歳未満</option>
            <option value="over70">70歳以上</option>
          </SelectField>
        )}
      </div>

      <SelectField
        label="所得区分"
        hint="分からない場合は、加入先の保険者（健保組合・市区町村）にご確認ください"
        value={effectiveTierKey}
        onChange={(e) => setTierKey(e.target.value)}
      >
        {tiers.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}（限度額 {fmtYen(t.limit)}円）
          </option>
        ))}
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="1年間の医療保険の自己負担額（円）"
          hint="毎年8月〜翌年7月。高額療養費で払い戻された分を差し引いた後の額。入院時の食費・差額ベッド代は含めません"
          min={0}
          step={10000}
          value={annualMedical}
          onChange={(e) => setAnnualMedical(e.target.value)}
        />
        <NumberField
          label="1年間の介護保険の自己負担額（円）"
          hint="高額介護サービス費で払い戻された分を差し引いた後の額。施設の食費・居住費は含めません"
          min={0}
          step={10000}
          value={annualKaigo}
          onChange={(e) => setAnnualKaigo(e.target.value)}
        />
      </div>

      {r.ok && entered && (
        <>
          {r.paid ? (
            <ResultCard
              label="高額医療・高額介護合算療養費として支給される見込み額（年額）"
              value={fmtYen(r.totalRefund)}
              unit="円"
              note={`合算額 ${fmtYen(r.combined)}円 − 基準額 ${fmtYen(r.limit)}円。医療保険者から約${fmtYen(
                r.medicalPortion,
              )}円・介護保険者から約${fmtYen(r.kaigoPortion)}円が別々に支給されます`}
            />
          ) : !r.bothPresent ? (
            <Callout tone="caution">
              高額医療・高額介護合算療養費は、<strong>医療保険と介護保険の両方に自己負担がある</strong>
              場合に支給されます。どちらか一方が0円の場合は対象になりません。
            </Callout>
          ) : r.excess < 0 ? (
            <Callout>
              1年間の合算額（{fmtYen(r.combined)}円）は、この所得区分の基準額（{fmtYen(r.limit)}
              円）以下のため、支給は発生しない見込みです。
            </Callout>
          ) : (
            <Callout>
              基準額を超えた額（{fmtYen(r.excess)}円）が支給の最低額（501円）に満たないため、支給されない見込みです。
            </Callout>
          )}

          <Callout>
            計算期間は毎年8月1日〜翌年7月31日の1年間です。入力する自己負担額は、
            <strong>高額療養費・高額介護サービス費で払い戻された分を先に差し引いた後の額</strong>
            にしてください（この合算制度は最後に適用されます）。入院時の食費・差額ベッド代・施設の食費居住費は合算対象外です。
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は健康保険法施行令・介護保険法施行令等に基づく<strong>目安</strong>
        です。実際の合算対象額や所得区分の判定は保険者が行い、申請しないと支給されません（基準日7月31日時点で加入する介護保険者に自己負担額証明書の交付を申請 → 医療保険者に支給申請）。なお、令和8年8月から高額療養費制度が見直される予定です。実際の該当・支給額は必ず加入先の保険者・市区町村にご確認ください。
      </Callout>
    </div>
  );
}
