"use client";

import { useEffect, useMemo, useState } from "react";
import { Callout } from "@/components/ui/Callout";
import {
  buildShoppingList,
  groupRecipesByCourse,
  encodeSelectedRecipeIds,
  decodeSelectedRecipeIds,
  SHELF_LABEL,
  type ShoppingListItem,
} from "@/components/tools/impl/KaimonoListJidouSeisei.calc";
import { kondateData, type Course, type Recipe } from "@/lib/tools/impl/kondate-teian";

/*
 * 買い物リスト自動生成（P2-T23）— specs/b-tools/p2-t23-kaimono-list-jidou-seisei.md
 *
 * 献立自動提案（kondate-teian）のデータをそのまま使い、選んだレシピの食材をまとめて表示する。
 * すべてクライアント内で即時計算（送信なし・登録なし）。分量（数量・単位）データは
 * 元データに存在しないため、本ツールは「使用回数」を集計し、分量は表示しない（正直な設計）。
 */

const D = kondateData;
const COURSE_LABELS: Record<Course, string> = { main: "主菜", side: "副菜", soup: "汁物" };
const COURSES: Course[] = ["main", "side", "soup"];

function RecipeCheckbox({
  recipe,
  checked,
  onChange,
}: {
  recipe: Recipe;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <li>
      <label className="flex min-h-12 items-center gap-2 rounded-card border border-line px-3 py-2 text-sm">
        <input
          type="checkbox"
          className="size-5 shrink-0"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="min-w-0 flex-1">{recipe.name}</span>
        <span className="shrink-0 text-ink-muted tabular-nums">{recipe.cookTimeMin}分</span>
      </label>
    </li>
  );
}

function ShoppingItemRow({ item }: { item: ShoppingListItem }) {
  return (
    <li className="rounded-card border border-line p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">
          {item.name}
          <span className="ml-2 text-sm text-ink-muted">（{item.roleLabel}）</span>
        </p>
        <p className="text-sm text-ink-muted tabular-nums">{item.count}品で使用</p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        使うレシピ: {item.recipeNames.join("・")}
      </p>
      {item.likelyOnHand && (
        <p className="mt-1 text-sm text-ink-muted">
          ※常備していることが多い食材です（買い足しが不要な場合があります）。
        </p>
      )}
    </li>
  );
}

export function KaimonoListJidouSeisei() {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // URLに選択済みレシピidがあれば読む（初回のみ）
  useEffect(() => {
    const ids = decodeSelectedRecipeIds(window.location.search.replace(/^\?/, ""));
    if (ids.length > 0) setSelected(ids);
  }, []);

  useEffect(() => {
    const q = encodeSelectedRecipeIds(selected);
    window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
  }, [selected]);

  const courseGroups = useMemo(() => groupRecipesByCourse(D), []);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const result = useMemo(() => buildShoppingList(selected, D), [selected]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const q = query.trim();
  const matches = (r: Recipe) => q === "" || r.name.includes(q);

  // shelf の切り替わりごとに見出しを出すためのグルーピング（items は既に shelf 順にソート済み）
  const shelfSections = useMemo(() => {
    const sections: { shelf: string; items: ShoppingListItem[] }[] = [];
    for (const item of result.items) {
      const last = sections[sections.length - 1];
      if (last && last.shelf === item.shelf) last.items.push(item);
      else sections.push({ shelf: item.shelf, items: [item] });
    }
    return sections;
  }, [result.items]);

  return (
    <div className="space-y-5">
      <Callout tone="caution">
        このツールは食材の「分量（g・大さじ等）」は表示しません。もとになっているレシピデータ
        （献立自動提案と共通）には分量の情報がなく、根拠のない数値を作って表示することは避けています。
        代わりに「いくつのレシピで使うか」をまとめて表示します。実際の分量は各レシピを参照してください。
      </Callout>

      <div>
        <h2 className="text-base font-bold">レシピを選ぶ</h2>
        <p className="mt-1 text-sm text-ink-muted">
          献立自動提案と同じ{" "}
          {D.recipes.length}
          品のレシピから、買い物リストに使いたいものを選んでください。
        </p>
        <div className="mt-2">
          <label htmlFor="kaimono-recipe-search" className="text-sm font-medium">
            レシピ名で絞り込む
          </label>
          <input
            id="kaimono-recipe-search"
            type="search"
            value={query}
            placeholder="肉じゃが / 味噌汁 など"
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
          />
        </div>

        <div className="mt-3 space-y-4">
          {COURSES.map((course) => {
            const recipes = courseGroups[course].filter(matches);
            if (recipes.length === 0) return null;
            return (
              <div key={course}>
                <h3 className="text-sm font-bold">{COURSE_LABELS[course]}</h3>
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {recipes.map((r) => (
                    <RecipeCheckbox
                      key={r.id}
                      recipe={r}
                      checked={selectedSet.has(r.id)}
                      onChange={(checked) => toggle(r.id, checked)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold">買い物リスト</h2>
        {result.usedRecipes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            レシピを選ぶと、必要な食材がまとまって表示されます。
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              選んだレシピ（{result.usedRecipes.length}品）: {result.usedRecipes.map((r) => r.name).join("・")}
            </p>
            <div className="mt-3 space-y-4">
              {shelfSections.map((section) => (
                <div key={section.shelf}>
                  <h3 className="text-sm font-bold">
                    {SHELF_LABEL[section.shelf] ?? section.shelf}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {section.items.map((item) => (
                      <ShoppingItemRow key={`${item.ingredientId}::${item.role}`} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Callout>
        この画面の URL には選んだレシピが入っています。コピーして送れば、相手の画面にも
        同じ買い物リストが出ます。
      </Callout>
    </div>
  );
}
