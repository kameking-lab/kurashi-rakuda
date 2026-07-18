/**
 * 並べ替え・ハイライトの純関数土台（docs/12_パーソナライズ設計.md）。
 *
 * SEO を殺さないための不変条件:
 *   - これらは「並べ替え・ハイライト」専用。要素を1つも DOM から落とさない。
 *   - プロフィール未設定・Googlebot では入力順のまま（並べ替えは無効）。
 *   - 副作用なし・DOM 非依存の純関数。SSR は未設定（入力順）で出力し、
 *     クライアントで localStorage の Profile を読んで後付けで適用する。
 */
import type {
  Audience,
  LifeStage,
  LifeEvent,
  ChildAgeBand,
  Gender,
} from "@/app/lib/audience";

/** 任意プロフィール（すべて任意・未設定可）。localStorage 由来を想定 */
export interface Profile {
  lifeStages?: LifeStage[];
  lifeEvents?: LifeEvent[];
  childAgeBands?: ChildAgeBand[];
  gender?: Gender;
}

/** プロフィールが実質空（未設定）か。空なら並べ替え・強調を行わない */
export function isProfileEmpty(p: Profile | null | undefined): boolean {
  if (!p) return true;
  return !(
    (p.lifeStages && p.lifeStages.length > 0) ||
    (p.lifeEvents && p.lifeEvents.length > 0) ||
    (p.childAgeBands && p.childAgeBands.length > 0) ||
    p.gender
  );
}

function overlapCount<T>(a: T[] | undefined, b: T[] | undefined): number {
  if (!a || !a.length || !b || !b.length) return 0;
  const set = new Set(a);
  return b.reduce((n, x) => (set.has(x) ? n + 1 : n), 0);
}

/** スコアの重み（イベント一致を最重視。docs/12 の契約） */
const WEIGHT = { event: 5, stage: 4, band: 3, genderMatch: 2, genderMismatch: -3, universal: 1 } as const;

/**
 * プロフィールと audience の一致度スコア。大きいほど関連が強い。
 * 並べ替え専用であり、スコアが低くても呼び出し側は要素を除外しない。
 * プロフィール未設定なら常に 0（全件横並び＝既定順を維持）。
 */
export function scoreAudience(
  profile: Profile | null | undefined,
  audience: Audience,
): number {
  if (isProfileEmpty(profile)) return 0;
  const p = profile as Profile;
  let score = 0;
  score += overlapCount(p.lifeEvents, audience.lifeEvents) * WEIGHT.event;
  score += overlapCount(p.lifeStages, audience.lifeStages) * WEIGHT.stage;
  score += overlapCount(p.childAgeBands, audience.childAgeBands) * WEIGHT.band;
  if (p.gender && audience.gender) {
    score += p.gender === audience.gender ? WEIGHT.genderMatch : WEIGHT.genderMismatch;
  }
  // 万人向けは「関係なくはない」を担保する軽い基礎点（沈めすぎない）
  if (audience.universal) score += WEIGHT.universal;
  return score;
}

/** 強調表示（バッジ等）の判定。見た目は Codex。イベント一致1つ相当（=5点）以上を強調 */
export function isHighlighted(
  profile: Profile | null | undefined,
  audience: Audience,
): boolean {
  if (isProfileEmpty(profile)) return false;
  return scoreAudience(profile, audience) >= WEIGHT.event;
}

/**
 * audience を持つ要素をスコア降順に安定ソートして返す。
 * 【重要】要素を1つも落とさない（必ず全件返す）。
 * プロフィール未設定なら入力順のコピーをそのまま返す（既定順＝SSR出力と一致）。
 */
export function sortByAudience<T extends { audience: Audience }>(
  items: T[],
  profile: Profile | null | undefined,
): T[] {
  if (isProfileEmpty(profile)) return items.slice();
  return items
    .map((item, index) => ({ item, index, score: scoreAudience(profile, item.audience) }))
    .sort((a, b) => b.score - a.score || a.index - b.index) // 同点は元の順（安定）
    .map((x) => x.item);
}
