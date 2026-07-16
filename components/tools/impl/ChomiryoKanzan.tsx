"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";

/*
 * 調味料換算（Q3-14）— ツールテンプレート検証用リファレンス実装。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 比重データの本整備は Q2-4（packages/data 相当）で行い、ここは主要18種の参考値。
 */

/** 大さじ1杯（15ml）あたりのグラム数（一般的な調理用計量表の参考値） */
const INGREDIENTS: { name: string; gPerTbsp: number }[] = [
  { name: "水", gPerTbsp: 15 },
  { name: "しょうゆ", gPerTbsp: 18 },
  { name: "みりん", gPerTbsp: 18 },
  { name: "料理酒", gPerTbsp: 15 },
  { name: "酢", gPerTbsp: 15 },
  { name: "みそ", gPerTbsp: 18 },
  { name: "砂糖（上白糖）", gPerTbsp: 9 },
  { name: "塩", gPerTbsp: 18 },
  { name: "小麦粉（薄力粉）", gPerTbsp: 9 },
  { name: "片栗粉", gPerTbsp: 9 },
  { name: "サラダ油", gPerTbsp: 12 },
  { name: "バター", gPerTbsp: 12 },
  { name: "マヨネーズ", gPerTbsp: 12 },
  { name: "ケチャップ", gPerTbsp: 18 },
  { name: "はちみつ", gPerTbsp: 21 },
  { name: "牛乳", gPerTbsp: 15 },
  { name: "生クリーム", gPerTbsp: 15 },
  { name: "めんつゆ", gPerTbsp: 18 },
];

const UNITS = ["大さじ", "小さじ", "g", "ml"] as const;
type Unit = (typeof UNITS)[number];

function toMl(amount: number, unit: Unit, gPerTbsp: number): number {
  switch (unit) {
    case "大さじ":
      return amount * 15;
    case "小さじ":
      return amount * 5;
    case "ml":
      return amount;
    case "g":
      return amount / (gPerTbsp / 15);
  }
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("ja-JP");
}

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
