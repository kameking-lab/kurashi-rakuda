/*
 * 電子レンジ ワット数・加熱時間換算（P2-T26）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t26-renji-watt-kansan.md
 * RenjiWattKansan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他のdata/tables駆動ツールと同じ構成。
 * components/tools/impl/ShokuhiMeyasu.calc.ts を参考）。
 * データのSSOTは data/tables/renji-watt-kanzan-kijun.json（基本式・注意書き・換算表の
 * 実例値はすべて同JSONを参照し、ここに数値・文言を直書きしない）。
 */
import renjiData from "@/data/tables/renji-watt-kanzan-kijun.json";

export type RenjiKanzanResult =
  | {
      ok: true;
      motoW: number;
      motoJikanByou: number;
      henkoW: number;
      /** 丸め前の秒数（表示・照合の両方に使う） */
      henkoJikanByouRaw: number;
      /** 表示用に四捨五入した秒数 */
      henkoJikanByou: number;
    }
  | { ok: false; error: string };

/**
 * 基本式 T2 = T1 × W1 ÷ W2 で、変更後のワット数での加熱時間（秒）を計算する。
 * 0以下・非数値（NaN・Infinityを含む）はエラーとして扱う。
 */
export function calcRenjiKanzan(
  motoW: number,
  motoJikanByou: number,
  henkoW: number
): RenjiKanzanResult {
  const checks: Array<[string, number]> = [
    ["元のワット数", motoW],
    ["元の加熱時間", motoJikanByou],
    ["変更後のワット数", henkoW],
  ];

  for (const [label, value] of checks) {
    if (!Number.isFinite(value)) {
      return { ok: false, error: `${label}を数値で入力してください。` };
    }
    if (value <= 0) {
      return { ok: false, error: `${label}は0より大きい数値で入力してください。` };
    }
  }

  const henkoJikanByouRaw = (motoJikanByou * motoW) / henkoW;

  return {
    ok: true,
    motoW,
    motoJikanByou,
    henkoW,
    henkoJikanByouRaw,
    henkoJikanByou: Math.round(henkoJikanByouRaw),
  };
}

/** 秒数を「◯分◯秒」表記に変換する（60秒未満は「◯秒」のみ）。 */
export function formatByou(sec: number): string {
  const rounded = Math.round(sec);
  if (rounded < 60) return `${rounded}秒`;
  const pun = Math.floor(rounded / 60);
  const byou = rounded % 60;
  return byou === 0 ? `${pun}分` : `${pun}分${byou}秒`;
}

/**
 * 対照表（renji_shutsuryoku_kanzan_hyou_byou_ageo_shi）のキー（"W500"/"W600"/"W700"）から
 * 一般的なワット数のプリセット一覧を導出する。データに数値を直書きしない。
 */
const sampleRow = renjiData.renji_shutsuryoku_kanzan_hyou_byou_ageo_shi.kijun_1pun;
export const WATT_PRESETS: number[] = Object.keys(sampleRow)
  .map((k) => Number(k.replace("W", "")))
  .sort((a, b) => a - b);

/** 基本式の平文説明（data/tables/renji-watt-kanzan-kijun.json の kihon_shiki を参照） */
export const KIHON_SHIKI_TEXT: string = renjiData.kihon_shiki;

/** 注意書き（data/tables/renji-watt-kanzan-kijun.json の chuui_jikou を参照） */
export const CHUUI_JIKOU_TEXT: string = renjiData.chuui_jikou;

/** 出典（org・source_url・last_verified）。ツールページ・記事の出典表示に使う */
export const RENJI_KANZAN_SOURCE = {
  org: renjiData.org,
  sourceUrl: renjiData.source_url,
  lastVerified: renjiData.last_verified,
};

/** kanzan_rei・renji_shutsuryoku_kanzan_hyou_byou_ageo_shi（テスト・記事の機械照合用） */
export const kanzanRei = renjiData.kanzan_rei;
export const ageoHyou = renjiData.renji_shutsuryoku_kanzan_hyou_byou_ageo_shi;
