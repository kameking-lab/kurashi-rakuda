import { describe, expect, it } from "vitest";
import {
  calcSuihanMizu,
  validateSuihanMizuInput,
  LARGE_AMOUNT_GO_THRESHOLD,
  SMALL_AMOUNT_GO_THRESHOLD,
  VALUE_MAX,
  type HakumaiWater,
  type MusenmaiWater,
  type GenmaiWater,
  type MochigomeWater,
} from "@/components/tools/impl/SuihanMizu.calc";

/*
 * 仕様: specs/b-tools/39-rice-cooking-water-ratio.md「テストケース（13件）」を反映。
 * 加えて、入力モード（g/ml）の相互換算・上限超過エラー・大量炊飯/極小量の注意表示など
 * 仕様書の「エッジケース・注意事項」もあわせて検証する。
 */

describe("calcSuihanMizu — 仕様書テストケース表", () => {
  it("#1 合数=1、白米 → 米150g／180ml、水：重量ベース180ml・合数簡易法200ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 1, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(150);
    expect(r.riceMl).toBe(180);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(180);
    expect(w.simpleMethodMl).toBe(200);
  });

  it("#2 合数=2、白米 → 米300g／360ml、水：重量ベース360ml・合数簡易法400ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 2, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(300);
    expect(r.riceMl).toBe(360);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(360);
    expect(w.simpleMethodMl).toBe(400);
  });

  it("#3 合数=3、白米 → 米450g／540ml、水：重量ベース540ml・合数簡易法600ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 3, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(450);
    expect(r.riceMl).toBe(540);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(540);
    expect(w.simpleMethodMl).toBe(600);
  });

  it("#4 合数=0.5、白米 → 米75g／90ml、水：重量ベース90ml・合数簡易法100ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 0.5, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(75);
    expect(r.riceMl).toBe(90);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(90);
    expect(w.simpleMethodMl).toBe(100);
  });

  it("#5 米の重量(g)=300、白米（重量入力モード） → 合数=2、水：重量ベース360ml・合数簡易法400ml", () => {
    const r = calcSuihanMizu({ inputMode: "g", value: 300, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.go).toBe(2);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(360);
    expect(w.simpleMethodMl).toBe(400);
  });

  it("#6 計量カップ(ml)=180、白米（ml入力モード） → 合数=1、米150g、水：重量ベース180ml・合数簡易法200ml", () => {
    const r = calcSuihanMizu({ inputMode: "ml", value: 180, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.go).toBe(1);
    expect(r.riceG).toBe(150);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(180);
    expect(w.simpleMethodMl).toBe(200);
  });

  it("#7 合数=5、白米 → 米750g／900ml、水：重量ベース900ml・合数簡易法1000ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 5, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(750);
    expect(r.riceMl).toBe(900);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(900);
    expect(w.simpleMethodMl).toBe(1000);
  });

  it("#8 合数=10（1升）、白米 → 米1500g／1800ml、水：重量ベース1800ml・合数簡易法2000ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 10, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(1500);
    expect(r.riceMl).toBe(1800);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(1800);
    expect(w.simpleMethodMl).toBe(2000);
    // ちょうど10合(1升)は「超える」ではないため大量注意は出ない
    expect(r.largeAmountNotice).toBe(false);
  });

  it("#9 合数=1、無洗米 → 水215〜230ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 1, riceType: "無洗米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.water as MusenmaiWater;
    expect(w.minMl).toBe(215);
    expect(w.maxMl).toBe(230);
  });

  it("#10 合数=1、玄米 → 水270ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 1, riceType: "玄米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.water as GenmaiWater;
    expect(w.ml).toBe(270);
  });

  it("#11 合数=1、もち米 → 水180ml", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 1, riceType: "もち米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.water as MochigomeWater;
    expect(w.ml).toBe(180);
  });

  it("#12 合数=0（境界値） → エラー「0より大きい数値を入力してください」", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 0, riceType: "白米" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("0より大きい数値を入力してください");
  });

  it("#13 合数=15（上限超過に近い大量炊飯） → 計算結果に加え大量炊飯の注意表示", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 15, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.riceG).toBe(2250);
    expect(r.riceMl).toBe(2700);
    const w = r.water as HakumaiWater;
    expect(w.weightMethodMl).toBe(2700);
    expect(w.simpleMethodMl).toBe(3000);
    expect(r.largeAmountNotice).toBe(true);
  });
});

describe("calcSuihanMizu — 入力バリデーション・エッジケースの追加分", () => {
  it("負の値はエラー「0より大きい数値を入力してください」", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: -1, riceType: "白米" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("0より大きい数値を入力してください");
  });

  it("未入力（null）はエラー", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: null, riceType: "白米" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("0より大きい数値を入力してください");
  });

  it("非数値（NaN）はエラー", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: Number.NaN, riceType: "白米" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("0より大きい数値を入力してください");
  });

  it("合数の上限ちょうど（20合）はエラーにならない（境界値）", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: VALUE_MAX.go, riceType: "白米" });
    expect(r.ok).toBe(true);
  });

  it("合数が上限超過（20.1合）はエラーになり、分割炊飯の案内を含む", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 20.1, riceType: "白米" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("分けて炊くことをおすすめします");
  });

  it("g指定の上限ちょうど（3000g）はエラーにならない（境界値）", () => {
    const r = calcSuihanMizu({ inputMode: "g", value: VALUE_MAX.g, riceType: "白米" });
    expect(r.ok).toBe(true);
  });

  it("g指定が上限超過（3001g）はエラー", () => {
    const r = calcSuihanMizu({ inputMode: "g", value: 3001, riceType: "白米" });
    expect(r.ok).toBe(false);
  });

  it("ml指定の上限ちょうど（3600ml）はエラーにならない（境界値）", () => {
    const r = calcSuihanMizu({ inputMode: "ml", value: VALUE_MAX.ml, riceType: "白米" });
    expect(r.ok).toBe(true);
  });

  it("ml指定が上限超過（3601ml）はエラー", () => {
    const r = calcSuihanMizu({ inputMode: "ml", value: 3601, riceType: "白米" });
    expect(r.ok).toBe(false);
  });

  it("極小量（0.1合）は極小量の注意表示が出る", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 0.1, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.smallAmountNotice).toBe(true);
  });

  it("極小量のしきい値ちょうど（0.3合）は極小量の注意表示が出る（境界値）", () => {
    const r = calcSuihanMizu({
      inputMode: "go",
      value: SMALL_AMOUNT_GO_THRESHOLD,
      riceType: "白米",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.smallAmountNotice).toBe(true);
  });

  it("通常量（1合）は極小量・大量のどちらの注意表示も出ない", () => {
    const r = calcSuihanMizu({ inputMode: "go", value: 1, riceType: "白米" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.smallAmountNotice).toBe(false);
    expect(r.largeAmountNotice).toBe(false);
  });

  it("大量炊飯のしきい値超え（10.5合）は大量注意が出る（境界値の直後）", () => {
    const r = calcSuihanMizu({
      inputMode: "go",
      value: LARGE_AMOUNT_GO_THRESHOLD + 0.5,
      riceType: "白米",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.largeAmountNotice).toBe(true);
  });
});

describe("validateSuihanMizuInput", () => {
  it("正常な入力ではnullを返す", () => {
    expect(
      validateSuihanMizuInput({ inputMode: "go", value: 2, riceType: "白米" }),
    ).toBeNull();
  });

  it("0以下はエラーメッセージを返す", () => {
    expect(
      validateSuihanMizuInput({ inputMode: "go", value: 0, riceType: "白米" }),
    ).toBe("0より大きい数値を入力してください");
  });
});
