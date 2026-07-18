"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import {
  folicAcidInfo,
  nutrientRows,
  shouldEmphasizeFolicSupplement,
  STATE_LABELS,
  type State,
} from "./ShokujiSesshuKijunNinpu.calc";

/*
 * 妊娠中・授乳中の栄養摂取の付加量 早見（P2-T10）
 * specs/s-tools/13-shokuji-sesshu-kijun-ninpu.md
 * すべてクライアント内で即時表示（送信なし）。
 */
export function ShokujiSesshuKijunNinpu() {
  const [state, setState] = useState<State>("early");
  const rows = nutrientRows(state);
  const fa = folicAcidInfo();
  const emphasizeFolic = shouldEmphasizeFolicSupplement(state);

  return (
    <div className="space-y-5">
      <SelectField
        label="時期を選んでください"
        value={state}
        onChange={(e) => setState(e.target.value as State)}
      >
        {(["early", "middle", "late", "lactation"] as State[]).map((s) => (
          <option key={s} value={s}>
            {STATE_LABELS[s]}
          </option>
        ))}
      </SelectField>

      {emphasizeFolic && (
        <Callout tone="caution">
          <p className="font-medium">
            妊娠を計画している方・妊娠初期の方は、サプリメント等から葉酸を1日{fa.dailyAmount}
            µg摂ることが推奨されています
          </p>
          <p className="mt-1">
            {fa.purpose}のためです（対象: {fa.targetPersons}）。ただしサプリメント由来の葉酸は摂りすぎにも注意が必要で、18〜29歳女性の耐容上限量は1日
            {fa.upperLimitFemale18to29}µgです。これは食事からの葉酸とは別に数える「狭義の葉酸」の話です。
          </p>
        </Callout>
      )}

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[360px] text-left text-sm">
          <caption className="sr-only">{STATE_LABELS[state]}の栄養素ごとの付加量</caption>
          <thead>
            <tr className="border-b border-line bg-sand-soft">
              <th className="p-2 font-medium">栄養素</th>
              <th className="p-2 font-medium">付加量（上乗せ量）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className="p-2">{r.label}</td>
                <td className="p-2">
                  <span className="tabular-nums font-bold">
                    {typeof r.addition === "number" && r.key !== "salt"
                      ? `＋${r.addition}${r.unit ? ` ${r.unit}` : ""}`
                      : r.addition}
                  </span>
                  {r.note && <span className="ml-2 text-ink-muted">（{r.note}）</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout>
        <p className="font-medium">「付加量」の意味</p>
        <p className="mt-1">
          上の数値は、同じ年齢の妊娠・授乳していないときの推奨量に<strong>上乗せする量</strong>
          です（付加量そのものが摂取目標ではありません）。食塩相当量は付加ではなく目標量（上限の目安）です。エネルギーの過不足は、推定エネルギー必要量ではなく
          <strong>BMIや体重の変化</strong>で評価します。
        </p>
      </Callout>

      <Callout>
        カフェイン・アルコール・水銀を含む魚などの「控えるべきもの」の目安は、この食事摂取基準では定められていないため本ツールでは扱っていません。これらは食品安全委員会や自治体の妊娠中の食事案内をご確認ください。
      </Callout>

      <Callout tone="caution">
        この一覧は「日本人の食事摂取基準（2025年版）」に基づく<strong>目安</strong>
        です。実際に必要な量は、妊娠前の体格・体重増加・胎児の発育状況によって個別に評価する必要があります。持病がある方・体重管理の指導を受けている方は、必ず主治医・管理栄養士・助産師にご相談ください。
      </Callout>
    </div>
  );
}
