import { describe, expect, it } from "vitest";
import {
  searchReitoHozon,
  formatPeriod,
  normalizeFoodQuery,
  getFoodById,
  getAllFoods,
} from "@/components/tools/impl/ReitoHozon.calc";

/*
 * 冷凍保存期間検索（Q3-13）のテスト。
 * specs/b-tools/37-frozen-storage-period-search.md「テストケース（12件）」を反映している。
 * 表示文字列は仕様書の疑似コード（formatPeriod）をもとに、
 * 「あくまで目安」であることを一貫して伝えるため常に「約」を付ける自実装（本ファイル内の
 * formatPeriod 実装）に合わせて期待値を調整している（例: 「2週間」ではなく「約2週間」）。
 */

describe("searchReitoHozon — 仕様書テストケース表（12件）", () => {
  it("#1 food_id=hourensou → ほうれん草／下処理後（下茹で）／約1ヶ月＋下茹でのコツ＋凍ったまま調理", () => {
    const r = searchReitoHozon({ foodId: "hourensou" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.name).toBe("ほうれん草");
    expect(r.item.state).toBe("下処理後（下茹で）");
    expect(r.item.periodText).toBe("約1ヶ月");
    expect(r.item.prepTips).toContain("下茹で");
    expect(r.item.thawTips).toContain("凍ったまま");
  });

  it("#2 food_id=toriniku_nama_mune_momo → 生の鶏肉（むね・もも）／生／約1ヶ月＋冷蔵庫解凍のコツ", () => {
    const r = searchReitoHozon({ foodId: "toriniku_nama_mune_momo" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.name).toBe("生の鶏肉（むね・もも）");
    expect(r.item.state).toBe("生");
    expect(r.item.periodText).toBe("約1ヶ月");
    expect(r.item.thawTips).toContain("冷蔵庫");
  });

  it("#3 food_id=gohan → ご飯（炊いた白米）／加熱後／約1ヶ月＋電子レンジで凍ったまま加熱", () => {
    const r = searchReitoHozon({ foodId: "gohan" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.name).toBe("ご飯（炊いた白米）");
    expect(r.item.state).toBe("加熱後");
    expect(r.item.periodText).toBe("約1ヶ月");
    expect(r.item.thawTips).toContain("電子レンジ");
    expect(r.item.thawTips).toContain("凍ったまま");
  });

  it("#4 food_id=hikiniku → ひき肉／生／約2週間＋傷みやすいため薄く平らにして冷凍の注意", () => {
    const r = searchReitoHozon({ foodId: "hikiniku" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.state).toBe("生");
    expect(r.item.periodText).toBe("約2週間");
    expect(r.item.prepTips).toContain("傷みやすい");
    expect(r.item.prepTips).toContain("薄く平らに");
  });

  it("#5 query=ほうれんそう（表記ゆれ・平仮名） → id=hourensou の詳細に1件で一致", () => {
    const r = searchReitoHozon({ query: "ほうれんそう" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.id).toBe("hourensou");
  });

  it("#6 query=にく（複数ヒット） → 鶏肉・豚肉・牛肉・ひき肉を含む候補一覧（詳細1件には遷移しない）", () => {
    const r = searchReitoHozon({ query: "にく" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    const ids = r.items.map((i) => i.id).sort();
    expect(ids).toEqual(
      ["butaniku_nama", "gyuniku_nama", "hikiniku", "toriniku_nama_mune_momo"].sort(),
    );
  });

  it("#7 category=果物 → バナナ・みかん・アボカドの3件を含む一覧表示", () => {
    const r = searchReitoHozon({ category: "果物" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    expect(r.items).toHaveLength(3);
    const ids = r.items.map((i) => i.id).sort();
    expect(ids).toEqual(["avocado", "banana", "mikan"].sort());
  });

  it("#8 food_id=butter → バター／生／約2〜3ヶ月（乳製品の中でも長期保存可能な例）", () => {
    const r = searchReitoHozon({ foodId: "butter" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.state).toBe("生");
    expect(r.item.periodText).toBe("約2〜3ヶ月");
  });

  it("#9 food_id=curry → カレー・シチュー／加熱後／約2週間〜1ヶ月＋じゃがいもは取り除くの注意事項", () => {
    const r = searchReitoHozon({ foodId: "curry" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.state).toBe("加熱後");
    expect(r.item.periodText).toBe("約2週間〜1ヶ月");
    expect(r.item.caution).toContain("じゃがいも");
  });

  it("#10 food_id=sonzai-shinai-shokuzai（未登録食材ID） → notFound", () => {
    const r = searchReitoHozon({ foodId: "sonzai-shinai-shokuzai" });
    expect(r.kind).toBe("notFound");
  });

  it("#11 query=（空文字・未入力） → 全26件を一覧表示（絞り込みなし）", () => {
    const r = searchReitoHozon({ query: "" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    expect(r.items).toHaveLength(26);
  });

  it("#12 food_id=tamago_tokihogushi → 卵（割りほぐし）／生（割りほぐし後）／約1ヶ月＋殻のままは不可の注意事項", () => {
    const r = searchReitoHozon({ foodId: "tamago_tokihogushi" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.name).toBe("卵（割りほぐし）");
    expect(r.item.state).toBe("生（割りほぐし後）");
    expect(r.item.periodText).toBe("約1ヶ月");
    expect(r.item.caution).toContain("殻");
    expect(r.item.caution).toContain("不可");
  });
});

describe("formatPeriod — 週数→表示文字列の丸めルール", () => {
  it("4週 = 「約1ヶ月」", () => {
    expect(formatPeriod(4, 4)).toBe("約1ヶ月");
  });
  it("2週 = 「約2週間」", () => {
    expect(formatPeriod(2, 2)).toBe("約2週間");
  });
  it("1週 = 「約1週間」", () => {
    expect(formatPeriod(1, 1)).toBe("約1週間");
  });
  it("8週 = 「約2ヶ月」", () => {
    expect(formatPeriod(8, 8)).toBe("約2ヶ月");
  });
  it("範囲・同一単位（週）: 2〜3週 = 「約2〜3週間」", () => {
    expect(formatPeriod(2, 3)).toBe("約2〜3週間");
  });
  it("範囲・単位をまたぐ: 2週〜4週(1ヶ月) = 「約2週間〜1ヶ月」", () => {
    expect(formatPeriod(2, 4)).toBe("約2週間〜1ヶ月");
  });
});

describe("normalizeFoodQuery — 表記ゆれの吸収", () => {
  it("カタカナはひらがなに変換される", () => {
    expect(normalizeFoodQuery("ホウレンソウ")).toBe(normalizeFoodQuery("ほうれんそう"));
  });
  it("前後の空白はトリムされる", () => {
    expect(normalizeFoodQuery("  にんじん  ")).toBe(normalizeFoodQuery("にんじん"));
  });
  it("全角スペースを含む語も内部の空白を除去して比較できる", () => {
    expect(normalizeFoodQuery("に　く")).toBe(normalizeFoodQuery("にく"));
  });
});

describe("searchReitoHozon — 補助的な境界値・複合条件", () => {
  it("food_id が query・category より優先される", () => {
    const r = searchReitoHozon({ foodId: "hourensou", query: "にく", category: "肉" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.id).toBe("hourensou");
  });

  it("category と query を組み合わせて絞り込める（野菜×なす）", () => {
    const r = searchReitoHozon({ category: "野菜", query: "なす" });
    expect(r.kind).toBe("single");
    if (r.kind !== "single") return;
    expect(r.item.id).toBe("nasu");
  });

  it("該当なしの組み合わせ（category=果物×query=にく）は notFound", () => {
    const r = searchReitoHozon({ category: "果物", query: "にく" });
    expect(r.kind).toBe("notFound");
  });

  it("存在しないカテゴリで絞り込むと notFound", () => {
    const r = searchReitoHozon({ category: "存在しないカテゴリ" });
    expect(r.kind).toBe("notFound");
  });

  it("getFoodById は存在しないIDに null を返す", () => {
    expect(getFoodById("sonzai-shinai-shokuzai")).toBeNull();
  });

  it("getAllFoods は26件を返し、periodText が全件付与されている", () => {
    const all = getAllFoods();
    expect(all).toHaveLength(26);
    expect(all.every((f) => typeof f.periodText === "string" && f.periodText.length > 0)).toBe(true);
  });
});
