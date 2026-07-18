"use client";

import { useEffect, useRef, useState } from "react";
import { PERSONALIZATION_KEY, type PersonalizationSettings } from "./usePersonalization";

type FieldValue = { label: string; value: string };

function childBandKey(ageYears: number) {
  const months = Math.max(0, Math.round(ageYears * 12));
  if (months === 0) return "birth";
  if (months < 12) return `m${String(months).padStart(2, "0")}_${String(months + 1).padStart(2, "0")}`;
  const year = Math.min(6, Math.floor(months / 12));
  return `y${year}_${months % 12 < 6 ? "00_06" : "06_12"}`;
}

function valuesFor(slug: string, settings: PersonalizationSettings): FieldValue[] {
  const details = settings.details;
  const value = (label: string, entry: number | string | undefined): FieldValue[] => entry === undefined ? [] : [{ label, value: String(entry) }];
  switch (slug) {
    case "seichou-kyokusen": return [
      ...value("性別", details.childGender),
      ...value("月齢・年齢", details.childAge === undefined || details.childAge > 6.5 ? undefined : childBandKey(details.childAge)),
    ];
    case "shincho-yosoku": return [
      ...value("子の性別", details.childGender),
      ...(details.gender ? value(details.gender === "male" ? "父親の身長" : "母親の身長", details.heightCm) : []),
    ];
    case "josei-tekisei-taijuu-shihyou": return [
      ...value("身長", details.heightCm), ...value("体重", details.weightKg), ...value("年齢", details.age),
    ];
    case "ninshin-taiju-zoka-checker": return [
      ...value("妊娠前の身長", details.heightCm), ...value("妊娠前の体重", details.weightKg),
    ];
    case "fuyo-kabe": return value("あなたの年齢", details.age);
    case "fuyounai-shaho-songeki-bunkiten": return value("年齢区分", details.age === undefined ? undefined : details.age < 40 ? "under40" : "age40to64");
    default: return [];
  }
}

function controlFor(labelStart: string) {
  const label = [...document.querySelectorAll<HTMLLabelElement>(".tool-workspace label")].find((item) => item.textContent?.startsWith(labelStart));
  return label?.htmlFor ? document.getElementById(label.htmlFor) as HTMLInputElement | HTMLSelectElement | null : null;
}

function update(control: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(control, value);
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

export function ProfilePrefill({ slug }: { slug: string }) {
  const [applied, setApplied] = useState(false);
  const originals = useRef(new Map<Element, string>());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSONALIZATION_KEY);
      if (!raw) return;
      const settings = JSON.parse(raw) as PersonalizationSettings;
      let count = 0;
      for (const item of valuesFor(slug, settings)) {
        const control = controlFor(item.label);
        if (!control) continue;
        originals.current.set(control, control.value);
        update(control, item.value);
        count += 1;
      }
      if (count) setApplied(true);
    } catch { /* malformed local data is ignored */ }
  }, [slug]);
  if (!applied) return null;
  return <div className="prefill-note mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-brand-soft px-4 py-3 text-sm" role="status">
    <span>プロフィールから入力しました。値は自由に変更できます。</span>
    <button type="button" className="rounded-full border border-line bg-paper px-4 py-2 font-bold" onClick={() => { originals.current.forEach((value, control) => update(control as HTMLInputElement | HTMLSelectElement, value)); originals.current.clear(); setApplied(false); }}>入力をクリア</button>
  </div>;
}
