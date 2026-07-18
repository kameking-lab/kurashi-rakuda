"use client";

import { useEffect } from "react";
import { getLiveTools } from "@/app/lib/tools/registry";
import { isProfileEmpty, sortByAudience } from "@/lib/personalize";
import { usePersonalization } from "./usePersonalization";

export function HomePersonalizationController() {
  const { settings, ready } = usePersonalization();
  useEffect(() => {
    if (!ready || isProfileEmpty(settings.profile)) return;
    const apply = () => {
      const ranked = sortByAudience(getLiveTools(), settings.profile).slice(0, 6);
      document.querySelectorAll<HTMLAnchorElement>("[data-home-personalized]").forEach((card, index) => {
        const tool = ranked[index];
        if (!tool) return;
        card.href = `/tools/${tool.category}/${tool.slug}`;
        const title = card.querySelector<HTMLElement>("[data-home-title]");
        const description = card.querySelector<HTMLElement>("[data-home-description]");
        if (title) title.textContent = tool.title;
        if (description) description.textContent = tool.description;
        card.classList.add("is-personalized");
      });
      const eyebrow = document.querySelector<HTMLElement>("[data-home-personalized-eyebrow]");
      const heading = document.querySelector<HTMLElement>("[data-home-personalized-heading]");
      if (eyebrow) eyebrow.textContent = "プロフィールをもとに並べ替え";
      if (heading) heading.textContent = "あなた向け";
    };
    const idle = window.requestIdleCallback?.(apply, { timeout: 1200 });
    if (idle === undefined) {
      const timer = window.setTimeout(apply, 0);
      return () => window.clearTimeout(timer);
    }
    return () => window.cancelIdleCallback?.(idle);
  }, [ready, settings.profile]);
  return null;
}
