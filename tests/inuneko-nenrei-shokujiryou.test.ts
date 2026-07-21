import { describe, expect, it } from "vitest";
import {
  calcNenreiKansan,
  calcShokujiryou,
  fmtNumber,
  RER_VALID_MIN_KG,
  RER_VALID_MAX_KG,
  DER_COEFFICIENT_DOG,
  DER_COEFFICIENT_CAT,
  NENREI_SOURCE,
  SHOKUJIRYOU_SOURCE,
} from "@/components/tools/impl/InunekoNenreiShokujiryou.calc";

/*
 * 犬猫の年齢換算＋食事量目安（P4-T05・P4-T06）のテスト。
 * 出典は環境省「飼い主のためのペットフード・ガイドライン」平成30年8月改訂版
 * （data/tables/inuneko-nenrei-shokujiryou.json を正とする）。
 * 年齢換算の期待値は同ガイドライン9ページの表を、食事量の期待値は13ページの計算例をそのまま使う。
 */

describe("calcNenreiKansan（年齢換算）", () => {
  it("#1 小〜中型犬・猫 1歳 → 15歳（特例。表と一致）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(15);
  });

  it("#2 小〜中型犬・猫 2歳 → 24歳（表と一致）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(24);
  });

  it("#3 小〜中型犬・猫 3歳 → 28歳（表と一致）", () => {
    const r = calcNenreiKansan("cat", "shouChuugata", 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(28);
  });

  it("#4 小〜中型犬・猫 5歳 → 36歳（表と一致）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(36);
  });

  it("#5 小〜中型犬・猫 7歳 → 44歳（表と一致）", () => {
    const r = calcNenreiKansan("cat", "shouChuugata", 7);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(44);
  });

  it("#6 小〜中型犬・猫 10歳 → 56歳（表と一致）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(56);
  });

  it("#7 小〜中型犬・猫 12歳 → 64歳（表と一致）", () => {
    const r = calcNenreiKansan("cat", "shouChuugata", 12);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(64);
  });

  it("#8 小〜中型犬・猫 15歳 → 76歳（表と一致）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 15);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(76);
  });

  it("#9 小〜中型犬・猫 20歳 → 96歳（表の最大掲載年齢と一致、表の範囲内）", () => {
    const r = calcNenreiKansan("cat", "shouChuugata", 20);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(96);
    expect(r.isBeyondTableRange).toBe(false);
  });

  it("#10 大型犬 1歳 → 12歳（表と一致。特例なしで式がそのまま成立）", () => {
    const r = calcNenreiKansan("dog", "ougata", 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(12);
  });

  it("#11 大型犬 5歳 → 40歳（表と一致）", () => {
    const r = calcNenreiKansan("dog", "ougata", 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(40);
  });

  it("#12 大型犬 15歳 → 110歳（表の最大掲載年齢と一致）", () => {
    const r = calcNenreiKansan("dog", "ougata", 15);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.humanAgeYears).toBe(110);
    expect(r.isBeyondTableRange).toBe(false);
  });

  it("#13 大型犬 20歳 → 表の最大掲載年齢(15歳)を超えるため isBeyondTableRange が true", () => {
    const r = calcNenreiKansan("dog", "ougata", 20);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isBeyondTableRange).toBe(true);
    // 式を延長: 12+(20-1)*7 = 145
    expect(r.humanAgeYears).toBe(145);
  });

  it("#14 猫に大型区分を指定するとエラー（原典に猫の大型区分は存在しない）", () => {
    const r = calcNenreiKansan("cat", "ougata", 3);
    expect(r.ok).toBe(false);
  });

  it("#15 0歳（生後1年未満）はエラー（原典に0〜1歳の換算根拠なし）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 0.5);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("1歳未満");
  });

  it("#16 0歳ちょうどはエラー", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 0);
    expect(r.ok).toBe(false);
  });

  it("#17 負の年齢はエラー", () => {
    const r = calcNenreiKansan("cat", "shouChuugata", -2);
    expect(r.ok).toBe(false);
  });

  it("#18 NaN（空欄由来）はエラーで無言失敗にならない", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", NaN);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBeTruthy();
  });

  it("#19 極端に大きい年齢（31歳）はエラー", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 31);
    expect(r.ok).toBe(false);
  });

  it("#20 30歳ちょうどは許可される（境界値）", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 30);
    expect(r.ok).toBe(true);
  });

  it("#21 小数の年齢（2.5歳）でも式どおりに計算できる", () => {
    const r = calcNenreiKansan("dog", "shouChuugata", 2.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 24+(2.5-2)*4 = 26
    expect(r.humanAgeYears).toBe(26);
  });
});

describe("calcShokujiryou（食事量目安）", () => {
  it("#22 体重5kgの犬（避妊去勢済み）: RER=220kcal, DER=352kcal（原典の計算例と一致）", () => {
    const r = calcShokujiryou("dog", 5, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rerKcal).toBe(220);
    expect(r.coefficient).toBe(DER_COEFFICIENT_DOG);
    expect(r.derKcal).toBe(352);
    expect(r.feedAmountG).toBeNull();
  });

  it("#23 体重5kgの猫（避妊去勢済み）: RER=220kcal, DER=264kcal（原典の計算例と一致）", () => {
    const r = calcShokujiryou("cat", 5, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rerKcal).toBe(220);
    expect(r.coefficient).toBe(DER_COEFFICIENT_CAT);
    expect(r.derKcal).toBe(264);
  });

  it("#24 MEを入力すると食事量(g)まで計算する: DER352kcal ÷ 350kcal/100g × 100 = 100g", () => {
    const r = calcShokujiryou("dog", 5, 350);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.feedAmountG).toBeCloseTo(100.6, 1); // 352/350*100 ≈ 100.57...
  });

  it("#25 体重の下限2kgちょうどは計算できる（境界値）", () => {
    const r = calcShokujiryou("cat", 2, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rerKcal).toBe(130); // 2*30+70
  });

  it("#26 体重の上限45kgちょうどは計算できる（境界値）", () => {
    const r = calcShokujiryou("dog", 45, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rerKcal).toBe(1420); // 45*30+70
  });

  it("#27 体重2kg未満はエラー（出典の有効範囲外）", () => {
    const r = calcShokujiryou("cat", 1.9, null);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain(`${RER_VALID_MIN_KG}`);
  });

  it("#28 体重45kg超はエラー（出典の有効範囲外）", () => {
    const r = calcShokujiryou("dog", 45.1, null);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain(`${RER_VALID_MAX_KG}`);
  });

  it("#29 体重がNaNはエラー", () => {
    const r = calcShokujiryou("dog", NaN, null);
    expect(r.ok).toBe(false);
  });

  it("#30 体重が負数はエラー", () => {
    const r = calcShokujiryou("dog", -5, null);
    expect(r.ok).toBe(false);
  });

  it("#31 MEが0はエラー", () => {
    const r = calcShokujiryou("dog", 5, 0);
    expect(r.ok).toBe(false);
  });

  it("#32 MEが負数はエラー", () => {
    const r = calcShokujiryou("dog", 5, -100);
    expect(r.ok).toBe(false);
  });

  it("#33 MEがNaNはエラー", () => {
    const r = calcShokujiryou("dog", 5, NaN);
    expect(r.ok).toBe(false);
  });

  it("#34 犬と猫で係数が異なるため同じ体重でもDERが変わる", () => {
    const dog = calcShokujiryou("dog", 10, null);
    const cat = calcShokujiryou("cat", 10, null);
    expect(dog.ok && cat.ok).toBe(true);
    if (!dog.ok || !cat.ok) return;
    expect(dog.derKcal).not.toBe(cat.derKcal);
    expect(dog.derKcal).toBeGreaterThan(cat.derKcal);
  });
});

describe("fmtNumber", () => {
  it("#35 小数第1位までのカンマ区切り表示", () => {
    expect(fmtNumber(1234.5)).toBe("1,234.5");
  });

  it("#36 整数はそのまま表示する", () => {
    expect(fmtNumber(96)).toBe("96");
  });
});

describe("出典メタ情報", () => {
  it("#37 NENREI_SOURCE・SHOKUJIRYOU_SOURCEに環境省の出典URLが含まれる", () => {
    expect(NENREI_SOURCE.org).toContain("環境省");
    expect(NENREI_SOURCE.sourceUrl).toMatch(/^https:\/\/www\.env\.go\.jp\//);
    expect(SHOKUJIRYOU_SOURCE.org).toContain("環境省");
    expect(SHOKUJIRYOU_SOURCE.sourceUrl).toMatch(/^https:\/\/www\.env\.go\.jp\//);
  });
});
