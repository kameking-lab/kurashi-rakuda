"use client";

import { useEffect, useState } from "react";
import type { LifeStage } from "@/app/lib/audience";
import { tools } from "@/app/lib/tools/registry";
import { isHighlighted, isProfileEmpty, scoreAudience } from "@/lib/personalize";
import { PersonalizationToggle } from "./PersonalizationToggle";
import { usePersonalization } from "./usePersonalization";

const STAGES: { id: string; label: string; stages?: LifeStage[]; universal?: boolean }[] = [
  { id: "all", label: "すべて" },
  { id: "pregnancy", label: "姊活・姊娠", stages: ["pregnancy"] },
  { id: "baby", label: "産後・0〜1歳", stages: ["newborn", "infant"] },
  { id: "preschool", label: "乳幼児（1〜6歳）", stages: ["infant", "toddler"] },
  { id: "school", label: "学童", stages: ["schoolAge"] },
  { id: "work", label: "働く・お金", stages: ["adult"] },
  { id: "care", label: "介護", stages: ["senior"] },
  { id: "universal", label: "暮らし全般", universal: true },
];

export function ToolDirectoryControls() {
  const [stage, setStage] = useState("all");
  const { settings, ready } = usePersonalization();

  useEffect(() => {
    if (!ready) return;
    const selected = STAGES.find((item) => item.id === stage) ?? STAGES[0];
    const empty = isProfileEmpty(settings.profile);
    const bySlug = new Map(tools.map((tool, index) => [tool.slug, { tool, index }]));
    const apply = () => {
      document.querySelectorAll<HTMLElement>("[data-tool-slug]").forEach((item) => {
        const entry = bySlug.get(item.dataset.toolSlug ?? "");
        if (!entry) return;
        const { tool, index } = entry;
        const highlighted = !empty && isHighlighted(settings.profile, tool.audience);
        const stageMatch = stage === "all" || (selected.universal
          ? tool.audience.universal
          : tool.audience.lifeStages.some((value) => selected.stages?.includes(value)));
        item.style.order = empty ? String(index) : String(-scoreAudience(settings.profile, tool.audience) * 1000 + index);
        item.hidden = !stageMatch || (settings.relatedOnly && !empty && !highlighted);
        item.querySelector(".tool-card")?.classList.toggle("is-personalized", highlighted);
      });
      document.querySelectorAll<HTMLElement>("[data-tool-category]").forEach((section) => {
        section.hidden = !section.querySelector("[data-tool-slug]:not([hidden])");
      });
    };
    const idle = window.requestIdleCallback?.(apply, { timeout: 1200 });
    if (idle === undefined) {
      const timer = window.setTimeout(apply, 0);
      return () => window.clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, [ready, settings, stage]);

  return <>
    <div className="stage-axis mt-5">
      <p className="font-bold">ライフステージから横断して探す</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        {STAGES.map((item) => <button key={item.id} type="button" aria-pressed={stage === item.id} className="stage-axis-button" onClick={() => setStage(item.id)}>{item.label}</button>)}
      </div>
    </div>
    <div className="mt-4 flex justify-end"><PersonalizationToggle /></div>
  </>;
}
