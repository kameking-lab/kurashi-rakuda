"use client";
import { isProfileEmpty } from "@/lib/personalize";
import { usePersonalization } from "./usePersonalization";

export function PersonalizationToggle() {
  const { settings, ready, setRelatedOnly } = usePersonalization();
  const disabled = !ready || isProfileEmpty(settings.profile);
  return <label className={`personalize-toggle ${disabled ? "opacity-60" : ""}`}><input type="checkbox" checked={settings.relatedOnly} disabled={disabled} onChange={(e)=>setRelatedOnly(e.target.checked)}/><span>関係するものだけ表示</span><small>既定は全表示</small></label>;
}
