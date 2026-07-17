/*
 * 手取りからの予算配分計算（費目テンプレ）（P2-T29）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t29-yosan-haibun-keisan.md
 * YosanHaibunKeisan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（components/tools/impl/ShokuhiMeyasu.calc.ts と同じ構成。
 * データのSSOTは data/tables/yosan-haibun-hiritsu.json（総務省統計局「家計調査（家計収支編）」
 * 2025年（令和7年）平均。ここに数値を書かない）。
 */
import yosanData from "@/data/tables/yosan-haibun-hiritsu.json";

interface RawBucket {
  setai_ninzuu: number;
  shouhi_shishutsu: number;
  shokuryou: number;
  juukyo: number;
  kounetsu_suidou: number;
  kagu_kaji_youhin: number;
  hifuku_hakimono: number;
  hoken_iryou: number;
  koutsuu_tsuushin: number;
  kyouiku: number;
  kyouyou_goraku: number;
  sonota_shouhi_shishutsu: number;
}

/** 費目キーと表示ラベルの対応（家計調査の10大費目の順）。 */
const CATEGORY_DEFS: { key: keyof Omit<RawBucket, "setai_ninzuu" | "shouhi_shishutsu">; label: string }[] = [
  { key: "shokuryou", label: "食料" },
  { key: "juukyo", label: "住居" },
  { key: "kounetsu_suidou", label: "光熱・水道" },
  { key: "kagu_kaji_youhin", label: "家具・家事用品" },
  { key: "hifuku_hakimono", label: "被服及び履物" },
  { key: "hoken_iryou", label: "保健医療" },
  { key: "koutsuu_tsuushin", label: "交通・通信" },
  { key: "kyouiku", label: "教育" },
  { key: "kyouyou_goraku", label: "教養娯楽" },
  { key: "sonota_shouhi_shishutsu", label: "その他の消費支出" },
];

export interface CategoryAllocation {
  /** データ表のキー（例: "shokuryou"） */
  key: string;
  /** 表示用ラベル（例: "食料"） */
  label: string;
  /** 家計調査における消費支出全体に対するこの費目の構成比（0〜1の小数） */
  ratio: number;
  /** 入力された手取り月収にこの構成比を掛けた目安金額（円、四捨五入） */
  amount: number;
}

export interface BudgetBucket {
  /** 表示用ラベル（例: "単身世帯（1人）"） */
  label: string;
  /** この試算に使われた統計上の世帯人員区分の代表人数（6人以上区分は6.3） */
  setaiNinzuu: number;
  /** 家計調査における消費支出の合計額（構成比の分母。参考情報） */
  shouhiShishutsuTotal: number;
  /** 費目別の構成比・目安金額（家計調査の10大費目の順） */
  categories: CategoryAllocation[];
}

export type BudgetAllocationResult =
  | {
      ok: true;
      /** 入力された世帯人員数（そのまま） */
      inputNinzuu: number;
      /** 入力された手取り月収（そのまま） */
      inputTedori: number;
      bucket: BudgetBucket;
      /** 入力人数が統計区分の代表人数と一致しない場合（6人超）に true */
      isOverBucketed: boolean;
    }
  | { ok: false; error: string };

function toBucket(label: string, raw: RawBucket, tedoriGesshuu: number): BudgetBucket {
  const total = raw.shouhi_shishutsu;
  const categories: CategoryAllocation[] = CATEGORY_DEFS.map(({ key, label: catLabel }) => {
    const rawAmount = raw[key];
    const ratio = rawAmount / total;
    return {
      key,
      label: catLabel,
      ratio,
      amount: Math.round(tedoriGesshuu * ratio),
    };
  });

  return {
    label,
    setaiNinzuu: raw.setai_ninzuu,
    shouhiShishutsuTotal: total,
    categories,
  };
}

/**
 * 世帯人員数と手取り月収から、総務省統計局「家計調査」の費目別支出構成比（全国平均）に基づく
 * 予算配分の目安を返す。世帯人員区分は data/tables/shokuhi-meyasu.json（P2-T28）と同じ
 * 集計区分（単身/2人/3人/4人/5人/6人以上）を用い、存在しない粒度（世帯構成別・7人以上の
 * 按分値など）は作らない。
 *
 * ★構成比の適用は簡易な按分であり、家計調査の「消費支出」（実際に使われた生活費の平均額）を
 * そのまま入力された「手取り月収」（可処分所得）に当てはめている。消費に回さず貯蓄に回した分は
 * 元データに含まれないため、実際の貯蓄率とは無関係に按分される点に注意（仕様書・UIのCalloutで明記）。
 */
export function calcBudgetAllocation(setaininzuu: number, tedoriGesshuu: number): BudgetAllocationResult {
  if (!Number.isFinite(setaininzuu)) {
    return { ok: false, error: "世帯人員数を入力してください。" };
  }
  if (!Number.isInteger(setaininzuu)) {
    return { ok: false, error: "世帯人員数は整数で入力してください。" };
  }
  if (setaininzuu < 1) {
    return { ok: false, error: "世帯人員数は1人以上の整数で入力してください。" };
  }
  if (!Number.isFinite(tedoriGesshuu)) {
    return { ok: false, error: "手取り月収を入力してください。" };
  }
  if (tedoriGesshuu <= 0) {
    return { ok: false, error: "手取り月収は1円以上の金額で入力してください。" };
  }

  const data = yosanData;
  let label: string;
  let raw: RawBucket;

  if (setaininzuu === 1) {
    label = "単身世帯（1人）";
    raw = data.tanshin_setai;
  } else if (setaininzuu === 2) {
    label = "2人世帯";
    raw = data.futari_ijou_setai.ninin;
  } else if (setaininzuu === 3) {
    label = "3人世帯";
    raw = data.futari_ijou_setai.sannin;
  } else if (setaininzuu === 4) {
    label = "4人世帯";
    raw = data.futari_ijou_setai.yonin;
  } else if (setaininzuu === 5) {
    label = "5人世帯";
    raw = data.futari_ijou_setai.gonin;
  } else {
    label = "6人以上世帯";
    raw = data.futari_ijou_setai.rokunin_ijou;
  }

  return {
    ok: true,
    inputNinzuu: setaininzuu,
    inputTedori: tedoriGesshuu,
    bucket: toBucket(label, raw, tedoriGesshuu),
    // 「6人以上」区分は平均世帯人員6.3人のため、入力が6人ちょうどでも代表値とは一致しない
    isOverBucketed: setaininzuu >= 6,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

export function fmtPercent(ratio: number): string {
  return (ratio * 100).toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
