"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LifeStage } from "@/app/lib/audience";
import { tools } from "@/app/lib/tools/registry";
import { isHighlighted, isProfileEmpty, scoreAudience } from "@/lib/personalize";
import { searchTools } from "@/lib/search/searchTools";
import { PersonalizationToggle } from "./PersonalizationToggle";
import { usePersonalization } from "./usePersonalization";

const STAGES: { id: string; label: string; stages?: LifeStage[]; universal?: boolean }[] = [
  { id: "all", label: "すべて" },
  { id: "pregnancy", label: "妊活・妊娠", stages: ["pregnancy"] },
  { id: "baby", label: "産後・0〜1歳", stages: ["newborn", "infant"] },
  { id: "preschool", label: "乳幼児（1〜6歳）", stages: ["infant", "toddler"] },
  { id: "school", label: "学童", stages: ["schoolAge"] },
  { id: "work", label: "働く・お金", stages: ["adult"] },
  { id: "care", label: "介護", stages: ["senior"] },
  { id: "universal", label: "暮らし全般", universal: true },
];

/**
 * /tools 一覧の検索ボックス＋ライフステージ絞り込み＋パーソナライズ（IA-1・IA-3）。
 * ★SSRでは全件描画され、ここでの絞り込みはJSでカードをhidden化するだけ（SEO非破壊。specs/ui/tools-directory-ia.md §1.1）★
 * Enterキーでの遷移は <form action="/tools" method="get"> のネイティブ挙動に任せる
 * （JS無効環境でも /tools?q=<入力値> に遷移できる。JS有効時は入力のたびに同じロジックで即時絞り込む）。
 */
export function ToolDirectoryControls() {
  const searchParams = useSearchParams();
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const { settings, ready } = usePersonalization();

  const matchedSlugs = useMemo(() => {
    if (!query.trim()) return null;
    return new Set(searchTools(query, tools).map((h) => h.tool.slug));
  }, [query]);

  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const selected = STAGES.find((item) => item.id === stage) ?? STAGES[0];
    const empty = isProfileEmpty(settings.profile);
    const bySlug = new Map(tools.map((tool, index) => [tool.slug, { tool, index }]));
    const apply = () => {
      let visible = 0;
      document.querySelectorAll<HTMLElement>("[data-tool-slug]").forEach((item) => {
        const entry = bySlug.get(item.dataset.toolSlug ?? "");
        if (!entry) return;
        const { tool, index } = entry;
        const highlighted = !empty && isHighlighted(settings.profile, tool.audience);
        const stageMatch = stage === "all" || (selected.universal
          ? tool.audience.universal
          : tool.audience.lifeStages.some((value) => selected.stages?.includes(value)));
        const queryMatch = matchedSlugs === null || matchedSlugs.has(tool.slug);
        item.style.order = empty ? String(index) : String(-scoreAudience(settings.profile, tool.audience) * 1000 + index);
        const hidden = !stageMatch || !queryMatch || (settings.relatedOnly && !empty && !highlighted);
        item.hidden = hidden;
        if (!hidden) visible++;
        item.querySelector(".tool-card")?.classList.toggle("is-personalized", highlighted);
      });
      document.querySelectorAll<HTMLElement>("[data-tool-category]").forEach((section) => {
        section.hidden = !section.querySelector("[data-tool-slug]:not([hidden])");
      });
      setVisibleCount(visible);
    };
    const idle = window.requestIdleCallback?.(apply, { timeout: 1200 });
    if (idle === undefined) {
      const timer = window.setTimeout(apply, 0);
      return () => window.clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, [ready, settings, stage, matchedSlugs]);

  const showEmptyState = query.trim().length > 0 && visibleCount === 0;

  return <>
    <form action="/tools" method="get" className="tools-search mt-5" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="tools-search-input" className="block font-medium">
        ツール名や悩みで探す
      </label>
      <input
        id="tools-search-input"
        name="q"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例: 保育料 / 電気代 / 化粧水"
        autoComplete="off"
        className="field-control mt-2 min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base"
      />
      <p className="mt-1 text-sm text-ink-muted" role="status" aria-live="polite">
        {query.trim() && visibleCount !== null ? `${visibleCount}件が一致` : ""}
      </p>
      {showEmptyState && (
        <div className="mt-2 rounded-card bg-sand-soft p-4 text-sm sm:text-base">
          見つかりませんでした。
          <a href="#pregnancy" className="mx-1 underline underline-offset-4">
            カテゴリから探す
          </a>
          ／
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mx-1 underline underline-offset-4"
          >
            全ツールを見る
          </button>
        </div>
      )}
    </form>

    <div className="stage-axis mt-5">
      <p className="font-bold">ライフステージから横断して探す</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        {STAGES.map((item) => <button key={item.id} type="button" aria-pressed={stage === item.id} className="stage-axis-button" onClick={() => setStage(item.id)}>{item.label}</button>)}
      </div>
    </div>
    <div className="mt-4 flex justify-end"><PersonalizationToggle /></div>
  </>;
}
