"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  CHOMIRYO_LABELS,
  DISHES,
  formatAmount,
  fmt,
  getDish,
  scaleDish,
  scaleDishByServings,
} from "./AjitsukeOugonhi.calc";

/*
 * 味付け黄金比計算（P2-T21）。
 * 料理の種類を選び、人数（またはだし・しょうゆ等の基準となる分量を直接ml指定）を入力すると、
 * 各調味料の使用量を大さじ・小さじ・mlで表示する（送信なし・クライアント内計算）。
 * 比率データは data/tables/ajitsuke-ougonhi.json（AjitsukeOugonhi.calc.ts経由）を単一の情報源とする。
 */

export function AjitsukeOugonhi() {
  const [dishKey, setDishKey] = useState(DISHES[0].key);
  const [servings, setServings] = useState("2");
  const [directMl, setDirectMl] = useState("");

  const dish = getDish(dishKey) ?? DISHES[0];
  const useDirect = directMl.trim() !== "";

  const calc = useDirect
    ? scaleDish(dishKey, Number(directMl))
    : scaleDishByServings(dishKey, Number(servings));

  const baseLabel = CHOMIRYO_LABELS[dish.base_key] ?? dish.base_key;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="料理の種類"
          value={dishKey}
          onChange={(e) => {
            setDishKey(e.target.value);
            setDirectMl("");
          }}
        >
          {DISHES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="人数"
          value={servings}
          min={0}
          step="1"
          disabled={useDirect}
          onChange={(e) => setServings(e.target.value)}
          hint={`目安: 1人分あたり${baseLabel} ${fmt(dish.default_ml_per_nin)}ml`}
        />
        <NumberField
          label={`${baseLabel}の量を直接指定（ml・任意）`}
          value={directMl}
          min={0}
          step="1"
          onChange={(e) => setDirectMl(e.target.value)}
          hint="入力すると人数の代わりにこちらを使って計算します"
        />
      </div>

      {!dish.confirmed && (
        <Callout tone="caution">
          この比率は、官公庁等の一次情報が確認できなかったため、複数のレシピで広く紹介されている一般的な目安として掲載しています（{dish.source_note}）。地域や家庭、お好みによって差があります。
        </Callout>
      )}

      {!calc.ok && <Callout tone="caution">{calc.error}</Callout>}

      {calc.ok && (
        <>
          <ResultCard
            label={`${calc.result.dishName}（${baseLabel} ${fmt(calc.result.baseMl)}ml が基準）`}
            value={fmt(calc.result.totalMl)}
            unit="ml（調味料の合計目安）"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {calc.result.ingredients.map((i) => (
              <div key={i.key} className="rounded-card border border-line p-4">
                <p className="font-medium">{i.name}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{formatAmount(i.ml)}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {fmt(i.ml)}ml（大さじ{fmt(i.tbsp)}杯 ／ 小さじ{fmt(i.tsp)}杯）
                </p>
              </div>
            ))}
          </div>
          {dish.confirmed && (
            <p className="text-sm text-ink-muted">出典: {dish.source_note}</p>
          )}
        </>
      )}

      <Callout tone="caution">
        ここに示す比率はあくまで目安です。味の濃さの好み・食材の水分量・季節・地域（家庭）による違いで、実際においしいと感じる配合は変わります。まずはこの分量で作り、味を見ながら調整することをおすすめします。
      </Callout>
    </div>
  );
}
