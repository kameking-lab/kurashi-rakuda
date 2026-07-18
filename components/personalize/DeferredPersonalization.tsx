"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const ProfileSettings = lazy(() => import("./ProfileSettings").then((module) => ({ default: module.ProfileSettings })));
const HomeController = lazy(() => import("./HomePersonalizationController").then((module) => ({ default: module.HomePersonalizationController })));
const DirectoryControls = lazy(() => import("./ToolDirectoryControls").then((module) => ({ default: module.ToolDirectoryControls })));

function useAfterLcp() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2200);
    return () => window.clearTimeout(timer);
  }, []);
  return ready;
}

export function DeferredProfileSettings() {
  const ready = useAfterLcp();
  if (ready) return <Suspense fallback={<ProfilePlaceholder />}><ProfileSettings /></Suspense>;
  return <ProfilePlaceholder />;
}

function ProfilePlaceholder() {
  return <details className="profile-settings rounded-card border border-line bg-paper">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-bold">
      <span>あなた向けに並べ替える</span><span className="text-sm font-normal text-ink-muted">任意・あとで変更できます</span>
    </summary>
  </details>;
}

export function DeferredHomePersonalization() {
  const ready = useAfterLcp();
  return ready ? <Suspense fallback={null}><HomeController /></Suspense> : null;
}

const labels = ["すべて", "姊活・姊娠", "産後・0〜1歳", "乳幼児（1〜6歳）", "学童", "働く・お金", "介護", "暮らし全般"];
export function DeferredToolDirectoryControls() {
  const ready = useAfterLcp();
  if (ready) return <Suspense fallback={<DirectoryPlaceholder />}><DirectoryControls /></Suspense>;
  return <DirectoryPlaceholder />;
}

function DirectoryPlaceholder() {
  return <div aria-hidden="true">
    <div className="stage-axis mt-5"><p className="font-bold">ライフステージから横断して探す</p><div className="mt-2 flex gap-2 overflow-hidden pb-2">{labels.map((label) => <span key={label} className="stage-axis-button">{label}</span>)}</div></div>
    <div className="mt-4 h-11" />
  </div>;
}
