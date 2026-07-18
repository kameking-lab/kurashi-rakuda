"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/personalize";
import type { Gender, LifeEvent } from "@/app/lib/audience";

export const PERSONALIZATION_KEY = "kurashi-rakuda:personalization:v1";
const CHANGE_EVENT = "kurashi-rakuda:personalization-change";

export interface ProfileDetails {
  gender?: Gender;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  hasChildren?: boolean;
  childGender?: Gender;
  childAge?: number;
  events?: LifeEvent[];
}

export interface PersonalizationSettings {
  profile: Profile;
  details: ProfileDetails;
  relatedOnly: boolean;
}

const EMPTY: PersonalizationSettings = { profile: {}, details: {}, relatedOnly: false };

function readSettings(): PersonalizationSettings {
  try {
    const raw = localStorage.getItem(PERSONALIZATION_KEY);
    if (!raw) return EMPTY;
    const value = JSON.parse(raw) as Partial<PersonalizationSettings>;
    return { profile: value.profile ?? {}, details: value.details ?? {}, relatedOnly: value.relatedOnly === true };
  } catch { return EMPTY; }
}

export function savePersonalization(value: PersonalizationSettings) {
  localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearPersonalization() {
  localStorage.removeItem(PERSONALIZATION_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function usePersonalization() {
  const [settings, setSettings] = useState<PersonalizationSettings>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setSettings(readSettings()); setReady(true); };
    sync(); window.addEventListener(CHANGE_EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(CHANGE_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const setRelatedOnly = useCallback((relatedOnly: boolean) => savePersonalization({ ...readSettings(), relatedOnly }), []);
  return { settings, ready, setRelatedOnly };
}
