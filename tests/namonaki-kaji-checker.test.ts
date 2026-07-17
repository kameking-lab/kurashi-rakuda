import { describe, expect, it } from "vitest";
import {
  CHORE_ITEMS,
  calcChoreSummary,
  type ChoreItem,
  type ChoreStatusMap,
} from "@/components/tools/impl/NamonakiKajiChecker.calc";

/*
 * 名もなき家事 分担チェッカー（P2-T25）のテスト。
 * テストケース表は specs/b-tools/p2-t25-namonaki-kaji-checker.md と対応する。
 */

describe("CHORE_ITEMS（項目リストの健全性）", () => {
  it("#11 総数30・カテゴリ内訳（kaji12/kosodate8/kaigo5/sonota5）", () => {
    expect(CHORE_ITEMS.length).toBe(30);
    const byCategory = CHORE_ITEMS.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(byCategory.kaji).toBe(12);
    expect(byCategory.kosodate).toBe(8);
    expect(byCategory.kaigo).toBe(5);
    expect(byCategory.sonota).toBe(5);
  });

  it("id はすべて一意である", () => {
    const ids = new Set(CHORE_ITEMS.map((i) => i.id));
    expect(ids.size).toBe(CHORE_ITEMS.length);
  });
});

describe("calcChoreSummary", () => {
  it("#1 回答が0件（初期表示）: 割合は全て0、selfPartnerBalanceはnull", () => {
    const r = calcChoreSummary({});
    expect(r.totalItems).toBe(30);
    expect(r.answeredItems).toBe(0);
    expect(r.unansweredItems).toBe(30);
    expect(r.counts).toEqual({ self: 0, partner: 0, both: 0, none: 0 });
    expect(r.percentages).toEqual({ self: 0, partner: 0, both: 0, none: 0 });
    expect(r.selfPartnerBalance).toBeNull();
  });

  it("#2 全30項目が self", () => {
    const statuses: ChoreStatusMap = {};
    for (const item of CHORE_ITEMS) statuses[item.id] = "self";
    const r = calcChoreSummary(statuses);
    expect(r.answeredItems).toBe(30);
    expect(r.counts.self).toBe(30);
    expect(r.counts.partner).toBe(0);
    expect(r.percentages.self).toBe(100);
    expect(r.selfPartnerBalance).toEqual({ selfShare: 100, partnerShare: 0 });
  });

  it("#3 全30項目が partner", () => {
    const statuses: ChoreStatusMap = {};
    for (const item of CHORE_ITEMS) statuses[item.id] = "partner";
    const r = calcChoreSummary(statuses);
    expect(r.counts.partner).toBe(30);
    expect(r.percentages.partner).toBe(100);
    expect(r.selfPartnerBalance).toEqual({ selfShare: 0, partnerShare: 100 });
  });

  it("#4 全30項目が both: selfPartnerBalanceは比較材料なしでnull", () => {
    const statuses: ChoreStatusMap = {};
    for (const item of CHORE_ITEMS) statuses[item.id] = "both";
    const r = calcChoreSummary(statuses);
    expect(r.counts.both).toBe(30);
    expect(r.counts.self).toBe(0);
    expect(r.counts.partner).toBe(0);
    expect(r.percentages.both).toBe(100);
    expect(r.selfPartnerBalance).toBeNull();
  });

  it("#5 全30項目が none: selfPartnerBalanceは比較材料なしでnull", () => {
    const statuses: ChoreStatusMap = {};
    for (const item of CHORE_ITEMS) statuses[item.id] = "none";
    const r = calcChoreSummary(statuses);
    expect(r.counts.none).toBe(30);
    expect(r.selfPartnerBalance).toBeNull();
  });

  it("#6 一部のみ回答（self5件・partner5件、残り20件未回答）: 割合は回答済み10件を分母にする", () => {
    const statuses: ChoreStatusMap = {};
    CHORE_ITEMS.slice(0, 5).forEach((item) => (statuses[item.id] = "self"));
    CHORE_ITEMS.slice(5, 10).forEach((item) => (statuses[item.id] = "partner"));
    const r = calcChoreSummary(statuses);
    expect(r.answeredItems).toBe(10);
    expect(r.unansweredItems).toBe(20);
    expect(r.percentages.self).toBe(50);
    expect(r.percentages.partner).toBe(50);
    expect(r.selfPartnerBalance).toEqual({ selfShare: 50, partnerShare: 50 });
  });

  it("#7 self1件・partner2件のみ回答: 四捨五入と補数計算（1/3=33.33→33、残り67）", () => {
    const statuses: ChoreStatusMap = {
      [CHORE_ITEMS[0].id]: "self",
      [CHORE_ITEMS[1].id]: "partner",
      [CHORE_ITEMS[2].id]: "partner",
    };
    const r = calcChoreSummary(statuses);
    expect(r.answeredItems).toBe(3);
    expect(r.selfPartnerBalance).toEqual({ selfShare: 33, partnerShare: 67 });
  });

  it("#8 空の項目リスト（items=[]）: 0除算せず全て0・nullを返す", () => {
    const r = calcChoreSummary({}, []);
    expect(r.totalItems).toBe(0);
    expect(r.answeredItems).toBe(0);
    expect(r.unansweredItems).toBe(0);
    expect(r.percentages).toEqual({ self: 0, partner: 0, both: 0, none: 0 });
    expect(r.selfPartnerBalance).toBeNull();
    expect(r.byCategory).toEqual([]);
  });

  it("#9 statusesに項目リストへ存在しないidのキーを含めても無視される", () => {
    const statuses: ChoreStatusMap = {
      [CHORE_ITEMS[0].id]: "self",
      "not-a-real-id": "partner",
    };
    const r = calcChoreSummary(statuses);
    expect(r.answeredItems).toBe(1);
    expect(r.counts.self).toBe(1);
    expect(r.counts.partner).toBe(0);
  });

  it("#10 カテゴリ別集計: kajiカテゴリのみ全件self、他カテゴリは未回答", () => {
    const statuses: ChoreStatusMap = {};
    CHORE_ITEMS.filter((i) => i.category === "kaji").forEach((item) => (statuses[item.id] = "self"));
    const r = calcChoreSummary(statuses);
    const kajiSummary = r.byCategory.find((c) => c.category === "kaji");
    const kosodateSummary = r.byCategory.find((c) => c.category === "kosodate");
    expect(kajiSummary?.totalItems).toBe(12);
    expect(kajiSummary?.answeredItems).toBe(12);
    expect(kajiSummary?.counts.self).toBe(12);
    expect(kosodateSummary?.answeredItems).toBe(0);
  });

  it("#12 一般的な混在ケース: both1件・none1件・self/partner半々で割合の合計が丸め誤差の範囲内", () => {
    const statuses: ChoreStatusMap = {};
    statuses[CHORE_ITEMS[0].id] = "both";
    statuses[CHORE_ITEMS[1].id] = "none";
    CHORE_ITEMS.slice(2, 6).forEach((item) => (statuses[item.id] = "self"));
    CHORE_ITEMS.slice(6, 10).forEach((item) => (statuses[item.id] = "partner"));
    const r = calcChoreSummary(statuses);
    expect(r.answeredItems).toBe(10);
    const total =
      r.percentages.self + r.percentages.partner + r.percentages.both + r.percentages.none;
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
    expect(r.selfPartnerBalance).toEqual({ selfShare: 50, partnerShare: 50 });
  });

  it("カスタム項目リストを渡した場合はそちらを基準に集計する（既定のCHORE_ITEMSを使わない）", () => {
    const customItems: ChoreItem[] = [
      { id: "custom-1", category: "sonota", label: "テスト項目1" },
      { id: "custom-2", category: "sonota", label: "テスト項目2" },
    ];
    const r = calcChoreSummary({ "custom-1": "self", "custom-2": "partner" }, customItems);
    expect(r.totalItems).toBe(2);
    expect(r.answeredItems).toBe(2);
    expect(r.counts.self).toBe(1);
    expect(r.counts.partner).toBe(1);
    expect(r.byCategory).toHaveLength(1);
    expect(r.byCategory[0].category).toBe("sonota");
    expect(r.byCategory[0].totalItems).toBe(2);
  });
});
