"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  searchReitoHozon,
  REITO_HOZON_CATEGORIES,
  REITO_HOZON_DISCLAIMERS,
  type FoodDetail,
} from "./ReitoHozon.calc";

/*
 * 冷凍保存期間検索（Q3-13）。
 * 食材名（部分一致・ひらがな⇄カタカナ表記ゆれ吸収）またはカテゴリで絞り込み、
 * 1件に絞られた時点で保存期間目安・下処理のコツ・解凍のコツを表示する（送信なし・クライアント内検索）。
 * ?food_id=hourensou のようなURLクエリでの直接アクセスにも対応（プログラマティック展開ページからの遷移用）。
 * useSearchParams を使うため、静的書き出し時にサスペンス境界が必要（Next.js の制約）。
 */

function FoodDetailCard({ item }: { item: FoodDetail }) {
  return (
    <>
      <ResultCard
        label={`${item.name}（${item.category}／${item.state}）`}
        value={item.periodText}
        note={REITO_HOZON_DISCLAIMERS.baseTemperature}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-line p-4">
          <p className="font-medium">保存前の下処理のコツ</p>
          <p className="mt-1 text-sm text-ink-muted">{item.prepTips}</p>
        </div>
        <div className="rounded-card border border-line p-4">
          <p className="font-medium">解凍のコツ</p>
          <p className="mt-1 text-sm text-ink-muted">{item.thawTips}</p>
        </div>
      </div>
      {item.caution && <Callout tone="caution">{item.caution}</Callout>}
      <Callout tone="caution">{REITO_HOZON_DISCLAIMERS.noRefreeze}</Callout>
    </>
  );
}

function ReitoHozonInner() {
  const searchParams = useSearchParams();
  const initialFoodId = searchParams.get("food_id");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(initialFoodId);

  function selectFood(id: string) {
    setSelectedFoodId(id);
  }

  function clearSelection() {
    setSelectedFoodId(null);
  }

  const result = selectedFoodId
    ? searchReitoHozon({ foodId: selectedFoodId })
    : searchReitoHozon({ query, category: category || null });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="reito-hozon-query" className="text-sm font-medium">
            食材名で検索
          </label>
          <input
            id="reito-hozon-query"
            type="search"
            value={query}
            onChange={(e) => {
              clearSelection();
              setQuery(e.target.value);
            }}
            placeholder="例: ほうれん草 / にく / さかな"
            autoComplete="off"
            maxLength={30}
            className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
          />
        </div>
        <SelectField
          label="カテゴリで絞り込む"
          value={category}
          onChange={(e) => {
            clearSelection();
            setCategory(e.target.value);
          }}
        >
          <option value="">すべて</option>
          {REITO_HOZON_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
      </div>

      {result.kind === "single" && (
        <div className="space-y-4">
          {(query.trim() !== "" || category !== "" || selectedFoodId) && (
            <button
              type="button"
              onClick={() => {
                clearSelection();
                setQuery("");
                setCategory("");
              }}
              className="text-sm text-brand underline underline-offset-4"
            >
              ← 検索をやり直す
            </button>
          )}
          <FoodDetailCard item={result.item} />
        </div>
      )}

      {result.kind === "list" && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-sm text-ink-muted">
            {result.items.length}件見つかりました。食材を選ぶと詳細を表示します。
          </p>
          <ul className="space-y-2">
            {result.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectFood(item.id)}
                  className="flex w-full min-h-12 items-center justify-between gap-3 rounded-card border border-line p-3 text-left hover:border-brand"
                >
                  <span>
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 text-sm text-ink-muted">{item.category}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{item.periodText}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.kind === "notFound" && (
        <Callout>
          まだ登録がありません。今後追加予定です。
          <Link href="/tools" className="ml-1 underline underline-offset-4">
            他のツールを探す
          </Link>
          こともできます。
        </Callout>
      )}

      <Callout tone="caution">{REITO_HOZON_DISCLAIMERS.quality}</Callout>
      <Callout tone="caution">{REITO_HOZON_DISCLAIMERS.abnormality}</Callout>
    </div>
  );
}

export function ReitoHozon() {
  return (
    <Suspense fallback={<Callout>読み込み中です…</Callout>}>
      <ReitoHozonInner />
    </Suspense>
  );
}
