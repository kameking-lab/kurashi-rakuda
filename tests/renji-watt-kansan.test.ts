import { describe, expect, it } from "vitest";
import {
  calcRenjiKanzan,
  formatByou,
  WATT_PRESETS,
  kanzanRei,
  ageoHyou,
} from "@/components/tools/impl/RenjiWattKansan.calc";

/*
 * 電子レンジ ワット数・加熱時間換算（P2-T26）のテスト。
 * データは data/tables/renji-watt-kanzan-kijun.json を正とする。
 * テストケース表は specs/b-tools/p2-t26-renji-watt-kansan.md と対応する。
 *
 * 上尾市の換算表（kanzan_rei・renji_shutsuryoku_kanzan_hyou_byou_ageo_shi）は
 * 原典が市販書籍（宝島社TJMook）からの転載であり、実用上10秒単位に丸められた
 * 目安値のため、基本式 T2=T1×W1÷W2 の計算値とは完全一致しない行がある
 * （data/tables/renji-watt-kanzan-kijun.json の $comment 参照）。
 * そのため、500W→600Wの1例（基本式と完全一致することが確認済み）は厳密一致で、
 * それ以外の上尾市表由来の値は「差が10秒未満（絶対値）」という整合性の確認にとどめる。
 */

const TOLERANCE_BYOU = 10;

describe("calcRenjiKanzan", () => {
  it("#1 500W→600Wで120秒→100秒（基本式と完全一致するBACKLOG記載の例）", () => {
    const r = calcRenjiKanzan(500, 120, 600);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.henkoJikanByouRaw).toBe(100);
    expect(r.henkoJikanByou).toBe(100);
  });

  it("#2 kanzan_rei.500W_kara_600W の実例値と厳密一致する", () => {
    const rei = kanzanRei["500W_kara_600W"];
    const r = calcRenjiKanzan(500, rei.moto_byou, 600);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.henkoJikanByou).toBe(rei.henkan_go_byou);
  });

  it("#3 kanzan_rei.600W_kara_500W_ageo_hyou と10秒未満の差で整合する", () => {
    const rei = kanzanRei["600W_kara_500W_ageo_hyou"];
    const r = calcRenjiKanzan(600, rei.moto_byou, 500);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.abs(r.henkoJikanByouRaw - rei.henkan_go_byou)).toBeLessThan(TOLERANCE_BYOU);
  });

  it("#4 kanzan_rei.600W_kara_700W_ageo_hyou と10秒未満の差で整合する", () => {
    const rei = kanzanRei["600W_kara_700W_ageo_hyou"];
    const r = calcRenjiKanzan(600, rei.moto_byou, 700);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.abs(r.henkoJikanByouRaw - rei.henkan_go_byou)).toBeLessThan(TOLERANCE_BYOU);
  });

  it("#5 同じワット数への変換は時間が変わらない（倍率1の境界値）", () => {
    const r = calcRenjiKanzan(600, 600, 600);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.henkoJikanByou).toBe(600);
  });

  // 対照表 renji_shutsuryoku_kanzan_hyou_byou_ageo_shi の全10行を
  // 600W基準→500W・700Wの両方向で機械照合する（合計20ケース）。
  const ageoRows = Object.entries(ageoHyou).filter(([key]) => key !== "$comment") as Array<
    [string, { W600: number; W500: number; W700: number }]
  >;

  describe("renji_shutsuryoku_kanzan_hyou_byou_ageo_shi との整合確認（600W→500W）", () => {
    it.each(ageoRows)("%s: 600W基準%s秒 → 500Wの表値と10秒未満の差", (_key, row) => {
      const r = calcRenjiKanzan(600, row.W600, 500);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(Math.abs(r.henkoJikanByouRaw - row.W500)).toBeLessThan(TOLERANCE_BYOU);
    });
  });

  describe("renji_shutsuryoku_kanzan_hyou_byou_ageo_shi との整合確認（600W→700W）", () => {
    it.each(ageoRows)("%s: 600W基準%s秒 → 700Wの表値と10秒未満の差", (_key, row) => {
      const r = calcRenjiKanzan(600, row.W600, 700);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(Math.abs(r.henkoJikanByouRaw - row.W700)).toBeLessThan(TOLERANCE_BYOU);
    });
  });

  it("#6 元のワット数が0はエラー", () => {
    const r = calcRenjiKanzan(0, 120, 600);
    expect(r.ok).toBe(false);
  });

  it("#7 元のワット数が負数はエラー", () => {
    const r = calcRenjiKanzan(-500, 120, 600);
    expect(r.ok).toBe(false);
  });

  it("#8 元の加熱時間が0はエラー", () => {
    const r = calcRenjiKanzan(500, 0, 600);
    expect(r.ok).toBe(false);
  });

  it("#9 元の加熱時間が負数はエラー", () => {
    const r = calcRenjiKanzan(500, -10, 600);
    expect(r.ok).toBe(false);
  });

  it("#10 変更後のワット数が0はエラー", () => {
    const r = calcRenjiKanzan(500, 120, 0);
    expect(r.ok).toBe(false);
  });

  it("#11 変更後のワット数が負数はエラー", () => {
    const r = calcRenjiKanzan(500, 120, -600);
    expect(r.ok).toBe(false);
  });

  it("#12 元のワット数がNaN（非数値）はエラー", () => {
    const r = calcRenjiKanzan(NaN, 120, 600);
    expect(r.ok).toBe(false);
  });

  it("#13 元の加熱時間がNaNはエラー", () => {
    const r = calcRenjiKanzan(500, NaN, 600);
    expect(r.ok).toBe(false);
  });

  it("#14 変更後のワット数がInfinityはエラー", () => {
    const r = calcRenjiKanzan(500, 120, Infinity);
    expect(r.ok).toBe(false);
  });

  it("#15 元のワット数が-Infinityはエラー", () => {
    const r = calcRenjiKanzan(-Infinity, 120, 600);
    expect(r.ok).toBe(false);
  });

  it("#16 極端に大きい値でもクラッシュせず有限の結果を返す", () => {
    const r = calcRenjiKanzan(1e15, 1e15, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number.isFinite(r.henkoJikanByou)).toBe(true);
  });

  it("#17 極端に小さい正の値でもクラッシュせず正しく計算する", () => {
    const r = calcRenjiKanzan(0.001, 1, 0.002);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.henkoJikanByouRaw).toBeCloseTo(0.5, 6);
  });

  it("#18 エラーメッセージは該当欄の名前を含む", () => {
    const r = calcRenjiKanzan(500, 120, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("変更後のワット数");
  });
});

describe("formatByou", () => {
  it("60秒未満は秒のみ", () => {
    expect(formatByou(45)).toBe("45秒");
  });

  it("60秒ちょうどは「1分」", () => {
    expect(formatByou(60)).toBe("1分");
  });

  it("60秒を超えると分秒表記になる", () => {
    expect(formatByou(100)).toBe("1分40秒");
  });

  it("小数は四捨五入してから分秒に変換する", () => {
    expect(formatByou(100.6)).toBe("1分41秒");
  });
});

describe("WATT_PRESETS", () => {
  it("対照表のW500/W600/W700から500・600・700を昇順で導出する", () => {
    expect(WATT_PRESETS).toEqual([500, 600, 700]);
  });
});
