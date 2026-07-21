import { normalizeText } from "@/lib/search/normalize";

/*
 * 保育料ツールの「対応自治体を全件見る」展開UI（DIAG-A4-2）向けの絞り込みロジック。
 * 都道府県ごとにグルーピングした一覧を返す。件数が将来1,700超（全市区町村）まで
 * 伸びる前提のため、無限リストではなく検索での絞り込みを前提にする。
 */

export interface MunicipalityLike {
  id: string;
  name: string;
  prefecture: string;
}

export interface GroupedMunicipalities {
  prefecture: string;
  items: MunicipalityLike[];
}

/**
 * 都道府県順（元の並び順を保持）にグルーピングし、query があれば市区町村名・都道府県名で絞り込む。
 * 空文字のグループは返さない（検索結果が0件の都道府県は表示しない）。
 */
export function groupMunicipalitiesByPrefecture<T extends MunicipalityLike>(
  entries: readonly T[],
  query = "",
): GroupedMunicipalities[] {
  const needle = normalizeText(query.trim());
  const byPref = new Map<string, T[]>();
  for (const m of entries) {
    if (needle && !normalizeText(m.name).includes(needle) && !normalizeText(m.prefecture).includes(needle)) {
      continue;
    }
    const list = byPref.get(m.prefecture) ?? [];
    list.push(m);
    byPref.set(m.prefecture, list);
  }
  return [...byPref.entries()].map(([prefecture, items]) => ({ prefecture, items }));
}

/** 絞り込み後の総件数（「◯件見つかりました」表示用） */
export function countMatched(groups: GroupedMunicipalities[]): number {
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}
