"use client";

import { useState } from "react";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  searchTsukuriokiHimochi,
  TSUKURIOKI_DISCLAIMERS,
  TSUKURIOKI_GRANULARITY_LIMITATION,
  type CategoryDetail,
} from "./TsukuriokiHimochiIchiran.calc";

/*
 * 作り置き 日持ち一覧（冷蔵/冷凍別）（P2-T24）。
 * 料理名（部分一致・ひらがな⇄カタカナ表記ゆれ吸収）またはカテゴリ選択で、
 * 作り置き（常備菜）のカテゴリ別に冷蔵/冷凍それぞれの日持ちの目安を表示する（送信なし・クライアント内検索）。
 * 料理単位の具体的な日数は公的機関が明記していないため、カテゴリ単位の一般的な目安であることを常に明示する。
 */

function CategoryCard({ item }: { item: CategoryDetail }) {
  return (
    <div className="space-y-3">
      <ResultCard
        label={item.name}
        value={item.refrigText}
        unit="（冷蔵）"
        note={item.idealSameDay ? "できるだけその日のうちに食べきるのが理想です。" : undefined}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-line p-4">
          <p className="font-medium">冷蔵の目安</p>
          <p className="mt-1 text-sm text-ink-muted">{item.refrigBasis}</p>
        </div>
        <div className="rounded-card border border-line p-4">
          <p className="font-medium">冷凍の目安</p>
          {item.freezable && item.freezeText ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">
                {item.freezeText}（じゃがいも等、食感が変わりやすい具材は取り除くのがおすすめです）
              </p>
              {item.freezeNote && (
                <p className="mt-1 text-sm text-ink-muted">{item.freezeNote}</p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              {item.freezeNote ?? "冷凍には向きません。"}
            </p>
          )}
        </div>
      </div>
      {item.caution && <Callout tone="caution">{item.caution}</Callout>}
    </div>
  );
}

function CategoryListItem({
  item,
  onSelect,
}: {
  item: CategoryDetail;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="flex w-full min-h-12 items-center justify-between gap-3 rounded-card border border-line p-3 text-left hover:border-brand"
      >
        <span className="min-w-0">
          <span className="font-medium">{item.name}</span>
        </span>
        <span className="shrink-0 text-sm tabular-nums">{item.refrigText}（冷蔵）</span>
      </button>
    </li>
  );
}

export function TsukuriokiHimochiIchiran() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function selectCategory(id: string) {
    setSelectedId(id);
  }

  function clearSelection() {
    setSelectedId(null);
  }

  const result = selectedId
    ? searchTsukuriokiHimochi({ categoryId: selectedId })
    : searchTsukuriokiHimochi({ query });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="tsukurioki-query" className="text-sm font-medium">
          料理名で検索（またはカテゴリから選ぶ）
        </label>
        <input
          id="tsukurioki-query"
          type="search"
          value={query}
          onChange={(e) => {
            clearSelection();
            setQuery(e.target.value);
          }}
          placeholder="例: きんぴらごぼう / カレー / みそ汁"
          autoComplete="off"
          maxLength={30}
          className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
        />
      </div>

      {result.kind === "single" && (
        <div className="space-y-4">
          {(query.trim() !== "" || selectedId) && (
            <button
              type="button"
              onClick={() => {
                clearSelection();
                setQuery("");
              }}
              className="text-sm text-brand underline underline-offset-4"
            >
              ← 検索をやり直す
            </button>
          )}
          <CategoryCard item={result.item} />
        </div>
      )}

      {result.kind === "list" && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-sm text-ink-muted">
            {query.trim() === ""
              ? "カテゴリを選ぶと、冷蔵・冷凍それぞれの日持ちの目安を表示します。"
              : `${result.items.length}件見つかりました。カテゴリを選ぶと詳細を表示します。`}
          </p>
          <ul className="space-y-2">
            {result.items.map((item) => (
              <CategoryListItem key={item.id} item={item} onSelect={selectCategory} />
            ))}
          </ul>
        </div>
      )}

      {result.kind === "notFound" && (
        <Callout>
          一致するカテゴリが見つかりませんでした。上の一覧から近いカテゴリを選んでください。
        </Callout>
      )}

      <Callout tone="caution">{TSUKURIOKI_GRANULARITY_LIMITATION}</Callout>
      <Callout tone="caution">{TSUKURIOKI_DISCLAIMERS.generalPrinciple}</Callout>
      <Callout tone="caution">{TSUKURIOKI_DISCLAIMERS.reheat}</Callout>
      <Callout tone="caution">{TSUKURIOKI_DISCLAIMERS.abnormality}</Callout>
    </div>
  );
}
