"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { fmt, INGREDIENTS, toMl, UNITS, type Unit } from "./ChomiryoKanzan.calc";

/*
 * 調味料換算（Q3-14）— ツールテンプレート検証用リファレンス実装。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（toMl / fmt / INGREDIENTS）は ChomiryoKanzan.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 */

export function ChomiryoKanzan() {
  const [ingredient, setIngredient] = useState(INGREDIENTS[1].name);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<Unit>("大さじ");

  const item = INGREDIENTS.find((i) => i.name === ingredient) ?? INGREDIENTS[0];
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  const ml = valid ? toMl(parsed, unit, item.gPerTbsp) : 0;
  const g = ml * (item.gPerTbsp / 15);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="調味料"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
        >
          {INGREDIENTS.map((i) => (
            <option key={i.name} value={i.name}>
              {i.name}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="量"
          value={amount}
          min={0}
          step="0.1"
          onChange={(e) => setAmount(e.target.value)}
        />
        <SelectField
          label="単位"
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </SelectField>
      </div>

      {valid ? (
        <ResultCard
          label={`${item.name} ${unit === "g" || unit === "ml" ? `${fmt(parsed)}${unit}` : `${unit}${fmt(parsed)}`} は`}
          value={`${fmt(g)}`}
          unit="g"
          note={`大さじ ${fmt(ml / 15)} 杯 ／ 小さじ ${fmt(ml / 5)} 杯 ／ ${fmt(ml)} ml`}
        />
      ) : (
        <Callout>量を入れると、その場で換算します。</Callout>
      )}
    </div>
  );
}
