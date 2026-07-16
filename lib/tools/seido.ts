/**
 * 制度データ（root data/seido/**）を読むための共通型とヘルパー。
 *
 * 設計の要点:
 *   - ツールは制度の数値をハードコードしない。必ずこの層を通して data/seido/ を読む。
 *   - 免責・準拠年度・次回改定予定は「データから導出」する。制度が変わったときに
 *     data/seido/*.json を差し替えるだけで表示が追随すること（コード修正を不要にする）。
 *   - scripts/verify-seido.mjs が出典ページとの機械照合を行うため、
 *     ここで読む値は常に一次情報と一致していることが CI で担保される。
 */

export type AmendmentStatus = "in-force" | "scheduled" | "under-review" | "expires";

export interface SeidoSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  landingUrl?: string;
  contentType?: string;
  checkedAt: string;
  tier: string;
  note?: string;
}

export interface SeidoAmendment {
  summary: string;
  status: AmendmentStatus;
  effectiveFrom?: string | null;
  expiresOn?: string;
  sourceId: string;
  impact?: string;
}

export interface SeidoDataset {
  id: string;
  name: string;
  fiscalYear: number;
  asOf: string;
  sources: SeidoSource[];
  amendments?: SeidoAmendment[];
  disclaimer: string;
  data: unknown;
}

/** 準拠年度の表示（例: 2026 → "2026年度（令和8年度）"） */
export function basisYearLabel(fiscalYear: number): string {
  // 令和は2019年が元年
  const reiwa = fiscalYear - 2018;
  return `${fiscalYear}年度（令和${reiwa}年度）`;
}

/**
 * 改正が実際に効き始める日。
 * status="expires" は「この日まで有効」を意味するため、切替日は expiresOn の翌日になる。
 * （例: 育休給付の上限額は expiresOn=2026-07-31 → 2026-08-01 に改定）
 */
export function amendmentEffectiveDate(a: SeidoAmendment): string | null {
  if (a.status === "expires" && a.expiresOn) return addDays(a.expiresOn, 1);
  return a.effectiveFrom ?? null;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 日本語の日付表記（2026-08-01 → 2026年8月1日） */
export function formatJaDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

export interface UpcomingChange {
  /** 改定が効き始める日（ISO） */
  date: string;
  summary: string;
  status: AmendmentStatus;
  source?: SeidoSource;
  /** 期限到来型（数値が無効になる）か。true なら更新しないと誤った値を出し続ける */
  isExpiry: boolean;
}

/**
 * 「次回改定予定」として表示すべき改正を、基準日より後のものだけ古い順に返す。
 *
 * status="under-review"（検討中で施行日未定）は日付を出せないため対象外。
 * 表示は SeidoNotice が行う。
 */
export function upcomingChanges(
  ds: SeidoDataset,
  today: string,
  limit = 3,
): UpcomingChange[] {
  const sourceById = new Map(ds.sources.map((s) => [s.id, s]));
  const out: UpcomingChange[] = [];

  for (const a of ds.amendments ?? []) {
    if (a.status === "in-force" || a.status === "under-review") continue;
    const date = amendmentEffectiveDate(a);
    if (!date || date <= today) continue;
    out.push({
      date,
      summary: a.summary,
      status: a.status,
      source: sourceById.get(a.sourceId),
      isExpiry: a.status === "expires",
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

/**
 * 基準日時点でデータの有効期限が切れているか。
 *
 * 切れている＝制度の数値が既に変わっている可能性が高い。
 * 育休給付の支給限度額のように毎年8月1日に改定されるものがあり、
 * 古い値で金額を出し続けるのは YMYL 上ワーストなので、
 * ツールは計算を止めて更新中である旨を表示する。
 */
export function expiredAmendments(ds: SeidoDataset, today: string): SeidoAmendment[] {
  return (ds.amendments ?? []).filter(
    (a) => a.status === "expires" && a.expiresOn !== undefined && a.expiresOn < today,
  );
}

export function isDataExpired(ds: SeidoDataset, today: string): boolean {
  return expiredAmendments(ds, today).length > 0;
}

/** registry の sources 形式（label/url）へ変換。出典表示をデータ駆動にするため */
export function toToolSources(ds: SeidoDataset, ids?: string[]): { label: string; url: string }[] {
  const picked = ids ? ds.sources.filter((s) => ids.includes(s.id)) : ds.sources;
  return picked.map((s) => ({
    label: `${s.publisher}「${s.title}」`,
    url: s.landingUrl ?? s.url,
  }));
}

/** 今日（JST）。制度の日付は日本時間基準のため UTC 判定にしない */
export function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
