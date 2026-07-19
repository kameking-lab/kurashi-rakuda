"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { calcDenkidai, fmtYen, DEFAULT_TANKA_YEN_PER_KWH } from "./KadenDenkidaiKeisan.calc";

/*
 * 家電別電気代計算（P4-T01）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcDenkidai）は KadenDenkidaiKeisan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 */

export function KadenDenkidaiKeisan() {
  const [wattageInput, setWattageInput] = useState("1000");
  const [hoursInput, setHoursInput] = useState("1");
  const [tankaInput, setTankaInput] = useState(String(DEFAULT_TANKA_YEN_PER_KWH));

  const wattageW = wattageInput === "" ? NaN : Number(wattageInput);
  const hoursPerDay = hoursInput === "" ? NaN : Number(hoursInput);
  const unitPrice = tankaInput === "" ? NaN : Number(tankaInput);

  const anyEmpty = wattageInput === "" || hoursInput === "" || tankaInput === "";
  const result = calcDenkidai(wattageW, hoursPerDay, unitPrice);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="消費電力（W）"
          value={wattageInput}
          min={0}
          step="1"
          onChange={(e) => setWattageInput(e.target.value)}
          hint="本体の定格表示・取扱説明書に記載の「消費電力」を入力"
        />
        <NumberField
          label="1日の使用時間（時間）"
          value={hoursInput}
          min={0}
          max={24}
          step="0.5"
          onChange={(e) => setHoursInput(e.target.value)}
        />
        <NumberField
          label="電気料金の単価（円/kWh）"
          value={tankaInput}
          min={0}
          step="0.1"
          onChange={(e) => setTankaInput(e.target.value)}
          hint="家電公取協の目安単価（31円）を初期値にしています。契約中の電力会社の単価に書き換え可能"
        />
      </div>

      {anyEmpty && <Callout>すべての項目を入れると、その場で電気代の目安を計算します。</Callout>}

      {!anyEmpty && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {!anyEmpty && result.ok && (
        <div className="space-y-4">
          <ResultCard
            label="1か月（30日換算）の電気代の目安"
            value={fmtYen(result.monthlyYen)}
            unit="円"
            note={`1日あたり${fmtYen(result.dailyYen)}円 ／ 1年（365日換算）で${fmtYen(result.yearlyYen)}円`}
          />

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">内訳</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              <li>1日の消費電力量: 約{result.dailyKwh.toFixed(2)}kWh</li>
              <li>消費電力: {result.wattageW}W ／ 使用時間: {result.hoursPerDay}時間/日</li>
              <li>単価: {result.unitPriceYenPerKwh}円/kWh</li>
            </ul>
          </div>

          <Callout>
            実際の電気代は契約中の電力会社・料金プラン（基本料金・段階制の従量単価）や、機器の運転モード（強弱・自動運転）によって変わります。この金額はあくまで目安です。
          </Callout>
        </div>
      )}
    </div>
  );
}
