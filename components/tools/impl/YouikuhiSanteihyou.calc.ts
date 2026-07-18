/*
 * 養育費 目安（裁判所算定表）（P2-T08）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/15-youikuhi-santeihyou.md
 *
 * SSOT: data/seido/youikuhi-santeihyou.json（改定標準算定方式・算定表 令和元年版）。
 *
 * ★このツールが「しない」こと（データの制約）★
 *   養育費の額そのものを義務者・権利者の年収から算出しない。
 *   算定表（表1〜9）の金額はPDF画像で提供されており本文テキストが抽出できない
 *   （tablePdfTextExtractable=false）ため、金額表はデータ化されていない。捏造しない。
 *   本ツールは①子の人数と年齢から使うべき算定表を特定して公式PDFへ案内し、
 *   ②算定表から読み取った合計額を、公式の「子の指数」で各子に按分する、
 *   ③法定養育費・先取特権の額を案内する、に限定する。
 */
import seido from "@/data/seido/youikuhi-santeihyou.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const youikuhiSanteihyouDataset = seido as unknown as SeidoDataset;
export const YOUIKUHI_DISCLAIMER = seido.disclaimer;

const CI = seido.data.childIndex;
const TABLES = seido.data.tableStructure.tables.items;

/** 子の指数（親を100としたときの子の生活費割合） */
export const INDEX_AGE_0_14 = CI.age0to14.value; // 62
export const INDEX_AGE_15_PLUS = CI.age15plus.value; // 85
export const AGE_BOUNDARY = seido.data.tableStructure.ageBoundary.value; // 15
export const MAX_CHILDREN = seido.data.tableStructure.maxChildren.value; // 3

/** 法定養育費（取決めがない場合に発生する定期金・1人あたり月額） */
export const HOUTEI_YOUIKUHI_PER_CHILD = seido.data.houteiYouikuhi.monthlyAmountPerChild.value; // 20,000
/** 先取特権の対象となる1人あたりの額 */
export const SAKIDORI_PER_CHILD = seido.data.sakidoriTokken.amountPerChild.value; // 80,000

export type AgeGroup = "0-14" | "15+";

export function indexOf(age: AgeGroup): number {
  return age === "15+" ? INDEX_AGE_15_PLUS : INDEX_AGE_0_14;
}

/** 表選択のため、15歳以上を先に並べる（データの ages 配列と同じ順序） */
function sortAges(ages: AgeGroup[]): AgeGroup[] {
  return [...ages].sort((a, b) => (a === b ? 0 : a === "15+" ? -1 : 1));
}

export interface TableInfo {
  no: number;
  title: string;
  pdfUrl: string;
}

/** 子の人数・年齢構成から該当する養育費算定表（表1〜9）を返す */
export function selectTable(ages: AgeGroup[]): TableInfo | null {
  if (ages.length < 1 || ages.length > MAX_CHILDREN) return null;
  const sorted = sortAges(ages);
  const match = TABLES.find(
    (t) =>
      t.type === "youikuhi" &&
      t.children === ages.length &&
      t.ages.length === sorted.length &&
      t.ages.every((a, i) => a === sorted[i]),
  );
  if (!match) return null;
  return { no: match.no, title: match.titleAsPublished, pdfUrl: match.pdfUrl };
}

export interface ChildAllocation {
  age: AgeGroup;
  index: number;
  amount: number;
}

export interface AllocationResult {
  perChild: ChildAllocation[];
  totalIndex: number;
  total: number;
}

/**
 * 算定表から読み取った合計養育費を、子の指数で各子に按分する。
 * 端数は最後の子に寄せて合計額を保つ（allocationRule）。
 */
export function allocateByIndex(total: number, ages: AgeGroup[]): AllocationResult {
  const indices = ages.map(indexOf);
  const totalIndex = indices.reduce((s, x) => s + x, 0);
  let running = 0;
  const perChild: ChildAllocation[] = ages.map((age, i) => {
    const idx = indices[i];
    let amount: number;
    if (i < ages.length - 1) {
      amount = Math.round((total * idx) / totalIndex);
      running += amount;
    } else {
      amount = total - running;
    }
    return { age, index: idx, amount };
  });
  return { perChild, totalIndex, total };
}

export interface YouikuhiInput {
  ages: AgeGroup[];
  /** 算定表から読み取った合計月額（円・任意）。指定時のみ按分を計算 */
  tableAmount?: number;
}

export interface YouikuhiResult {
  ok: true;
  table: TableInfo | null;
  allocation: AllocationResult | null;
  houteiPerChild: number;
  houteiTotal: number;
  sakidoriPerChild: number;
  childrenCount: number;
}

export type YouikuhiCalcResult = YouikuhiResult | { ok: false; error: string };

export function calcYouikuhi(input: YouikuhiInput): YouikuhiCalcResult {
  if (!Array.isArray(input.ages) || input.ages.length < 1) {
    return { ok: false, error: "子どもの年齢区分を1人以上選んでください。" };
  }
  if (input.ages.length > MAX_CHILDREN) {
    return {
      ok: false,
      error: `子が4人以上の場合に対応する算定表はありません（この算定表は${MAX_CHILDREN}人まで）。`,
    };
  }

  const table = selectTable(input.ages);
  const allocation =
    input.tableAmount != null && Number.isFinite(input.tableAmount) && input.tableAmount > 0
      ? allocateByIndex(Math.floor(input.tableAmount), input.ages)
      : null;

  return {
    ok: true,
    table,
    allocation,
    houteiPerChild: HOUTEI_YOUIKUHI_PER_CHILD,
    houteiTotal: HOUTEI_YOUIKUHI_PER_CHILD * input.ages.length,
    sakidoriPerChild: SAKIDORI_PER_CHILD,
    childrenCount: input.ages.length,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
