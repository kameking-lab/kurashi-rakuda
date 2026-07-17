/**
 * 洗濯表示検索（Q3-17）— 固定データの検索・絞り込みロジック（計算ロジックなし）。
 * 仕様: specs/b-tools/41-laundry-care-label-search.md
 *
 * データ本体（記号・意味・お手入れ方法・出典）は data/tables/sentaku-hyoji.json を
 * 単一の情報源(SSOT)として import する。記号を追加・修正する場合は同JSONだけを更新する。
 * （D2対応・2026-07-17: data/tables/sentaku-hyouji.json を廃止し本ファイルへ統合した）
 *
 * ★記号の総数を断定しないこと★ 消費者庁の現行解説ページに総数の明記がない。
 * 記号は記号番号（number）で一意に識別する（data の kigouSousuuNote 参照）。
 */
import table from "@/data/tables/sentaku-hyoji.json";

export type SentakuCategory = "洗濯" | "漂白" | "乾燥" | "アイロン" | "クリーニング";

export interface SentakuSymbol {
  id: string;
  /** 消費者庁の解説ページ『各記号の詳細』の記号番号（190・111・511 など） */
  number: number;
  category: SentakuCategory;
  symbolShape: string;
  meaning: string;
  handlingTip: string;
  keywords: string[];
}

export interface SentakuSymbolDetail extends SentakuSymbol {
  /** 見間違えやすい・対になる記号（詳細つき） */
  relatedSymbols: SentakuSymbol[];
  /** デリケート素材（クリーニング専用表示・手洗い）はクリーニング店への相談を促す注記を付与する */
  delicateCaution: boolean;
  source: string;
  effectiveDateLabel: string;
  oldJisNote: string;
  generalCautionNote: string;
}

export type SentakuSearchResult =
  | { kind: "detail"; item: SentakuSymbolDetail }
  | { kind: "list"; items: SentakuSymbol[] }
  | { kind: "not_found"; note: string };

const SYMBOLS: SentakuSymbol[] = table.symbols as SentakuSymbol[];
const RELATED: Record<string, string[]> = table.relatedSymbols as Record<string, string[]>;
const SOURCE_LABEL = `${table.source.label}（家庭用品品質表示法・${table.jisEdition}）`;

export const SENTAKU_CATEGORIES = table.categories as SentakuCategory[];
export const SENTAKU_EFFECTIVE_DATE_LABEL = table.effectiveDateLabel;
export const SENTAKU_OLD_JIS_NOTE = table.oldJisNote;
export const SENTAKU_GENERAL_CAUTION_NOTE = table.generalCautionNote;
export const SENTAKU_DELICATE_CAUTION_NOTE = table.delicateCautionNote;
export const SENTAKU_UNREADABLE_NOTE = table.unreadableNote;
export const SENTAKU_NOT_FOUND_NOTE = table.notFoundNote;

/**
 * 検索クエリの正規化。全角数字→半角数字、前後・内部の空白除去、
 * 半角/全角カナ・英字の大文字小文字ゆれを吸収する。
 */
export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** 手洗い表示（記号番号110・111）。id ではなく記号番号で判定する（記号の増減に強い） */
const TEARAI_NUMBERS = [110, 111];

function isDelicateCaution(item: Pick<SentakuSymbol, "number" | "category">): boolean {
  return item.category === "クリーニング" || TEARAI_NUMBERS.includes(item.number);
}

export function findSymbolById(id: string): SentakuSymbol | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

function toDetail(item: SentakuSymbol): SentakuSymbolDetail {
  const relatedIds = RELATED[item.id] ?? [];
  const relatedSymbols = relatedIds
    .map((id) => findSymbolById(id))
    .filter((s): s is SentakuSymbol => Boolean(s));
  return {
    ...item,
    relatedSymbols,
    delicateCaution: isDelicateCaution(item),
    source: SOURCE_LABEL,
    effectiveDateLabel: SENTAKU_EFFECTIVE_DATE_LABEL,
    oldJisNote: SENTAKU_OLD_JIS_NOTE,
    generalCautionNote: SENTAKU_GENERAL_CAUTION_NOTE,
  };
}

/**
 * 記号検索（仕様書のロジック仕様の疑似コードに準拠）。
 * symbolId が指定されていれば最優先。次に category で絞り込み、
 * query があれば意味文（meaning）・keywords のいずれかに正規化後の文字列が
 * 部分一致するものだけを残す。結果1件なら詳細、0件なら未登録、複数なら一覧。
 */
export function searchSentakuHyoji(params: {
  query?: string;
  category?: SentakuCategory | null;
  symbolId?: string | null;
}): SentakuSearchResult {
  const { query, category, symbolId } = params;

  if (symbolId) {
    const item = findSymbolById(symbolId);
    if (!item) return { kind: "not_found", note: SENTAKU_NOT_FOUND_NOTE };
    return { kind: "detail", item: toDetail(item) };
  }

  let results = SYMBOLS;
  if (category) {
    results = results.filter((s) => s.category === category);
  }

  const trimmedQuery = (query ?? "").trim();
  if (trimmedQuery !== "") {
    const normalized = normalize(trimmedQuery);
    results = results.filter((s) => {
      if (normalize(s.meaning).includes(normalized)) return true;
      return s.keywords.some((k) => normalize(k).includes(normalized));
    });
  }

  if (results.length === 1) {
    return { kind: "detail", item: toDetail(results[0]) };
  }
  if (results.length === 0) {
    return { kind: "not_found", note: SENTAKU_NOT_FOUND_NOTE };
  }
  return { kind: "list", items: results };
}

/** 全記号（カテゴリ一覧表示など、絞り込みなしの表示に使う） */
export function getAllSymbols(): SentakuSymbol[] {
  return SYMBOLS;
}

export function getSymbolsByCategory(category: SentakuCategory): SentakuSymbol[] {
  return SYMBOLS.filter((s) => s.category === category);
}
