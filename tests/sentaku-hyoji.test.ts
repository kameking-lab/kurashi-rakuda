import { describe, expect, it } from "vitest";
import {
  findSymbolById,
  getAllSymbols,
  normalize,
  searchSentakuHyoji,
  SENTAKU_DELICATE_CAUTION_NOTE,
  SENTAKU_NOT_FOUND_NOTE,
  SENTAKU_OLD_JIS_NOTE,
} from "@/components/tools/impl/SentakuHyoji.calc";

/**
 * 仕様書 specs/b-tools/41-laundry-care-label-search.md の「テストケース（14件）」を反映。
 * データ表は5カテゴリの代表31記号（洗濯7・漂白3・乾燥9・アイロン4・クリーニング8）を収録しているため、
 * #6・#7・#13 は仕様書の件数記載（サンプルの23件相当）ではなく実データの件数に合わせて検証する。
 */

describe("SentakuHyoji.calc — 仕様書テストケース表（14件）", () => {
  it("#1 symbol_id=sen_40_tsujou → 洗濯桶に『40』／液温40℃を限度に通常の強さの洗濯ができる、の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_40_tsujou" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("40");
    expect(r.item.meaning).toBe("液温40℃を限度に、洗濯機で通常の強さの洗濯処理ができる");
  });

  it("#2 symbol_id=sen_30_hijou_yowai → 洗濯桶に『30』・下線2本／液温30℃限度・非常に弱い洗濯処理、の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_30_hijou_yowai" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("線2本");
    expect(r.item.meaning).toContain("液温30℃を限度に、洗濯機で非常に弱い洗濯処理ができる");
  });

  it("#3 symbol_id=sen_fuka → 洗濯桶に×／家庭での洗濯不可、＋クリーニング店相談を促す案内", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_fuka" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.meaning).toBe("家庭での洗濯（水洗い）はできない");
    expect(r.item.handlingTip).toContain("クリーニング店");
  });

  it("#4 query=手洗い → id=sen_tearai がヒットし、液温40℃限度・手洗い可の詳細表示", () => {
    const r = searchSentakuHyoji({ query: "手洗い" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.id).toBe("sen_tearai");
    expect(r.item.meaning).toContain("手洗い");
    expect(r.item.delicateCaution).toBe(true);
  });

  it("#5 query=アイロン不可 → id=iron_fuka がヒットし、アイロン仕上げ処理不可の詳細表示", () => {
    const r = searchSentakuHyoji({ query: "アイロン不可" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.id).toBe("iron_fuka");
    expect(r.item.meaning).toBe("アイロン仕上げ処理はできない");
  });

  it("#6 query=ドライクリーニング（複数ヒット） → dry_p・dry_p_yowai・dry_f・dry_fuka を含む候補一覧を表示", () => {
    const r = searchSentakuHyoji({ query: "ドライクリーニング" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    const ids = r.items.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining(["dry_p", "dry_p_yowai", "dry_f", "dry_fuka"]),
    );
    // ウェットクリーニング（wet_*）はキーワードに「ドライクリーニング」を含まないため対象外
    expect(ids).not.toContain("wet_kanou");
  });

  it("#7 category=漂白 → hyou_kanou・hyou_sanso_nomi・hyou_fuka の3件の一覧表示", () => {
    const r = searchSentakuHyoji({ category: "漂白" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    expect(r.items.map((i) => i.id).sort()).toEqual(
      ["hyou_fuka", "hyou_kanou", "hyou_sanso_nomi"].sort(),
    );
  });

  it("#8 symbol_id=hyou_sanso_nomi → 三角に斜線2本／酸素系漂白剤のみ使用可・塩素系不可、の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "hyou_sanso_nomi" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("斜線2本");
    expect(r.item.meaning).toContain("酸素系漂白剤による漂白はできるが、塩素系漂白剤による漂白はできない");
  });

  it("#9 symbol_id=kansou_tumble_kou → タンブル乾燥可（高温・排気温度上限80℃）の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "kansou_tumble_kou" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.meaning).toBe("タンブル乾燥ができる（排気温度上限80℃・高温）");
  });

  it("#10 symbol_id=kansou_tsuri_kage → 四角に縦線1本＋斜め線／日陰のつり干しがよい、の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "kansou_tsuri_kage" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("斜め線");
    expect(r.item.meaning).toBe("日陰のつり干しがよい");
  });

  it("#11 symbol_id=wet_hijou_yowai → 丸にW・下線2本／非常に弱い操作でウェットクリーニング可、＋デリケート素材の注記", () => {
    const r = searchSentakuHyoji({ symbolId: "wet_hijou_yowai" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.meaning).toBe("ウェットクリーニングができる（非常に弱い操作）");
    expect(r.item.delicateCaution).toBe(true);
    expect(SENTAKU_DELICATE_CAUTION_NOTE).toMatch(/クリーニング店/);
  });

  it("#12 query=140度（存在しない温度） → 0件（not_found）。まだ登録がありません、を表示", () => {
    const r = searchSentakuHyoji({ query: "140度" });
    expect(r.kind).toBe("not_found");
    if (r.kind !== "not_found") return;
    expect(r.note).toBe(SENTAKU_NOT_FOUND_NOTE);
  });

  it("#13 query=''（空文字・未入力） → 絞り込みなしで全件（データ表の全記号）を一覧表示", () => {
    const r = searchSentakuHyoji({ query: "" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    expect(r.items.length).toBe(getAllSymbols().length);
    expect(r.items.length).toBeGreaterThanOrEqual(23);
  });

  it("#14 symbol_id=iron_kou → アイロンに点3つ／底面温度200℃限度・高温アイロン可、＋旧JIS注記の固定表示", () => {
    const r = searchSentakuHyoji({ symbolId: "iron_kou" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("点3つ");
    expect(r.item.meaning).toBe("底面温度200℃を限度にアイロン仕上げ処理ができる（高温）");
    expect(r.item.oldJisNote).toBe(SENTAKU_OLD_JIS_NOTE);
    expect(r.item.oldJisNote).toMatch(/旧JIS表示/);
  });
});

describe("SentakuHyoji.calc — 追加検証", () => {
  it("symbol_id 優先: symbol_id と query が両方指定された場合は symbol_id を優先する", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_95", query: "手洗い" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.id).toBe("sen_95");
  });

  it("symbol_id が存在しないIDなら not_found を返す", () => {
    const r = searchSentakuHyoji({ symbolId: "not_a_real_id" });
    expect(r.kind).toBe("not_found");
  });

  it("normalize: 全角数字は半角に、前後・内部の空白は除去される", () => {
    expect(normalize(" ４０　度 ")).toBe("40度");
  });

  it("見間違えやすい記号: sen_40_yowai の related には sen_30_hijou_yowai が含まれる", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_40_yowai" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.relatedSymbols.map((s) => s.id)).toContain("sen_30_hijou_yowai");
  });

  it("findSymbolById: データ表に存在しないIDは undefined", () => {
    expect(findSymbolById("does_not_exist")).toBeUndefined();
  });

  it("category と query の併用: category=クリーニング かつ query=非常に弱い → wet_hijou_yowai のみ", () => {
    const r = searchSentakuHyoji({ category: "クリーニング", query: "非常に弱い" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.id).toBe("wet_hijou_yowai");
  });

  it("全記号にカテゴリ・見た目・意味・お手入れ方法・キーワードが揃っている", () => {
    for (const s of getAllSymbols()) {
      expect(s.category.length).toBeGreaterThan(0);
      expect(s.symbolShape.length).toBeGreaterThan(0);
      expect(s.meaning.length).toBeGreaterThan(0);
      expect(s.handlingTip.length).toBeGreaterThan(0);
      expect(s.keywords.length).toBeGreaterThan(0);
    }
  });
});
