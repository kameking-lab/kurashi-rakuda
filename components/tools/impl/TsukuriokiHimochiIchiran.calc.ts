/**
 * 作り置き 日持ち一覧（冷蔵/冷凍別）（P2-T24）— 純粋な検索・表示整形ロジック。
 * 仕様: specs/b-tools/p2-t24-tsukurioki-himochi-ichiran.md
 *
 * データ本体（カテゴリごとの冷蔵日数・冷凍週数の目安・出典）は
 * data/tables/tsukurioki-himochi.json を単一の情報源(SSOT)とし、本ファイルには数値をハードコードしない。
 * 計算ロジックは存在せず、固定データ（カテゴリ単位）の検索・表示整形のみ。
 *
 * ★データの限界（重要）★: 公的機関（消費者庁・農林水産省・厚生労働省）は、料理単位の
 * 具体的な冷蔵保存日数（例:「きんぴらごぼうは3日」）を明記していない。本データはカテゴリ
 * （味付け・調理法の傾向）単位の一般的な目安であり、料理名は検索用のエイリアスとして
 * カテゴリに紐付けているだけで、個別の料理に対して公的機関が保証した数値ではない。
 * この限界は searchTsukuriokiHimochi の返り値・画面表示の両方で常に開示する。
 */
import table from "@/data/tables/tsukurioki-himochi.json";

export interface TsukuriokiCategory {
  id: string;
  name: string;
  aliases: string[];
  refrigDaysMin: number;
  refrigDaysMax: number;
  refrigBasis: string;
  idealSameDay?: boolean;
  freezable: boolean;
  freezeWeeksMin?: number;
  freezeWeeksMax?: number;
  freezeNote?: string;
  caution?: string | null;
}

const CATEGORIES = table.categories as TsukuriokiCategory[];

export const TSUKURIOKI_DISCLAIMERS = table.commonDisclaimers;
export const TSUKURIOKI_GRANULARITY_LIMITATION = table.granularityLimitation as string;

export const TSUKURIOKI_SOURCE = {
  org: table.org,
  sources: table.sources as { label: string; url: string }[],
  lastVerified: table.lastVerified as string,
};

/** ひらがな⇄カタカナ・全角半角ゆれ・前後空白を吸収した素朴な正規化（カタカナ→ひらがな統一） */
export function normalizeQuery(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 日数の目安を読みやすい文字列にする（min===maxなら単一値、それ以外は範囲） */
export function formatDays(min: number, max: number): string {
  if (min === max) return `約${min}日`;
  return `約${min}〜${max}日`;
}

/** 週数の目安を読みやすい文字列にする */
export function formatWeeks(min: number, max: number): string {
  if (min === max) return `約${min}週間`;
  return `約${min}〜${max}週間`;
}

export interface CategoryDetail extends TsukuriokiCategory {
  refrigText: string;
  freezeText: string | null;
}

function toDetail(category: TsukuriokiCategory): CategoryDetail {
  return {
    ...category,
    refrigText: formatDays(category.refrigDaysMin, category.refrigDaysMax),
    freezeText:
      category.freezable && category.freezeWeeksMin != null && category.freezeWeeksMax != null
        ? formatWeeks(category.freezeWeeksMin, category.freezeWeeksMax)
        : null,
  };
}

export type TsukuriokiSearchResult =
  | { kind: "single"; item: CategoryDetail }
  | { kind: "list"; items: CategoryDetail[] }
  | { kind: "notFound" };

export interface TsukuriokiSearchParams {
  /** カテゴリの id。指定時は query より優先 */
  categoryId?: string | null;
  query?: string | null;
}

/**
 * 料理名（部分一致検索、カテゴリのエイリアスに対して照合）またはカテゴリIDから、
 * 冷蔵/冷凍の日持ち目安カテゴリを検索する純関数。
 */
export function searchTsukuriokiHimochi(params: TsukuriokiSearchParams): TsukuriokiSearchResult {
  const categoryId = params.categoryId?.trim();
  if (categoryId) {
    const item = CATEGORIES.find((c) => c.id === categoryId);
    if (!item) return { kind: "notFound" };
    return { kind: "single", item: toDetail(item) };
  }

  const query = params.query?.trim() ?? "";
  if (query === "") {
    return { kind: "list", items: CATEGORIES.map(toDetail) };
  }

  const normalized = normalizeQuery(query);
  const results = CATEGORIES.filter(
    (c) =>
      normalizeQuery(c.name).includes(normalized) ||
      c.aliases.some((a) => normalizeQuery(a).includes(normalized)),
  );

  if (results.length === 1) {
    return { kind: "single", item: toDetail(results[0]) };
  }
  if (results.length === 0) {
    return { kind: "notFound" };
  }
  return { kind: "list", items: results.map(toDetail) };
}

export function getCategoryById(id: string): CategoryDetail | null {
  const item = CATEGORIES.find((c) => c.id === id);
  return item ? toDetail(item) : null;
}

export function getAllCategories(): CategoryDetail[] {
  return CATEGORIES.map(toDetail);
}
