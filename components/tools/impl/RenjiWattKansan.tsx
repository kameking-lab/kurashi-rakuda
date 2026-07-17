"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcRenjiKanzan,
  formatByou,
  WATT_PRESETS,
  CHUUI_JIKOU_TEXT,
} from "./RenjiWattKansan.calc";

/*
 * 電子レンジ ワット数・加熱時間換算（P2-T26）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcRenjiKanzan）は RenjiWattKansan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 */

function PresetButtons({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (w: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {WATT_PRESETS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onSelect(w)}
          className={`min-h-9 rounded-card border px-3 text-sm font-medium ${
            current === String(w)
              ? "border-line bg-sand-soft text-ink"
              : "border-line text-ink-muted"
          }`}
        >
          {w}W
        </button>
      ))}
    </div>
  );
}

export function RenjiWattKansan() {
  const [motoWInput, setMotoWInput] = useState("500");
  const [motoJikanInput, setMotoJikanInput] = useState("500");
  const [henkoWInput, setHenkoWInput] = useState("600");

  const motoW = motoWInput === "" ? NaN : Number(motoWInput);
  const motoJikan = motoJikanInput === "" ? NaN : Number(motoJikanInput);
  const henkoW = henkoWInput === "" ? NaN : Number(henkoWInput);

  const hasAllInputs = motoWInput !== "" && motoJikanInput !== "" && henkoWInput !== "";
  const result = calcRenjiKanzan(motoW, motoJikan, henkoW);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <NumberField
            label="元のワット数"
            value={motoWInput}
            min={0}
            step="10"
            onChange={(e) => setMotoWInput(e.target.value)}
          />
          <PresetButtons current={motoWInput} onSelect={(w) => setMotoWInput(String(w))} />
        </div>

        <NumberField
          label="元の加熱時間（秒）"
          value={motoJikanInput}
          min={0}
          step="10"
          onChange={(e) => setMotoJikanInput(e.target.value)}
          hint="例: 2分なら120秒"
        />

        <div className="space-y-2">
          <NumberField
            label="変更後のワット数"
            value={henkoWInput}
            min={0}
            step="10"
            onChange={(e) => setHenkoWInput(e.target.value)}
          />
          <PresetButtons current={henkoWInput} onSelect={(w) => setHenkoWInput(String(w))} />
        </div>
      </div>

      {!hasAllInputs && (
        <Callout>元のワット数・元の加熱時間・変更後のワット数を入れると、その場で目安の時間を計算します。</Callout>
      )}

      {hasAllInputs && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label={`${result.henkoW}Wでの加熱時間の目安`}
            value={formatByou(result.henkoJikanByou)}
            note={`${result.motoW}Wで${formatByou(result.motoJikanByou)}（${result.motoJikanByou}秒）→ ${result.henkoW}Wで約${result.henkoJikanByou}秒`}
          />

          <Callout tone="caution">{CHUUI_JIKOU_TEXT}</Callout>
        </div>
      )}
    </div>
  );
}
