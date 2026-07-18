"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Rakku } from "@/components/mascot/Rakku";
import type { ChildAgeBand, LifeStage } from "@/app/lib/audience";
import type { Profile } from "@/lib/personalize";
import { clearPersonalization, savePersonalization, usePersonalization, type ProfileDetails } from "./usePersonalization";

function childBand(age: number): ChildAgeBand { return age < 1 ? "age0_1" : age < 3 ? "age1_3" : age < 6 ? "age3_6" : age < 12 ? "age6_12" : "age12_18"; }
function childStage(age: number): LifeStage { return age < 1 ? "newborn" : age < 3 ? "infant" : age < 6 ? "toddler" : age < 12 ? "schoolAge" : "adolescent"; }
function toProfile(d: ProfileDetails): Profile {
  const lifeStages: LifeStage[] = [];
  if (typeof d.age === "number") lifeStages.push(d.age >= 65 ? "senior" : "adult");
  if (d.hasChildren && typeof d.childAge === "number") lifeStages.push(childStage(d.childAge));
  if (d.events?.includes("pregnant")) lifeStages.push("pregnancy");
  return {
    gender: d.gender,
    lifeStages: [...new Set(lifeStages)],
    lifeEvents: [...new Set([...(d.events ?? []), ...(d.hasChildren ? ["parenting" as const] : [])])],
    childAgeBands: d.hasChildren && typeof d.childAge === "number" ? [childBand(d.childAge)] : undefined,
  };
}

export function ProfileSettings() {
  const { settings, ready } = usePersonalization();
  const [details, setDetails] = useState<ProfileDetails>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (ready) setDetails(settings.details); }, [ready, settings.details]);
  const number = (key: "age"|"heightCm"|"weightKg"|"childAge", value: string) => setDetails((d) => ({ ...d, [key]: value === "" ? undefined : Number(value) }));
  const event = (name: "pregnant"|"working"|"caregiving", checked: boolean) => setDetails((d) => ({ ...d, events: checked ? [...new Set([...(d.events ?? []), name])] : (d.events ?? []).filter((x) => x !== name) }));
  const submit = (e: FormEvent) => { e.preventDefault(); savePersonalization({ profile: toProfile(details), details, relatedOnly: settings.relatedOnly }); setSaved(true); };
  return (
    <details className="profile-settings rounded-card border border-line bg-paper">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-bold"><span>あなた向けに並べ替える</span><span className="text-sm font-normal text-ink-muted">任意・あとで変更できます</span></summary>
      <form onSubmit={submit} className="border-t border-line p-5">
        <div className="flex items-start gap-4 rounded-card bg-brand-soft p-4"><Rakku pose="guide" size={72}/><p>わかるところだけで大丈夫だよ。<strong className="block">この端末だけに保存し、どこにも送信されません。</strong></p></div>
        <div className="profile-grid mt-5 grid gap-4 sm:grid-cols-2">
          <label>性別（任意）<select value={details.gender ?? ""} onChange={(e)=>setDetails({...details,gender:e.target.value ? e.target.value as "female"|"male" : undefined})}><option value="">設定しない</option><option value="female">女性</option><option value="male">男性</option></select></label>
          <label>年齢（任意）<input type="number" min="0" max="120" value={details.age ?? ""} onChange={(e)=>number("age",e.target.value)}/></label>
          <label>身長 cm（任意）<input type="number" min="50" max="250" value={details.heightCm ?? ""} onChange={(e)=>number("heightCm",e.target.value)}/></label>
          <label>体重 kg（任意）<input type="number" min="1" max="400" step="0.1" value={details.weightKg ?? ""} onChange={(e)=>number("weightKg",e.target.value)}/></label>
        </div>
        <fieldset className="mt-5"><legend className="font-bold">いまの状況（複数可）</legend><div className="mt-2 flex flex-wrap gap-3">{([['pregnant','妊活・妊娠中'],['working','働いている'],['caregiving','介護中']] as const).map(([v,l])=><label key={v} className="profile-check"><input type="checkbox" checked={details.events?.includes(v) ?? false} onChange={(e)=>event(v,e.target.checked)}/>{l}</label>)}</div></fieldset>
        <fieldset className="mt-5"><legend className="font-bold">お子さん（任意）</legend><label className="profile-check mt-2"><input type="checkbox" checked={details.hasChildren ?? false} onChange={(e)=>setDetails({...details,hasChildren:e.target.checked})}/>子どもがいる</label>{details.hasChildren && <div className="profile-grid mt-3 grid gap-4 sm:grid-cols-2"><label>子どもの性別<select value={details.childGender ?? ""} onChange={(e)=>setDetails({...details,childGender:e.target.value ? e.target.value as "female"|"male" : undefined})}><option value="">設定しない</option><option value="female">女の子</option><option value="male">男の子</option></select></label><label>子どもの年齢<input type="number" min="0" max="18" step="0.1" value={details.childAge ?? ""} onChange={(e)=>number("childAge",e.target.value)}/></label></div>}</fieldset>
        <div className="mt-6 flex flex-wrap items-center gap-3"><button className="min-h-12 rounded-full bg-brand px-6 font-bold text-paper" type="submit">この端末に保存</button><button className="min-h-12 rounded-full border border-line px-5" type="button" onClick={()=>{clearPersonalization();setDetails({});setSaved(false)}}>設定をクリア</button>{saved&&<span role="status" className="text-sm text-brand">保存しました</span>}</div>
      </form>
    </details>
  );
}
