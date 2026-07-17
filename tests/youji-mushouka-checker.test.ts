import { describe, expect, it } from "vitest";
import {
  calculateYoujiMushouka,
  classifyAgeGroup,
} from "@/components/tools/impl/YoujiMushoukaChecker.calc";

/*
 * 幼児教育・保育無償化 対象チェッカー（P2-T19）のテスト。
 * 制度データは data/seido/youji-kyouiku-mushouka.json を正とする。
 * 3〜5歳児クラス: 全世帯対象。0〜2歳児クラス: 住民税非課税世帯のみ対象。
 * 認可外保育施設等の月額上限: 3〜5歳児クラス37,000円／0〜2歳児クラス（非課税）42,000円。
 * テストケース表は specs/b-tools/p2-t19-youji-mushouka-checker.md と対応する。
 */

describe("calculateYoujiMushouka", () => {
  it("#1 3〜5歳児クラス・認可保育所は対象、上限なし", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("target");
    expect(r.result.monthlyCap).toBeNull();
  });

  it("#2 0〜2歳児クラス・非課税世帯・認可保育所は対象", () => {
    const r = calculateYoujiMushouka({
      classAge: 1,
      facilityType: "ninkaHoikusho",
      nonTaxableHousehold: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("target");
    expect(r.result.monthlyCap).toBeNull();
  });

  it("#3 0〜2歳児クラス・課税世帯・認可保育所は原則対象外", () => {
    const r = calculateYoujiMushouka({
      classAge: 1,
      facilityType: "ninkaHoikusho",
      nonTaxableHousehold: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("notTarget");
    expect(r.result.notes.join("")).toMatch(/自治体独自/);
  });

  it("#4 3〜5歳児クラス・認可外は条件付き対象、上限37,000円", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "ninkagai" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("conditional");
    expect(r.result.monthlyCap).toBe(37000);
  });

  it("#5 0〜2歳児クラス・非課税世帯・認可外は条件付き対象、上限42,000円", () => {
    const r = calculateYoujiMushouka({
      classAge: 0,
      facilityType: "ninkagai",
      nonTaxableHousehold: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("conditional");
    expect(r.result.monthlyCap).toBe(42000);
  });

  it("#6 0〜2歳児クラス・課税世帯・認可外も対象外", () => {
    const r = calculateYoujiMushouka({
      classAge: 0,
      facilityType: "ninkagai",
      nonTaxableHousehold: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("notTarget");
    expect(r.result.monthlyCap).toBeNull();
  });

  it("#7 0〜2歳児クラス・幼稚園（新制度）は年齢要件で対象外（非課税世帯でも変わらず）", () => {
    const r = calculateYoujiMushouka({
      classAge: 1,
      facilityType: "youchienShinseido",
      nonTaxableHousehold: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("notTarget");
    expect(r.result.notes.join("")).toMatch(/満3歳以上/);
  });

  it("#8 3〜5歳児クラス・幼稚園（未移行）は条件付き対象、上限データなし", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "youchienMikoukou" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("conditional");
    expect(r.result.monthlyCap).toBeNull();
    expect(r.result.notes.join("")).toMatch(/収録されていません/);
  });

  it("#9 3〜5歳児クラス・企業主導型保育等は条件付き対象、上限データなし", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "kigyoushudou" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("conditional");
    expect(r.result.monthlyCap).toBeNull();
  });

  it("#10 境界値: classAge=2は必ずnonTaxable区分", () => {
    expect(classifyAgeGroup(2)).toBe("nonTaxable");
    const r = calculateYoujiMushouka({
      classAge: 2,
      facilityType: "ninkaHoikusho",
      nonTaxableHousehold: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.ageGroup).toBe("nonTaxable");
    expect(r.result.status).toBe("target");
  });

  it("#11 境界値: classAge=3は必ずfreeForAll区分（住民税課税状況不要）", () => {
    expect(classifyAgeGroup(3)).toBe("freeForAll");
    const r = calculateYoujiMushouka({ classAge: 3, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.ageGroup).toBe("freeForAll");
    expect(r.result.status).toBe("target");
  });

  it("#12 対応年齢の範囲外（6歳）は入力エラー", () => {
    const r = calculateYoujiMushouka({ classAge: 6, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/範囲外/);
  });

  it("#13 対応年齢の範囲外（負の値）は入力エラー", () => {
    const r = calculateYoujiMushouka({ classAge: -1, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/範囲外/);
  });

  it("#14 0〜2歳児クラスで住民税課税状況が未入力は入力エラー", () => {
    const r = calculateYoujiMushouka({ classAge: 1, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/住民税課税状況/);
  });

  it("#15 3〜5歳児クラス・幼稚園（新制度）は対象、上限なし", () => {
    const r = calculateYoujiMushouka({ classAge: 5, facilityType: "youchienShinseido" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("target");
    expect(r.result.monthlyCap).toBeNull();
  });

  it("開示文言(disclaimer)が結果に含まれる", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.disclaimer.length).toBeGreaterThan(20);
    expect(r.result.disclaimer).toMatch(/市区町村/);
  });

  it("必要な手続き: 施設等利用給付認定が必要な施設種別では認定申請の案内が出る", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "ninkagai" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.requiresNintei).toBe(true);
    expect(r.result.procedures.join("")).toMatch(/施設等利用給付認定/);
  });

  it("必要な手続き: 認可保育所では追加手続き不要の案内が出る", () => {
    const r = calculateYoujiMushouka({ classAge: 4, facilityType: "ninkaHoikusho" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.requiresNintei).toBe(false);
    expect(r.result.procedures.join("")).toMatch(/追加の手続きは不要/);
  });
});
