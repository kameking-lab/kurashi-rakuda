"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calculateYoujiMushouka,
  classifyAgeGroup,
  CLASS_AGE_MIN,
  CLASS_AGE_MAX,
  FACILITY_META,
  FACILITY_TYPES,
  YOUJI_MUSHOUKA_DISCLAIMER,
  type FacilityType,
  type MushoukaStatus,
} from "./YoujiMushoukaChecker.calc";

/*
 * 幼児教育・保育無償化 対象チェッカー（P2-T19）。
 * クラス年齢・利用施設の種別・（0〜2歳児クラスのみ）住民税課税状況を選ぶと、
 * その場で対象／対象外／条件付き対象と、月額上限・必要な手続きを表示する
 * （送信なし・クライアント内計算）。
 */

const CLASS_AGE_OPTIONS = Array.from(
  { length: CLASS_AGE_MAX - CLASS_AGE_MIN + 1 },
  (_, i) => CLASS_AGE_MIN + i,
);

const STATUS_TONE: Record<MushoukaStatus, "info" | "caution"> = {
  target: "info",
  notTarget: "caution",
  conditional: "caution",
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

export function YoujiMushoukaChecker() {
  const [classAge, setClassAge] = useState<number>(4);
  const [facilityType, setFacilityType] = useState<FacilityType>("ninkaHoikusho");
  const [nonTaxableHousehold, setNonTaxableHousehold] = useState<"" | "true" | "false">("");

  const ageGroup = classifyAgeGroup(classAge);
  const needsTaxField = ageGroup === "nonTaxable";

  const calc = calculateYoujiMushouka({
    classAge,
    facilityType,
    nonTaxableHousehold: needsTaxField
      ? nonTaxableHousehold === ""
        ? undefined
        : nonTaxableHousehold === "true"
      : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="お子さまのクラス年齢"
          value={classAge}
          onChange={(e) => setClassAge(Number(e.target.value))}
          hint="4月1日時点の満年齢（クラス年齢）を選んでください"
        >
          {CLASS_AGE_OPTIONS.map((age) => (
            <option key={age} value={age}>
              {age}歳児クラス
            </option>
          ))}
        </SelectField>

        <SelectField
          label="利用施設の種別"
          value={facilityType}
          onChange={(e) => setFacilityType(e.target.value as FacilityType)}
        >
          {FACILITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {FACILITY_META[type].label}
            </option>
          ))}
        </SelectField>

        {needsTaxField && (
          <SelectField
            label="世帯の住民税課税状況"
            value={nonTaxableHousehold}
            onChange={(e) => setNonTaxableHousehold(e.target.value as "" | "true" | "false")}
            hint="0〜2歳児クラスは住民税非課税世帯かどうかで対象が変わります"
          >
            <option value="">選択してください</option>
            <option value="true">住民税非課税世帯</option>
            <option value="false">住民税課税世帯</option>
          </SelectField>
        )}
      </div>

      {!calc.ok && (
        <Callout tone="caution">{calc.error}</Callout>
      )}

      {calc.ok && (
        <>
          <ResultCard
            label="判定結果"
            value={calc.result.statusLabel}
            note={
              calc.result.monthlyCap !== null
                ? `月額上限 ${fmt(calc.result.monthlyCap)}円${
                    calc.result.monthlyCapSource ? `（${calc.result.monthlyCapSource}）` : ""
                  }`
                : calc.result.status === "notTarget"
                  ? undefined
                  : "月額上限の定めなし、または上限額データが未収録です（下記の注記を参照）"
            }
          />

          {calc.result.notes.length > 0 && (
            <Callout tone={STATUS_TONE[calc.result.status]}>
              <ul className="list-disc space-y-1 pl-4">
                {calc.result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Callout>
          )}

          {calc.result.procedures.length > 0 && (
            <Callout>
              <p className="font-medium">必要な手続き</p>
              <ul className="list-disc space-y-1 pl-4">
                {calc.result.procedures.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </Callout>
          )}
        </>
      )}

      <Callout tone="caution">{YOUJI_MUSHOUKA_DISCLAIMER}</Callout>
    </div>
  );
}
