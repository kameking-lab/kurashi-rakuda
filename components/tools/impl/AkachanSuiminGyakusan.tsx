"use client";

import { useState } from "react";
import { NumberField, SelectField, TimeField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  AGE_BRACKET_OPTIONS,
  AKACHAN_SUIMIN_DISCLAIMER,
  calcAkachanSuiminGyakusan,
  DEFAULT_OYA_HITSUYOU_JIKAN_H,
  INFANT_UNDER_1_DATA,
  type AgeBracketCode,
} from "./AkachanSuiminGyakusan.calc";

/*
 * 赤ちゃん連動 睡眠逆算（P2-T32）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcAkachanSuiminGyakusan）は AkachanSuiminGyakusan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 *
 * ★1歳未満の扱い★ 厚生労働省「健康づくりのための睡眠ガイド2023」に1歳未満の乳児の
 * 推奨睡眠時間（時間数）の記載がないため、1歳未満を選んだ場合は推奨レンジとの比較を行わず、
 * ガイドに実際に書かれている定性的な情報のみを表示する（架空の数値は出さない）。
 */

const CLASSIFICATION_LABEL: Record<string, string> = {
  SHORT: "目安より短めです",
  WITHIN: "目安の範囲内です",
  LONG: "目安より長めです",
};

export function AkachanSuiminGyakusan() {
  const [ageBracket, setAgeBracket] = useState<AgeBracketCode>("TODDLER_1_2");
  const [nesetsukeJikoku, setNesetsukeJikoku] = useState("20:00");
  const [kishouJikoku, setKishouJikoku] = useState("07:00");
  const [oyaHitsuyouInput, setOyaHitsuyouInput] = useState(String(DEFAULT_OYA_HITSUYOU_JIKAN_H));
  const [bufferInput, setBufferInput] = useState("30");

  const oyaHitsuyouJikanH = oyaHitsuyouInput === "" ? NaN : Number(oyaHitsuyouInput);
  const bufferMin = bufferInput === "" ? NaN : Number(bufferInput);

  const result = calcAkachanSuiminGyakusan({
    ageBracket,
    nesetsukeJikoku,
    kishouJikoku,
    oyaHitsuyouJikanH,
    bufferMin,
  });

  return (
    <div className="space-y-4">
      <SelectField
        label="赤ちゃん・お子さまの年齢区分"
        value={ageBracket}
        onChange={(e) => setAgeBracket(e.target.value as AgeBracketCode)}
        hint="厚生労働省「健康づくりのための睡眠ガイド2023」の年齢区分に対応しています"
      >
        {AGE_BRACKET_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </SelectField>

      {ageBracket === "INFANT_UNDER_1" && (
        <Callout>
          「健康づくりのための睡眠ガイド2023」には、1歳未満の乳児について時間数で示した推奨睡眠時間の記載がありません。そのため、推奨レンジとの比較は行わず、下の計算結果は入力した時刻からの目安のみを表示します。
        </Callout>
      )}

      <TimeField
        label="赤ちゃん・お子さまの就寝予定時刻"
        value={nesetsukeJikoku}
        onChange={(e) => setNesetsukeJikoku(e.target.value)}
        hint="寝かしつけを始める時刻ではなく、実際に眠りにつく予定の時刻です"
      />

      <TimeField
        label="赤ちゃん・お子さまの起床予定時刻"
        value={kishouJikoku}
        onChange={(e) => setKishouJikoku(e.target.value)}
        hint="就寝予定時刻より前・同じ時刻を入力すると、日をまたぐ睡眠として計算します"
      />

      <NumberField
        label="保護者自身の必要睡眠時間（時間）"
        value={oyaHitsuyouInput}
        min={0}
        max={24}
        step={0.5}
        inputMode="decimal"
        onChange={(e) => setOyaHitsuyouInput(e.target.value)}
        hint="初期値6時間は、同ガイドの成人の目安「6時間以上を目安として必要な睡眠時間を確保する」に基づく初期値です。ご自身に合わせて調整してください"
      />

      <NumberField
        label="寝かしつけ・夜泣き対応等にかかる時間（分）"
        value={bufferInput}
        min={0}
        step={5}
        inputMode="numeric"
        onChange={(e) => setBufferInput(e.target.value)}
        hint="赤ちゃんを寝かしつけてから自分が眠りにつくまでの時間や、夜泣き対応で睡眠が中断される分を見込んだ余裕時間です"
      />

      {!result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label="保護者の就寝時刻の目安"
            value={result.oyaShuushin.label}
            note={
              result.oyaShuushin.dayOffset >= 1
                ? "日付が変わったあと（未明・早朝）の時刻です"
                : "赤ちゃん・お子さまの起床予定時刻から、必要な睡眠時間と寝かしつけ・夜泣き対応の時間を差し引いた目安です"
            }
          />

          {!result.oyaShuushin.sufficientWindow && (
            <Callout tone="caution">
              赤ちゃん・お子さまの就寝〜起床の時間枠の中には、入力した必要睡眠時間と寝かしつけ・夜泣き対応の時間がすべては収まっていない可能性があります。就寝時刻を早める、パートナーや家族と対応を分担する等、無理のない範囲で調整をご検討ください。
            </Callout>
          )}

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">赤ちゃん・お子さまの推定睡眠時間（参考）</p>
            <p className="mt-1 text-ink-muted">{result.akachanSuimin.label}</p>
            {result.akachanSuimin.category && (
              <p className="mt-1 text-ink-muted">
                {result.akachanSuimin.category.label}の推奨睡眠時間の目安は「{result.akachanSuimin.category.rangeLabel}
                」（厚生労働省「健康づくりのための睡眠ガイド2023」）。今回の入力は
                {CLASSIFICATION_LABEL[result.akachanSuimin.classification] ?? ""}
                。睡眠時間には個人差があり、この範囲から外れることが直ちに問題を意味するわけではありません。
              </p>
            )}
            {ageBracket === "INFANT_UNDER_1" && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
                {INFANT_UNDER_1_DATA.qualitativeNotes.map((n) => (
                  <li key={n.text}>{n.text}</li>
                ))}
              </ul>
            )}
          </div>

          <Callout>{AKACHAN_SUIMIN_DISCLAIMER}</Callout>
        </div>
      )}
    </div>
  );
}
