import { describe, expect, it } from "vitest";
import table from "@/data/tables/sentaku-hyoji.json";
import {
  findSymbolById,
  getAllSymbols,
  getSymbolsByCategory,
  normalize,
  searchSentakuHyoji,
  SENTAKU_DELICATE_CAUTION_NOTE,
  SENTAKU_EFFECTIVE_DATE_LABEL,
  SENTAKU_NOT_FOUND_NOTE,
  SENTAKU_OLD_JIS_NOTE,
} from "@/components/tools/impl/SentakuHyoji.calc";

/**
 * 仕様書 specs/b-tools/41-laundry-care-label-search.md の「テストケース（14件）」を反映。
 *
 * ★D2対応（2026-07-17）★ データ表を JIS L 0001 の令和6年8月20日改正版に更新したため、
 * 改正で意味が変わった記号（530・520・510・620・621・610・611）と新規追加された記号（111・511）を
 * 固定するテストを追加している。記号は id ではなく記号番号（number）で一意に識別する。
 * ★記号の総数は一次情報に明記がないため、総数を期待値にするテストは書かない★
 */

/** 記号番号から記号を引く（一次情報の記号番号と実装の対応を固定するためのヘルパー） */
function byNumber(n: number) {
  const s = getAllSymbols().find((x) => x.number === n);
  expect(s, `記号番号 ${n} がデータ表に存在しない`).toBeDefined();
  return s!;
}

describe("SentakuHyoji.calc — 仕様書テストケース表（14件）", () => {
  it("#1 symbol_id=sen_40_tsujou → 洗濯桶に『40』／液温40℃を限度に通常の洗濯処理ができる、の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_40_tsujou" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("40");
    expect(r.item.meaning).toBe("液温40℃を限度に、洗濯機で通常の洗濯処理ができる");
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
    expect(r.item.meaning).toBe("家庭での洗濯処理はできない");
    expect(r.item.handlingTip).toContain("クリーニング店");
  });

  it("#4 query=手洗い → 手洗い記号（110・111）が候補一覧で返り、いずれもデリケート注記の対象", () => {
    // ★令和6年改正★ 記号111（30℃手洗い）の追加により、「手洗い」は1件に絞れなくなった
    const r = searchSentakuHyoji({ query: "手洗い" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    expect(r.items.map((i) => i.id).sort()).toEqual(["sen_tearai", "sen_tearai_30"]);
    for (const item of r.items) {
      const d = searchSentakuHyoji({ symbolId: item.id });
      expect(d.kind).toBe("detail");
      if (d.kind !== "detail") return;
      expect(d.item.delicateCaution).toBe(true);
    }
  });

  it("#5 query=アイロン不可 → id=iron_fuka がヒットし、アイロン仕上げ処理不可の詳細表示", () => {
    const r = searchSentakuHyoji({ query: "アイロン不可" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.id).toBe("iron_fuka");
    expect(r.item.meaning).toBe("アイロン仕上げ処理はできない");
  });

  it("#6 query=ドライクリーニング（複数ヒット） → dry_* を含む候補一覧を表示。ウエット記号は含まない", () => {
    const r = searchSentakuHyoji({ query: "ドライクリーニング" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    const ids = r.items.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining(["dry_p", "dry_p_yowai", "dry_f", "dry_f_yowai", "dry_fuka"]),
    );
    // ウエットクリーニング（wet_*）はキーワードに「ドライクリーニング」を含まないため対象外
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
    expect(r.item.meaning).toContain(
      "酸素系漂白剤による漂白処理はできるが、塩素系漂白剤による漂白処理はできない",
    );
  });

  it("#9 symbol_id=kansou_tumble_kou → タンブル乾燥可（高温・排気温度の上限80℃）の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "kansou_tumble_kou" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.meaning).toBe("洗濯処理後のタンブル乾燥ができる（高温乾燥・排気温度の上限は最高80℃）");
  });

  it("#10 symbol_id=kansou_tsuri_kage → 四角に縦線1本＋斜め線／日陰でのつり干し乾燥がよい、の詳細表示", () => {
    const r = searchSentakuHyoji({ symbolId: "kansou_tsuri_kage" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("斜め線");
    expect(r.item.meaning).toBe("日陰でのつり干し乾燥がよい");
  });

  it("#11 symbol_id=wet_hijou_yowai → 丸にW・下線2本／非常に弱い処理でウエットクリーニング可、＋デリケート素材の注記", () => {
    const r = searchSentakuHyoji({ symbolId: "wet_hijou_yowai" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.meaning).toBe("ウエットクリーニングができる（非常に弱い処理）");
    expect(r.item.delicateCaution).toBe(true);
    expect(SENTAKU_DELICATE_CAUTION_NOTE).toMatch(/クリーニング店/);
  });

  it("#12 query=140度（存在しない温度） → 0件（not_found）の案内を表示", () => {
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

  it("#14 symbol_id=iron_kou → アイロンに点3つ／底面温度210℃限度・高温アイロン可、＋旧表示注記の固定表示", () => {
    const r = searchSentakuHyoji({ symbolId: "iron_kou" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.symbolShape).toContain("点3つ");
    // ★令和6年改正で 200℃ → 210℃★
    expect(r.item.meaning).toBe("底面温度210℃を限度としてアイロン仕上げ処理ができる（高温）");
    expect(r.item.oldJisNote).toBe(SENTAKU_OLD_JIS_NOTE);
    expect(r.item.oldJisNote).toMatch(/旧JIS/);
  });
});

describe("SentakuHyoji.calc — 令和6年8月20日改正（JIS L 0001:2024）の反映", () => {
  it("データ表は改正後の版であることを宣言している", () => {
    expect(table.jisEdition).toBe("JIS L 0001:2024");
    expect(SENTAKU_EFFECTIVE_DATE_LABEL).toBe("令和6年8月20日以降");
  });

  it("★総数を持たない★ 一次情報に記号の総数の明記がないため、データ表に総数フィールドを置かない", () => {
    expect(table).not.toHaveProperty("kigou_sousuu");
    expect(table).not.toHaveProperty("kigouSousuu");
    // 従前の「全41種類」は2014年版JISについての値であり、現行版の値ではない
    expect(JSON.stringify(table.symbols)).not.toContain("全41種類");
  });

  it("基本記号は5種類（消費者庁ページの原文「5 個の基本記号」に対応）", () => {
    expect(table.kihonKigouSuu).toBe(5);
    expect(table.categories).toHaveLength(5);
  });

  it("⑴新規追加: 記号111（液温30℃を限度とする手洗い）が存在する", () => {
    const s = byNumber(111);
    expect(s.category).toBe("洗濯");
    expect(s.meaning).toBe("液温30℃を限度に、手洗いによる洗濯処理ができる");
    expect(s.symbolShape).toContain("手のマーク");
  });

  it("⑴新規追加: 記号511（底面温度120℃・スチームなし）が存在し、スチーム不可で検索できる", () => {
    const s = byNumber(511);
    expect(s.category).toBe("アイロン");
    expect(s.meaning).toBe("底面温度120℃を限度として、スチームなしでアイロン仕上げ処理ができる");
    const r = searchSentakuHyoji({ query: "スチーム不可" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.number).toBe(511);
  });

  it("⑵意味の変更: アイロン仕上げの上限温度は 530=210℃／520=160℃／510=120℃", () => {
    expect(byNumber(530).meaning).toContain("210℃");
    expect(byNumber(520).meaning).toContain("160℃");
    expect(byNumber(510).meaning).toContain("120℃");
    // 改正前の 200℃／150℃／110℃ が残っていないこと
    const ironMeanings = getSymbolsByCategory("アイロン").map((s) => s.meaning).join();
    expect(ironMeanings).not.toContain("200℃");
    expect(ironMeanings).not.toContain("150℃");
    expect(ironMeanings).not.toContain("110℃");
  });

  it("⑵意味の変更: 510（点1つ）はスチームの可否を述べず、スチームなしは511が担う", () => {
    // 改正前は「110℃・スチームなし」が点1つの意味だった。改正後は 510 と 511 に分かれている
    expect(byNumber(510).meaning).not.toContain("スチーム");
    expect(byNumber(511).meaning).toContain("スチームなし");
  });

  it("⑵意味の変更: ドライクリーニングの溶剤（620・621はジブトキシメタン、610・611はデカメチルペンタシクロシロキサンを含む）", () => {
    expect(byNumber(620).meaning).toContain("ジブトキシメタン");
    expect(byNumber(621).meaning).toContain("ジブトキシメタン");
    expect(byNumber(610).meaning).toContain("デカメチルペンタシクロシロキサン");
    expect(byNumber(611).meaning).toContain("デカメチルペンタシクロシロキサン");
    // 改正前の「パークロロエチレン及び石油系溶剤」という並記が残っていないこと
    expect(JSON.stringify(table.symbols)).not.toContain("パークロロエチレン及び石油系溶剤");
  });

  it("タンブル乾燥のドット数と温度が逆転していない（点が増えるほど高温）", () => {
    // 320（点2つ）が高温80℃、310（点1つ）が低温60℃
    expect(byNumber(320).symbolShape).toContain("点2つ");
    expect(byNumber(320).meaning).toContain("80℃");
    expect(byNumber(310).symbolShape).toContain("点1つ");
    expect(byNumber(310).meaning).toContain("60℃");
  });

  it("記号番号は一意で、消費者庁ページの表1〜表7の記号をすべて収録している", () => {
    const numbers = getAllSymbols().map((s) => s.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    const expected = [
      190, 170, 160, 161, 150, 151, 140, 141, 142, 130, 131, 132, 110, 111, 100, // 表1 洗濯
      220, 210, 200, // 表2 漂白
      320, 310, 300, // 表3 タンブル乾燥
      440, 445, 430, 435, 420, 425, 410, 415, // 表4 自然乾燥
      530, 520, 510, 511, 500, // 表5 アイロン
      620, 621, 610, 611, 600, // 表6 ドライクリーニング
      710, 711, 712, 700, // 表7 ウエットクリーニング
    ];
    expect(numbers.slice().sort((a, b) => a - b)).toEqual(expected.slice().sort((a, b) => a - b));
  });

  it("旧表示の注記は、令和6年改正前の表示と平成28年以前の旧JISの両方に触れている", () => {
    expect(SENTAKU_OLD_JIS_NOTE).toMatch(/令和6年8月/);
    expect(SENTAKU_OLD_JIS_NOTE).toMatch(/JIS L 0217/);
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

  it("見間違えやすい記号: sen_40_yowai の related には sen_40_hijou_yowai が含まれる", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_40_yowai" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.relatedSymbols.map((s) => s.id)).toContain("sen_40_hijou_yowai");
  });

  it("relatedSymbols は全記号に定義され、参照先がすべて実在し、自分自身を含まない", () => {
    for (const s of getAllSymbols()) {
      const r = searchSentakuHyoji({ symbolId: s.id });
      expect(r.kind).toBe("detail");
      if (r.kind !== "detail") return;
      expect(r.item.relatedSymbols.length).toBeGreaterThan(0);
      for (const rel of r.item.relatedSymbols) {
        expect(findSymbolById(rel.id)).toBeDefined();
        expect(rel.id).not.toBe(s.id);
      }
    }
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

  it("表記ゆれ: 「ウェットクリーニング」でもウエットクリーニングの記号が引ける", () => {
    const r = searchSentakuHyoji({ query: "ウェットクリーニング" });
    expect(r.kind).toBe("list");
    if (r.kind !== "list") return;
    expect(r.items.map((i) => i.number).sort((a, b) => a - b)).toEqual([700, 710, 711, 712]);
  });

  it("デリケート注記: クリーニング記号と手洗い記号（110・111）のみが対象", () => {
    for (const s of getAllSymbols()) {
      const r = searchSentakuHyoji({ symbolId: s.id });
      expect(r.kind).toBe("detail");
      if (r.kind !== "detail") return;
      const expected = s.category === "クリーニング" || s.number === 110 || s.number === 111;
      expect(r.item.delicateCaution, `${s.id}(${s.number})`).toBe(expected);
    }
  });

  it("出典ラベルには現行の版（JIS L 0001:2024）が含まれる", () => {
    const r = searchSentakuHyoji({ symbolId: "sen_95" });
    expect(r.kind).toBe("detail");
    if (r.kind !== "detail") return;
    expect(r.item.source).toContain("JIS L 0001:2024");
    expect(r.item.source).toContain("消費者庁");
  });

  it("全記号にカテゴリ・記号番号・見た目・意味・お手入れ方法・キーワードが揃っている", () => {
    for (const s of getAllSymbols()) {
      expect(s.category.length).toBeGreaterThan(0);
      expect(s.number).toBeGreaterThan(0);
      expect(s.symbolShape.length).toBeGreaterThan(0);
      expect(s.meaning.length).toBeGreaterThan(0);
      expect(s.handlingTip.length).toBeGreaterThan(0);
      expect(s.keywords.length).toBeGreaterThan(0);
    }
  });
});
