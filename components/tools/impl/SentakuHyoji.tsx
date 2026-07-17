"use client";

import { useId, useMemo, useState } from "react";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  searchSentakuHyoji,
  SENTAKU_CATEGORIES,
  SENTAKU_DELICATE_CAUTION_NOTE,
  SENTAKU_UNREADABLE_NOTE,
  type SentakuCategory,
  type SentakuSymbol,
} from "./SentakuHyoji.calc";

/*
 * 洗濯表示検索（Q3-17）。
 * 仕様: specs/b-tools/41-laundry-care-label-search.md
 * すべてクライアント内で即時検索（送信なし・登録なし・オフライン動作）。
 * データ・検索ロジック本体は SentakuHyoji.calc.ts の純関数（searchSentakuHyoji 等）。
 *
 * UX: フリーテキスト検索が苦手なユーザーのため、カテゴリ選択でまず絞り込み、
 * 候補一覧（記号の見た目＋意味の要約）から該当しそうな記号を選ばせる導線にする。
 */

/** キーワード検索欄（Field.tsx にテキスト入力欄がないためローカルで実装） */
function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        maxLength={30}
        className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

function CategorySelect({
  value,
  onChange,
}: {
  value: SentakuCategory | "";
  onChange: (value: SentakuCategory | "") => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        カテゴリで絞り込み
      </label>
      <select
        id={id}
        className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
        value={value}
        onChange={(e) => onChange(e.target.value as SentakuCategory | "")}
      >
        <option value="">すべて</option>
        {SENTAKU_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function SymbolListItem({
  item,
  onSelect,
}: {
  item: SentakuSymbol;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="min-h-12 w-full rounded-card border border-line p-4 text-left transition-colors hover:bg-sand-soft"
      >
        <p className="text-xs text-ink-muted">{item.category}</p>
        <p className="mt-1 font-medium">{item.symbolShape}</p>
        <p className="mt-1 text-sm text-ink-muted">{item.meaning}</p>
      </button>
    </li>
  );
}

function SymbolDetailView({
  id,
  onSelect,
  onBack,
}: {
  id: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const result = useMemo(() => searchSentakuHyoji({ symbolId: id }), [id]);

  if (result.kind !== "detail") {
    return <Callout tone="caution">{result.kind === "not_found" ? result.note : ""}</Callout>;
  }
  const { item } = result;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="px-0">
        ← 検索結果に戻る
      </Button>

      <Card>
        <p className="text-xs text-ink-muted">{item.category}の記号</p>
        <p className="mt-1 text-lg font-bold">{item.symbolShape}</p>
        <p className="mt-2">{item.meaning}</p>
        <p className="mt-3 text-sm text-ink-muted">お手入れの目安</p>
        <p className="text-base">{item.handlingTip}</p>
        <p className="mt-4 text-xs text-ink-muted">
          出典: {item.source}／{item.effectiveDateLabel}
        </p>
      </Card>

      {item.delicateCaution && (
        <Callout tone="caution">{SENTAKU_DELICATE_CAUTION_NOTE}</Callout>
      )}

      {item.relatedSymbols.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">見間違えやすい記号</p>
          <ul className="space-y-2">
            {item.relatedSymbols.map((r) => (
              <SymbolListItem key={r.id} item={r} onSelect={onSelect} />
            ))}
          </ul>
        </div>
      )}

      <Callout>{item.oldJisNote}</Callout>
      <p className="text-sm text-ink-muted">{item.generalCautionNote}</p>
    </div>
  );
}

function groupByCategory(items: SentakuSymbol[]): [SentakuCategory, SentakuSymbol[]][] {
  return SENTAKU_CATEGORIES.map(
    (c) => [c, items.filter((i) => i.category === c)] as [SentakuCategory, SentakuSymbol[]],
  ).filter(([, list]) => list.length > 0);
}

export function SentakuHyoji() {
  const [queryInput, setQueryInput] = useState("");
  const [category, setCategory] = useState<SentakuCategory | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const result = useMemo(
    () =>
      selectedId
        ? null
        : searchSentakuHyoji({ query: queryInput, category: category || null }),
    [queryInput, category, selectedId],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="記号のキーワードで検索"
          value={queryInput}
          onChange={(v) => {
            setQueryInput(v);
            setSelectedId(null);
          }}
          placeholder="例: 手洗い、40度、アイロン不可、ドライクリーニング"
        />
        <CategorySelect
          value={category}
          onChange={(v) => {
            setCategory(v);
            setSelectedId(null);
          }}
        />
      </div>

      {selectedId ? (
        <SymbolDetailView
          id={selectedId}
          onSelect={setSelectedId}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        result && (
          <div className="space-y-4">
            {result.kind === "detail" && (
              <SymbolDetailView
                id={result.item.id}
                onSelect={setSelectedId}
                onBack={() => {
                  setQueryInput("");
                  setCategory("");
                }}
              />
            )}

            {result.kind === "list" && (
              <div className="space-y-6">
                {groupByCategory(result.items).map(([c, items]) => (
                  <div key={c}>
                    <p className="mb-2 text-sm font-medium">
                      {c}（{items.length}件）
                    </p>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <SymbolListItem key={item.id} item={item} onSelect={setSelectedId} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {result.kind === "not_found" && (
              <Callout tone="caution">
                {result.note}
                お困りの記号がありましたら、お問い合わせよりお知らせください。
              </Callout>
            )}
          </div>
        )
      )}

      <Callout>{SENTAKU_UNREADABLE_NOTE}</Callout>
    </div>
  );
}
