"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  bandsOf,
  calcSeichou,
  fmtValue,
  measureLabel,
  measureUnit,
  PERCENTILES,
  SEICHOU_EDITION,
  type Measure,
  type Sex,
} from "./SeichouKyokusen.calc";

/*
 * 成長曲線プロット（パーセンタイル）（P2-T12）
 * specs/s-tools/19-seichou-kyokusen.md
 * すべてクライアント内で即時計算（送信なし）。
 *
 * ★医学的な正常/異常の判定はしない★ 実測値がパーセンタイルのどこにあるかを示すのみ。
 */
export function SeichouKyokusen() {
  const [measure, setMeasure] = useState<Measure>("weight");
  const [sex, setSex] = useState<Sex>("male");
  const [bandKey, setBandKey] = useState("birth");
  const [value, setValue] = useState("");

  const bands = bandsOf(measure);
  const effectiveBandKey = bands.some((b) => b.key === bandKey) ? bandKey : bands[0].key;
  const unit = measureUnit(measure);

  const num = value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : NaN;
  const entered = value.trim() !== "" && Number.isFinite(num);
  const r = calcSeichou({ measure, sex, bandKey: effectiveBandKey, value: num });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="測定項目"
          value={measure}
          onChange={(e) => {
            const m = e.target.value as Measure;
            setMeasure(m);
            if (!bandsOf(m).some((b) => b.key === bandKey)) setBandKey(bandsOf(m)[0].key);
          }}
        >
          <option value="weight">体重</option>
          <option value="height">身長</option>
          <option value="head">頭囲</option>
        </SelectField>
        <SelectField label="性別" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
          <option value="male">男の子</option>
          <option value="female">女の子</option>
        </SelectField>
        <SelectField
          label="月齢・年齢"
          value={effectiveBandKey}
          onChange={(e) => setBandKey(e.target.value)}
        >
          {bands.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </SelectField>
      </div>

      <NumberField
        label={`実測した${measureLabel(measure)}（${unit}）`}
        hint={
          unit === "kg"
            ? "小数第2位まで入力できます（例: 5.75）"
            : "小数第1位まで入力できます（例: 62.3）"
        }
        min={0}
        step={unit === "kg" ? 0.01 : 0.1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      {!r.ok ? (
        entered && <Callout tone="caution">{r.error}</Callout>
      ) : (
        entered && (
          <>
            <ResultCard
              label={`${r.band.label}の${measureLabel(measure)}の位置`}
              value={r.position.label}
              note={`中央値（50パーセンタイル）は ${fmtValue(r.median, unit)}。入力値との差は ${
                r.position.diffFromMedian >= 0 ? "+" : ""
              }${r.position.diffFromMedian}${unit}`}
            />

            {/* パーセンタイル・スケール */}
            <div className="rounded-card border border-line p-4">
              <p className="mb-6 text-sm font-medium">
                パーセンタイルの位置（{PERCENTILES[0]}〜{PERCENTILES[PERCENTILES.length - 1]}パーセンタイル）
              </p>
              <div className="relative mx-2 h-2 rounded-full bg-sand-soft">
                {/* 目盛 */}
                {r.markerRatios.map((ratio, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${ratio * 100}%` }}
                  >
                    <div className="h-3 w-px bg-line" />
                    <div className="mt-1 -translate-x-1/2 text-[10px] text-ink-muted">
                      {PERCENTILES[i]}
                    </div>
                    <div className="-translate-x-1/2 text-[10px] tabular-nums text-ink-muted">
                      {r.values[i]}
                    </div>
                  </div>
                ))}
                {/* 実測値マーカー */}
                <div
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${r.plotRatio * 100}%` }}
                >
                  <div
                    className="size-4 rounded-full border-2 border-result-ink bg-result-bg"
                    aria-label={`実測値 ${fmtValue(num, unit)}の位置`}
                  />
                </div>
              </div>
              <p className="mt-8 text-center text-sm">
                入力値 <strong>{fmtValue(num, unit)}</strong>
              </p>
            </div>

            {(r.position.zone === "below" || r.position.zone === "above") && (
              <Callout>
                {r.position.zone === "below"
                  ? "同じ月齢・性別のお子さんの中では小さめ（下位3%以内）の値です。"
                  : "同じ月齢・性別のお子さんの中では大きめ（上位3%以内）の値です。"}
                これは統計的な位置を示すもので、それ自体が問題を意味するわけではありません。成長には個人差があり、大切なのは1点の値よりも
                <strong>成長の曲線（増え方の傾き）</strong>
                です。気になる場合は乳幼児健診や小児科でご相談ください。
              </Callout>
            )}
          </>
        )
      )}

      <Callout>
        パーセンタイルは「同じ月齢・性別の子どもを小さい順に100人並べたとき、下から何番目あたりか」を表す目安です。たとえば25〜50パーセンタイルの間なら、100人中おおよそ25〜50番目の範囲にいる、という見方をします。3〜97パーセンタイルの間に約94%の子どもが入ります。
      </Callout>

      <Callout tone="caution">
        このツールは{SEICHOU_EDITION}のパーセンタイル値をもとに、入力値の統計的な位置を示すものです。
        <strong>発育が正常か・異常かを判定するものではありません。</strong>
        母子健康手帳の発育曲線は版によって基づく調査年が異なる場合があり、数値がわずかに異なることがあります。発育の評価は1回の測定値だけでなく経過（曲線の傾き）で見る必要があるため、心配なことがあれば必ず乳幼児健診・かかりつけの小児科でご相談ください。
      </Callout>
    </div>
  );
}
