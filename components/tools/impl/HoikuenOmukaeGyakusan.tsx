"use client";

import { useState } from "react";
import { NumberField, TimeField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { calcGyakusan, HOIKUEN_OMUKAE_DISCLAIMER } from "./HoikuenOmukaeGyakusan.calc";

/*
 * 保育園お迎え逆算 勤務可能時間計算（P2-T35）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcGyakusan）は HoikuenOmukaeGyakusan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 * 制度・統計データに一切依存しない、純粋な時刻演算のみのツール。
 */

export function HoikuenOmukaeGyakusan() {
  const [omukaeShimekiri, setOmukaeShimekiri] = useState("18:00");
  const [shokubaToHoikuenInput, setShokubaToHoikuenInput] = useState("20");
  const [hoikuenToShokubaInput, setHoikuenToShokubaInput] = useState("20");
  const [bufferInput, setBufferInput] = useState("10");
  const [shukkinJikoku, setShukkinJikoku] = useState("");

  const shokubaToHoikuenMin = shokubaToHoikuenInput === "" ? NaN : Number(shokubaToHoikuenInput);
  const hoikuenToShokubaMin = hoikuenToShokubaInput === "" ? NaN : Number(hoikuenToShokubaInput);
  const bufferMin = bufferInput === "" ? NaN : Number(bufferInput);

  const result = calcGyakusan({
    omukaeShimekiri,
    shokubaToHoikuenMin,
    hoikuenToShokubaMin,
    bufferMin,
    shukkinJikoku,
  });

  return (
    <div className="space-y-4">
      <TimeField
        label="保育園のお迎え締切時刻"
        value={omukaeShimekiri}
        onChange={(e) => setOmukaeShimekiri(e.target.value)}
        hint="延長保育を使わない場合の締切時刻を入力してください"
      />

      <NumberField
        label="職場から保育園までの移動時間（分）"
        value={shokubaToHoikuenInput}
        min={0}
        step={1}
        inputMode="numeric"
        onChange={(e) => setShokubaToHoikuenInput(e.target.value)}
        hint="退勤限界時刻の計算に使います"
      />

      <NumberField
        label="保育園から職場までの移動時間（分）"
        value={hoikuenToShokubaInput}
        min={0}
        step={1}
        inputMode="numeric"
        onChange={(e) => setHoikuenToShokubaInput(e.target.value)}
        hint="朝、出勤時刻に間に合わせるための参考表示に使います（任意で出勤時刻とあわせて入力）"
      />

      <NumberField
        label="退勤後の準備時間・バッファ（分）"
        value={bufferInput}
        min={0}
        step={1}
        inputMode="numeric"
        onChange={(e) => setBufferInput(e.target.value)}
        hint="片付け・退勤打刻・職場を出るまでの余裕時間"
      />

      <TimeField
        label="出勤時刻・勤務開始時刻（任意）"
        value={shukkinJikoku}
        onChange={(e) => setShukkinJikoku(e.target.value)}
        hint="入力すると、その日の実労働可能時間も計算します"
      />

      {!result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label="この時刻までに退勤する必要があります（退勤限界時刻）"
            value={result.taikinGenkaiLabel}
            note="お迎え締切時刻から、職場→保育園の移動時間と準備時間（バッファ）を差し引いた目安です"
          />

          {result.workable && (
            <ResultCard
              label="その日の実労働可能時間の目安"
              value={result.workable.label}
              note={`出勤時刻から退勤限界時刻（${result.taikinGenkaiLabel}）までの時間です`}
            />
          )}

          {result.asaShuppatsu && (
            <div className="rounded-card border border-line p-4 text-sm sm:text-base">
              <p className="font-medium">朝、保育園を出発する目安時刻（参考）</p>
              <p className="mt-1 text-ink-muted">
                {result.asaShuppatsu.possible
                  ? `${result.asaShuppatsu.label} ごろ（保育園から職場までの移動時間から逆算）`
                  : result.asaShuppatsu.label}
              </p>
            </div>
          )}

          {!result.workable && (
            <Callout>
              出勤時刻を入力すると、その日の実労働可能時間もあわせて計算します。
            </Callout>
          )}

          <Callout>{HOIKUEN_OMUKAE_DISCLAIMER}</Callout>
        </div>
      )}
    </div>
  );
}
