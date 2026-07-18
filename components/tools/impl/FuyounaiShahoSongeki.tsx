"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcFuyounaiShaho,
  fmtYen,
  type AgeGroup,
  type FuyounaiShahoInput,
  type Scenario,
} from "./FuyounaiShahoSongeki.calc";

/*
 * 扶養内⇄社保加入 損益分岐（P2-T04）
 * specs/s-tools/16-fuyounai-shaho-songeki.md
 * すべてクライアント内で即時計算（送信なし）。
 *
 * ★税金は含めない★ 社会保険料の負担による働き損ゾーンと損益分岐点に特化。
 *   所得税・住民税・配偶者控除・家族手当は「扶養の壁シミュレーター（fuyo-kabe）」で。
 */
export function FuyounaiShahoSongeki() {
  const [scenario, setScenario] = useState<Scenario>("join-shaho");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("under40");
  const [targetIncome, setTargetIncome] = useState("");

  const toNum = (s: string): number => {
    const v = Number(s);
    return s.trim() !== "" && Number.isFinite(v) ? v : 0;
  };

  const entered = targetIncome.trim() !== "";
  const input: FuyounaiShahoInput = { scenario, ageGroup, targetIncome: toNum(targetIncome) };
  const r = calcFuyounaiShaho(input);

  return (
    <div className="space-y-5">
      <SelectField
        label="どのパターンで働きますか"
        value={scenario}
        onChange={(e) => setScenario(e.target.value as Scenario)}
      >
        <option value="join-shaho">106万円を超えて勤務先の社会保険に加入する</option>
        <option value="self-insure">130万円を超えて扶養を外れ、自分で国民年金等に加入する</option>
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="年齢区分"
          hint="40歳以上65歳未満は介護保険料の分だけ負担が増えます"
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
        >
          <option value="under40">40歳未満</option>
          <option value="age40to64">40歳以上65歳未満</option>
        </SelectField>
        <NumberField
          label="働いた場合に想定する年収（円）"
          hint="扶養を抜けて働く場合の見込み年収を入れてください"
          min={0}
          step={10000}
          value={targetIncome}
          onChange={(e) => setTargetIncome(e.target.value)}
        />
      </div>

      {r.ok && entered && (
        <>
          <ResultCard
            label={`手取りが元に戻る損益分岐点の年収（${fmtYen(r.wall)}円の壁）`}
            value={fmtYen(r.breakEvenIncome)}
            unit="円"
            note={`壁のすぐ手前で働くときの手取りの目安 約${fmtYen(
              r.takeHomeJustBelowWall,
            )}円と同じ手取りに戻るには、これくらいの年収が必要です`}
          />

          {r.inLossZone ? (
            <Callout tone="caution">
              想定年収 {fmtYen(input.targetIncome)}円は<strong>「働き損」ゾーン</strong>
              （壁の{fmtYen(r.wall)}円〜損益分岐点{fmtYen(r.breakEvenIncome)}
              円）に入っています。この年収だと社会保険料の負担で、手取りは壁の手前より約
              {fmtYen(Math.abs(r.diffVsJustBelow))}円<strong>少なく</strong>
              なる見込みです。分岐点を超えるまで働くか、壁の手前に抑えるかの検討をおすすめします。
            </Callout>
          ) : input.targetIncome >= r.wall ? (
            <Callout>
              想定年収 {fmtYen(input.targetIncome)}円は損益分岐点を超えており、手取りは壁の手前より約
              {fmtYen(r.diffVsJustBelow)}円<strong>多く</strong>なる見込みです。
            </Callout>
          ) : (
            <Callout>
              想定年収 {fmtYen(input.targetIncome)}円は{fmtYen(r.wall)}
              円の壁の手前のため、この社会保険料の負担は発生しません。
            </Callout>
          )}

          <div className="rounded-card border border-line p-4 text-sm">
            <p className="font-medium">この年収での試算（税金は含みません）</p>
            <p className="mt-1 text-ink-muted">
              新たに発生する社会保険料（本人・年額）: 約{fmtYen(r.socialInsurance)}円 ／ 社保料を引いた手取り: 約
              {fmtYen(r.takeHome)}円
            </p>
          </div>

          {r.kokuhoNotIncluded && (
            <Callout tone="caution">
              この試算には<strong>国民健康保険料が含まれていません</strong>
              （国民年金保険料のみ）。国民健康保険料は自治体・前年所得によって大きく変わるため、実際の負担・損益分岐点はここより上になります。正確な額はお住まいの市区町村でご確認ください。なお130万円を超えても、繁忙期など一時的な収入増は事業主の証明で扶養にとどまれる場合があります。
            </Callout>
          )}

          <Callout>
            社会保険への加入は「損」だけではありません。傷病手当金・出産手当金（健康保険）や、老齢・障害・遺族の厚生年金（基礎年金への上乗せ）といった保障が手厚くなります。目先の手取りだけでなく、これらの保障も含めてご検討ください。
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は社会保険料（本人負担）のみに着目した<strong>目安</strong>で、
        <strong>所得税・住民税・配偶者（特別）控除・勤務先の家族手当は含めていません</strong>
        （税・控除まで含めた判定は「扶養の壁シミュレーター」をご利用ください）。健康保険料率は都道府県で異なり全国平均で計算しています。実際の負担は勤務先・保険者・お住まいの自治体にご確認ください。
      </Callout>
    </div>
  );
}
