import { describe, expect, it } from "vitest";
import { calcBudgetAllocation, fmtYen, fmtPercent } from "@/components/tools/impl/YosanHaibunKeisan.calc";

/*
 * 手取りからの予算配分計算（費目テンプレ）（P2-T29）のテスト。
 * データは data/tables/yosan-haibun-hiritsu.json を正とする（総務省統計局「家計調査（家計収支編）」
 * 2025年（令和7年）平均）。テストケース表は specs/b-tools/p2-t29-yosan-haibun-keisan.md と対応する。
 * 期待値は「費目の実額 ÷ 消費支出合計 × 手取り月収」を四捨五入した値で、
 * データファイルの数値から独立に手計算・スクリプト算出したもの。
 */

describe("calcBudgetAllocation", () => {
  it("#1 setaininzuu=1・手取り300,000円は単身世帯の構成比で按分する", () => {
    const r = calcBudgetAllocation(1, 300000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.label).toBe("単身世帯（1人）");
    expect(r.bucket.shouhiShishutsuTotal).toBe(173042);
    const shokuryou = r.bucket.categories.find((c) => c.key === "shokuryou");
    expect(shokuryou?.amount).toBe(77425);
    const kyouiku = r.bucket.categories.find((c) => c.key === "kyouiku");
    expect(kyouiku?.amount).toBe(59);
    expect(r.isOverBucketed).toBe(false);
  });

  it("#2 setaininzuu=2・手取り250,000円は2人世帯の構成比で按分する", () => {
    const r = calcBudgetAllocation(2, 250000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const juukyo = r.bucket.categories.find((c) => c.key === "juukyo");
    expect(juukyo?.amount).toBe(18450);
    const sonota = r.bucket.categories.find((c) => c.key === "sonota_shouhi_shishutsu");
    expect(sonota?.amount).toBe(48751);
  });

  it("#3 setaininzuu=4・手取り500,000円は4人世帯の構成比で按分する", () => {
    const r = calcBudgetAllocation(4, 500000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kyouiku = r.bucket.categories.find((c) => c.key === "kyouiku");
    expect(kyouiku?.amount).toBe(45737);
    const koutsuu = r.bucket.categories.find((c) => c.key === "koutsuu_tsuushin");
    expect(koutsuu?.amount).toBe(73312);
  });

  it("#4 setaininzuu=6は6人以上世帯（境界値）の構成比で按分する", () => {
    const r = calcBudgetAllocation(6, 600000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.label).toBe("6人以上世帯");
    expect(r.bucket.setaiNinzuu).toBe(6.3);
    expect(r.isOverBucketed).toBe(true);
  });

  it("#5 setaininzuu=8は6人を超えても『6人以上』区分と同じ構成比（按分しない）", () => {
    const r = calcBudgetAllocation(8, 600000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const shokuryou = r.bucket.categories.find((c) => c.key === "shokuryou");
    expect(shokuryou?.amount).toBe(190822);
    expect(r.isOverBucketed).toBe(true);
  });

  it("#6 setaininzuu=0は入力エラー", () => {
    const r = calcBudgetAllocation(0, 300000);
    expect(r.ok).toBe(false);
  });

  it("#7 setaininzuu=-3は入力エラー", () => {
    const r = calcBudgetAllocation(-3, 300000);
    expect(r.ok).toBe(false);
  });

  it("#8 setaininzuu=1.5のような非整数は入力エラー", () => {
    const r = calcBudgetAllocation(1.5, 300000);
    expect(r.ok).toBe(false);
  });

  it("#9 setaininzuu=NaNは入力エラー", () => {
    const r = calcBudgetAllocation(NaN, 300000);
    expect(r.ok).toBe(false);
  });

  it("#10 手取り月収=0は入力エラー", () => {
    const r = calcBudgetAllocation(2, 0);
    expect(r.ok).toBe(false);
  });

  it("#11 手取り月収が負数は入力エラー", () => {
    const r = calcBudgetAllocation(2, -100000);
    expect(r.ok).toBe(false);
  });

  it("#12 手取り月収がNaNは入力エラー", () => {
    const r = calcBudgetAllocation(2, NaN);
    expect(r.ok).toBe(false);
  });

  it("#13 費目は家計調査の10大費目すべて（10件）を返す", () => {
    const r = calcBudgetAllocation(3, 400000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bucket.categories).toHaveLength(10);
    const keys = r.bucket.categories.map((c) => c.key);
    expect(keys).toEqual([
      "shokuryou",
      "juukyo",
      "kounetsu_suidou",
      "kagu_kaji_youhin",
      "hifuku_hakimono",
      "hoken_iryou",
      "koutsuu_tsuushin",
      "kyouiku",
      "kyouyou_goraku",
      "sonota_shouhi_shishutsu",
    ]);
  });

  it("#14 費目の構成比の合計はほぼ1（100%）になる（統計上の丸め誤差1%未満）", () => {
    const r = calcBudgetAllocation(5, 350000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ratioSum = r.bucket.categories.reduce((acc, c) => acc + c.ratio, 0);
    expect(ratioSum).toBeGreaterThan(0.99);
    expect(ratioSum).toBeLessThan(1.01);
  });

  it("#15 手取り月収が高いほど各費目の金額も比例して大きくなる", () => {
    const low = calcBudgetAllocation(2, 200000);
    const high = calcBudgetAllocation(2, 400000);
    expect(low.ok).toBe(true);
    expect(high.ok).toBe(true);
    if (!low.ok || !high.ok) return;
    const lowShokuryou = low.bucket.categories.find((c) => c.key === "shokuryou")?.amount ?? 0;
    const highShokuryou = high.bucket.categories.find((c) => c.key === "shokuryou")?.amount ?? 0;
    // 手取りがちょうど2倍なら金額もほぼ2倍（丸め誤差1円程度は許容）
    expect(Math.abs(highShokuryou - lowShokuryou * 2)).toBeLessThanOrEqual(1);
  });

  it("#16 入力人数・手取り額はそのまま結果に保持される", () => {
    const r = calcBudgetAllocation(4, 480000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inputNinzuu).toBe(4);
    expect(r.inputTedori).toBe(480000);
  });
});

describe("fmtYen", () => {
  it("3桁区切りでカンマを入れる", () => {
    expect(fmtYen(123241)).toBe("123,241");
  });

  it("整数丸めする", () => {
    expect(fmtYen(1000.4)).toBe("1,000");
  });
});

describe("fmtPercent", () => {
  it("小数第1位までのパーセント表記にする", () => {
    expect(fmtPercent(0.2581)).toBe("25.8");
  });

  it("0は0.0になる", () => {
    expect(fmtPercent(0)).toBe("0.0");
  });
});
