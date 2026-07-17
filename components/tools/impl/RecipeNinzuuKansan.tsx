"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { fmtAmount, fmtRatio, scaleRecipe, type Ingredient } from "./RecipeNinzuuKansan.calc";

/*
 * レシピ人数スケール換算（P2-T22）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（scaleRecipe）は RecipeNinzuuKansan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 * UIの複数行入力パターンはChomiryoKanzan.tsxを参考にしつつ、動的な追加・削除に拡張した。
 */

interface Row {
  id: number;
  name: string;
  amount: string;
  unit: string;
}

let nextId = 3;

const initialRows: Row[] = [
  { id: 1, name: "米", amount: "2", unit: "合" },
  { id: 2, name: "醤油", amount: "2", unit: "大さじ" },
];

export function RecipeNinzuuKansan() {
  const [fromInput, setFromInput] = useState("4");
  const [toInput, setToInput] = useState("6");
  const [rows, setRows] = useState<Row[]>(initialRows);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { id: nextId++, name: "", amount: "", unit: "" }]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const fromNinzuu = fromInput === "" ? NaN : Number(fromInput);
  const toNinzuu = toInput === "" ? NaN : Number(toInput);
  const ingredients: Ingredient[] = rows.map((r) => ({
    name: r.name,
    amount: r.amount === "" ? NaN : Number(r.amount),
    unit: r.unit,
  }));

  const result = scaleRecipe(fromNinzuu, toNinzuu, ingredients);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="元の人数（レシピに書かれている人数）"
          value={fromInput}
          min={0}
          step="0.5"
          onChange={(e) => setFromInput(e.target.value)}
          hint="例: レシピが「4人分」なら4"
        />
        <NumberField
          label="目標の人数（作りたい人数）"
          value={toInput}
          min={0}
          step="0.5"
          onChange={(e) => setToInput(e.target.value)}
          hint="例: 6人分作りたいなら6"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">材料一覧</p>
        <div className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 text-xs text-ink-muted">
          <span>材料名</span>
          <span>分量</span>
          <span>単位</span>
          <span aria-hidden="true"></span>
        </div>
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[1fr_5rem_5rem_auto] items-end gap-2">
            <input
              type="text"
              aria-label={`材料名${i + 1}`}
              placeholder="材料名（例: 米）"
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              className="min-h-12 w-full rounded-card border border-line bg-paper px-3 text-base text-ink"
            />
            <input
              type="number"
              inputMode="decimal"
              aria-label={`分量${i + 1}`}
              placeholder="分量"
              value={row.amount}
              onChange={(e) => updateRow(row.id, { amount: e.target.value })}
              className="min-h-12 w-full rounded-card border border-line bg-paper px-3 text-base text-ink"
            />
            <input
              type="text"
              aria-label={`単位${i + 1}`}
              placeholder="単位（g等）"
              value={row.unit}
              onChange={(e) => updateRow(row.id, { unit: e.target.value })}
              className="min-h-12 w-full rounded-card border border-line bg-paper px-3 text-base text-ink"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => removeRow(row.id)}
              aria-label={`${i + 1}行目の材料を削除`}
            >
              削除
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addRow}>
          材料を追加
        </Button>
      </div>

      {!result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label="倍率"
            value={fmtRatio(result.ratio)}
            note={`元の人数${fmtAmount(fromNinzuu)}人分 → 目標の人数${fmtAmount(toNinzuu)}人分`}
          />

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">スケール後の分量</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {result.items.map((item, i) => (
                <li key={i}>
                  {item.name}: {fmtAmount(item.amount)}
                  {item.unit} → <span className="font-medium text-ink">{fmtAmount(item.scaledAmount)}{item.unit}</span>
                  {item.clampedToMin && "（表示上の最小値に調整）"}
                </li>
              ))}
            </ul>
          </div>

          <Callout>
            調味料や香辛料、加熱時間・加熱方法は人数分そのまま倍にすると味や仕上がりが変わることがあります。分量の比例計算はあくまで目安とし、味見をしながら調整してください。
          </Callout>
        </div>
      )}
    </div>
  );
}
