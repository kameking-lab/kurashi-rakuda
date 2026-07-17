/*
 * 食費の目安計算（P2-T28）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t28-shokuhi-meyasu.md
 * ShokuhiMeyasu.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他のdata/tables駆動ツールと同じ構成。
 * components/tools/impl/ChomiryoKanzan.calc.ts を参考）。
 * データのSSOTは data/tables/shokuhi-meyasu.json（総務省統計局「家計調査（家計収支編）」
 * 2025年（令和7年）平均。ここに数値を書かない）。
 */
import shokuhiData from "@/data/tables/shokuhi-meyasu.json";

interface RawBucket {
  setai_ninzuu: number;
  shouhi_shishutsu: number;
  shokuryou: number;
  gaishoku: number;
  chouri_shokuhin: number;
}

export interface FoodCostBucket {
  /** 表示用ラベル（例: "単身世帯（1人）"） */
  label: string;
  /** この試算に使われた統計上の世帯人員区分の代表人数（6人以上区分は6.3） */
  setaiNinzuu: number;
  /** 消費支出（生活費全体。参考情報） */
  shouhiShishutsu: number;
  /** 食料（食費の目安。メイン表示） */
  shokuryou: number;
  /** 外食（食料の内訳） */
  gaishoku: number;
  /** 調理食品＝中食（食料の内訳） */
  chouriShokuhin: number;
  /** 食料のうち外食・調理食品を除いた残り（食材購入・飲料・酒類などを含む） */
  sonota: number;
}

export type FoodCostResult =
  | {
      ok: true;
      /** 入力された世帯人員数（そのまま） */
      inputNinzuu: number;
      bucket: FoodCostBucket;
      /** 入力人数が統計区分の代表人数と一致しない場合（6人超）に true */
      isOverBucketed: boolean;
    }
  | { ok: false; error: string };

function toBucket(label: string, raw: RawBucket): FoodCostBucket {
  return {
    label,
    setaiNinzuu: raw.setai_ninzuu,
    shouhiShishutsu: raw.shouhi_shishutsu,
    shokuryou: raw.shokuryou,
    gaishoku: raw.gaishoku,
    chouriShokuhin: raw.chouri_shokuhin,
    sonota: raw.shokuryou - raw.gaishoku - raw.chouri_shokuhin,
  };
}

/**
 * 世帯人員数から、総務省統計局「家計調査」の実際の集計区分（単身/2人/3人/4人/5人/6人以上）
 * に基づく食費の目安を返す。存在しない粒度（世帯構成別・7人以上の按分値など）は作らない。
 */
export function calcFoodCostEstimate(setaininzuu: number): FoodCostResult {
  if (!Number.isFinite(setaininzuu)) {
    return { ok: false, error: "世帯人員数を入力してください。" };
  }
  if (!Number.isInteger(setaininzuu)) {
    return { ok: false, error: "世帯人員数は整数で入力してください。" };
  }
  if (setaininzuu < 1) {
    return { ok: false, error: "世帯人員数は1人以上の整数で入力してください。" };
  }

  const data = shokuhiData;
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
    bucket: toBucket(label, raw),
    // 「6人以上」区分は平均世帯人員6.3人のため、入力が6人ちょうどでも代表値とは一致しない
    isOverBucketed: setaininzuu >= 6,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
