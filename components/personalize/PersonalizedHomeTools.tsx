"use client";
import Link from "next/link";
import { getLiveTools } from "@/app/lib/tools/registry";
import { isHighlighted, isProfileEmpty, sortByAudience } from "@/lib/personalize";
import { usePersonalization } from "./usePersonalization";

export function PersonalizedHomeTools() {
  const { settings, ready } = usePersonalization();
  const empty = !ready || isProfileEmpty(settings.profile);
  const sorted = sortByAudience(getLiveTools(), empty ? null : settings.profile);
  const visible = (settings.relatedOnly && !empty ? sorted.filter((t)=>isHighlighted(settings.profile,t.audience)) : sorted).slice(0,6);
  return <section aria-labelledby="for-you-title" className="for-you-section mt-8 rounded-[1.5rem] border border-line bg-brand-soft p-5 sm:p-7"><p className="eyebrow">{empty ? "まず使ってほしいツール" : "プロフィールをもとに並べ替え"}</p><h2 id="for-you-title" className="mt-1 text-2xl font-bold">{empty ? "よく使われるツール" : "あなた向け"}</h2><ul className="mt-4 grid gap-3 sm:grid-cols-3">{visible.map((t)=><li key={t.slug}><Link prefetch={false} href={`/tools/${t.category}/${t.slug}`} className={`personalized-card block h-full rounded-card border bg-paper p-4 ${!empty&&isHighlighted(settings.profile,t.audience)?"is-personalized":"border-line"}`}>{!empty&&isHighlighted(settings.profile,t.audience)&&<span className="personalized-label">あなた向け</span>}<strong className="block">{t.title}</strong><span className="mt-1 block text-sm text-ink-muted">{t.description}</span></Link></li>)}</ul></section>;
}
