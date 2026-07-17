/**
 * 冷凍保存期間検索（Q3-13）— 純粋な検索・表示整形ロジック。
 * 仕様: specs/b-tools/37-frozen-storage-period-search.md
 *
 * データ本体（食材ごとの保存期間・下処理のコツ・解凍のコツ・出典）は
 * data/tables/reito-hozon.json を単一の情報源(SSOT)とし、本ファイルには数値をハードコードしない。
 * 計算ロジックは存在せず、固定データの検索・表示整形のみ（仕様書「ロジック仕様」参照）。
 */
import table from "@/data/tables/reito-hozon.json";

export interface FoodItem {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  state: string;
  periodWeeksMin: number;
  periodWeeksMax: number;
  prepTips: string;
  thawTips: string;
  caution?: string;
}

const ITEMS = table.items as FoodItem[];

export const REITO_HOZON_CATEGORIES = table.categories as string[];

export const REITO_HOZON_DISCLAIMERS = table.commonDisclaimers;

export const REITO_HOZON_SOURCE = {
  org: table.org,
  sourceUrl: table.sourceUrl,
  lastVerified: table.lastVerified,
};

/** ひらがな⇄カタカナ・全角半角ゆれ・前後空白を吸収した素朴な正規化（カタカナ→ひらがな統一） */
export function normalizeFoodQuery(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 週数→読みやすい文字列（4週区切りで「ヶ月」に丸める。データ本体は週単位で保持） */
function weeksToUnit(weeks: number): { value: number; unit: "ヶ月" | "週間" } {
  if (weeks > 0 && weeks % 4 === 0) {
    return { value: weeks / 4, unit: "ヶ月" };
  }
  return { value: weeks, unit: "週間" };
}

/**
 * 保存期間目安の表示文字列を作る。
 * min===max のときは「約◯◯」、範囲かつ単位が同じときは「約◯〜◯単位」、
 * 単位が異なるときは「約◯単位〜◯単位」（例: 2週間〜1ヶ月）。
 * 「あくまで目安」であることを常に伝えるため、いずれの場合も「約」を付ける。
 */
export function formatPeriod(minWeeks: number, maxWeeks: number): string {
  const a = weeksToUnit(minWeeks);
  if (minWeeks === maxWeeks) {
    return `約${a.value}${a.unit}`;
  }
  const b = weeksToUnit(maxWeeks);
  if (a.unit === b.unit) {
    return `約${a.value}〜${b.value}${a.unit}`;
  }
  return `約${a.value}${a.unit}〜${b.value}${b.unit}`;
}

export interface FoodDetail extends FoodItem {
  periodText: string;
}

export type ReitoHozonSearchResult =
  | { kind: "single"; item: FoodDetail }
  | { kind: "list"; items: FoodDetail[] }
  | { kind: "notFound" };

export interface ReitoHozonSearchParams {
  /** 食材マスタの id。指定時は query・category より優先（仕様書「入力仕様」） */
  foodId?: string | null;
  query?: string | null;
  category?: string | null;
}

function toDetail(item: FoodItem): FoodDetail {
  return { ...item, periodText: formatPeriod(item.periodWeeksMin, item.periodWeeksMax) };
}

/**
 * 食材名（部分一致検索）・食材ID・カテゴリから保存期間目安・解凍のコツを検索する純関数。
 * 仕様書のロジック疑似コードに準拠（search 関数）。
 */
export function searchReitoHozon(params: ReitoHozonSearchParams): ReitoHozonSearchResult {
  const foodId = params.foodId?.trim();
  if (foodId) {
    const item = ITEMS.find((d) => d.id === foodId);
    if (!item) return { kind: "notFound" };
    return { kind: "single", item: toDetail(item) };
  }

  let results = ITEMS;
  if (params.category) {
    results = results.filter((d) => d.category === params.category);
  }

  const query = params.query?.trim() ?? "";
  if (query !== "") {
    const normalized = normalizeFoodQuery(query);
    results = results.filter(
      (d) =>
        normalizeFoodQuery(d.name).includes(normalized) ||
        d.aliases.some((a) => normalizeFoodQuery(a).includes(normalized)),
    );
  }

  if (results.length === 1) {
    return { kind: "single", item: toDetail(results[0]) };
  }
  if (results.length === 0) {
    return { kind: "notFound" };
  }
  return { kind: "list", items: results.map(toDetail) };
}

/** id から食材1件を直接取得する（プログラマティック展開ページからの直接遷移用） */
export function getFoodById(id: string): FoodDetail | null {
  const item = ITEMS.find((d) => d.id === id);
  return item ? toDetail(item) : null;
}

export function getAllFoods(): FoodDetail[] {
  return ITEMS.map(toDetail);
}
