"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const ProfileSettingsForm = lazy(() => import("./ProfileSettings").then((module) => ({ default: module.ProfileSettingsForm })));
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

/**
 * 「あなた向けに並べ替える」パネル（診断 A-3 のハイドレーション競合修正）。
 *
 * ★空パネルを構造的に不可能にする★
 * `<details>`/`<summary>` の枠はここが常時描画し（開閉状態は同一 DOM ノードで保持）、中身のフォームだけを
 * 遅延ロードする。開いた瞬間に中身が未ロードでも「準備中」の行を出すので、枠だけ開いて空になることがない。
 * フォーム JS は LCP 後（2.2秒）に読み込むが、ユーザーが先に触った（pointerdown/focus）ら即ロードする。
 * これで初回タップでも中身が現れ、かつ LCP を守れる。
 */
export function DeferredProfileSettings() {
  const afterLcp = useAfterLcp();
  const [activated, setActivated] = useState(false);
  const load = afterLcp || activated;
  const trigger = () => setActivated(true);
  return (
    <details className="profile-settings rounded-card border border-line bg-paper">
      <summary
        className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-bold"
        onPointerDown={trigger}
        onFocus={trigger}
      >
        <span>あなた向けに並べ替える</span>
        <span className="text-sm font-normal text-ink-muted">任意・あとで変更できます</span>
      </summary>
      {load ? (
        <Suspense fallback={<ProfileLoadingRow />}>
          <ProfileSettingsForm />
        </Suspense>
      ) : (
        <ProfileLoadingRow />
      )}
    </details>
  );
}

/** 開いたときにフォームがまだ来ていない一瞬に出す行（空にしないための保険） */
function ProfileLoadingRow() {
  return (
    <p className="border-t border-line px-5 py-4 text-sm text-ink-muted" role="status" aria-live="polite">
      入力フォームを読み込んでいます…
    </p>
  );
}

export function DeferredHomePersonalization() {
  const ready = useAfterLcp();
  return ready ? <Suspense fallback={null}><HomeController /></Suspense> : null;
}

const labels = ["すべて", "妊活・妊娠", "産後・0〜1歳", "乳幼児（1〜6歳）", "学童", "働く・お金", "介護", "暮らし全般"];
export function DeferredToolDirectoryControls() {
  const afterLcp = useAfterLcp();
  const [activated, setActivated] = useState(false);
  const load = afterLcp || activated;
  if (load) return <Suspense fallback={<DirectoryPlaceholder />}><DirectoryControls /></Suspense>;
  // LCP 前でも、ステージ chips に触れたら即ロードする（初回タップの無反応を無くす）
  return <DirectoryPlaceholder onActivate={() => setActivated(true)} />;
}

function DirectoryPlaceholder({ onActivate }: { onActivate?: () => void }) {
  return <div onPointerDown={onActivate}>
    <div className="stage-axis mt-5"><p className="font-bold">ライフステージから横断して探す</p><div className="mt-2 flex gap-2 overflow-hidden pb-2">{labels.map((label) => <span key={label} className="stage-axis-button">{label}</span>)}</div></div>
    <div className="mt-4 h-11" />
  </div>;
}
