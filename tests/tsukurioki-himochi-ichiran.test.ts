import { describe, expect, it } from "vitest";
import {
  searchTsukuriokiHimochi,
  formatDays,
  formatWeeks,
  normalizeQuery,
  getAllCategories,
  getCategoryById,
} from "@/components/tools/impl/TsukuriokiHimochiIchiran.calc";

/*
 * 作り置き 日持ち一覧（冷蔵/冷凍別）（P2-T24）のテスト。
 * テストケース表は specs/b-tools/p2-t24-tsukurioki-himochi-ichiran.md と対応する。
 * データは data/tables/tsukurioki-himochi.json を正とし、本テストでは
 * 検索・整形ロジックが壊れていないことを確認する（数値そのものは
 * データファイルの出典開示に基づくものであり、本テストの対象外）。
 */

describe("searchTsukuriokiHimochi", () => {
  it("#1 queryもcategoryIdも未指定なら全カテゴリを一覧表示する", () => {
    const result = searchTsukuriokiHimochi({});
    expect(result.kind).toBe("list");
    if (result.kind === "list") {
      expect(result.items).toHaveLength(5);
    }
  });

  it("#2 queryが空文字列でも全カテゴリを一覧表示する", () => {
    const result = searchTsukuriokiHimochi({ query: "" });
    expect(result.kind).toBe("list");
    if (result.kind === "list") {
      expect(result.items).toHaveLength(5);
    }
  });

  it("#3 「きんぴらごぼう」で検索すると加熱調理カテゴリに一致する", () => {
    const result = searchTsukuriokiHimochi({ query: "きんぴらごぼう" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("kanetsu-okazu");
    }
  });

  it("#4 「カレー」で検索すると煮込みカテゴリに一致する", () => {
    const result = searchTsukuriokiHimochi({ query: "カレー" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("curry-nikomi");
    }
  });

  it("#5 「みそ汁」で検索すると汁物カテゴリに一致する", () => {
    const result = searchTsukuriokiHimochi({ query: "みそ汁" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("shirumono-soup");
    }
  });

  it("#6 「サラダ」で検索すると生野菜カテゴリに一致する", () => {
    const result = searchTsukuriokiHimochi({ query: "サラダ" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("seisai-salad");
    }
  });

  it("#7 「佃煮」で検索すると塩分糖分酢カテゴリに一致する", () => {
    const result = searchTsukuriokiHimochi({ query: "佃煮" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("enbun-tou-su");
    }
  });

  it("#8 ひらがな「かれー」でも煮込みカテゴリに一致する（表記ゆれ吸収）", () => {
    const result = searchTsukuriokiHimochi({ query: "かれー" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("curry-nikomi");
    }
  });

  it("#9 カタカナ「カレー」と結果が一致する（ゆれ吸収の対称性）", () => {
    const hira = searchTsukuriokiHimochi({ query: "かれー" });
    const kata = searchTsukuriokiHimochi({ query: "カレー" });
    expect(hira.kind).toBe("single");
    expect(kata.kind).toBe("single");
    if (hira.kind === "single" && kata.kind === "single") {
      expect(hira.item.id).toBe(kata.item.id);
    }
  });

  it("#10 存在しない料理名は notFound になる", () => {
    const result = searchTsukuriokiHimochi({ query: "存在しない料理名xyz" });
    expect(result.kind).toBe("notFound");
  });

  it("#11 categoryId=curry-nikomi はideal Same Day・1〜2日を返す", () => {
    const result = searchTsukuriokiHimochi({ categoryId: "curry-nikomi" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.idealSameDay).toBe(true);
      expect(result.item.refrigDaysMin).toBe(1);
      expect(result.item.refrigDaysMax).toBe(2);
    }
  });

  it("#12 categoryId=seisai-salad はfreezable falseを返す", () => {
    const result = searchTsukuriokiHimochi({ categoryId: "seisai-salad" });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.freezable).toBe(false);
      expect(result.item.freezeText).toBeNull();
    }
  });

  it("#13 存在しないcategoryIdは notFound になる", () => {
    const result = searchTsukuriokiHimochi({ categoryId: "no-such-id" });
    expect(result.kind).toBe("notFound");
  });

  it("#14 categoryIdとqueryを同時指定するとcategoryIdが優先される", () => {
    const result = searchTsukuriokiHimochi({
      categoryId: "shirumono-soup",
      query: "カレー",
    });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("shirumono-soup");
    }
  });

  it("#21 前後空白を含むqueryはtrimして同じ結果になる", () => {
    const result = searchTsukuriokiHimochi({ query: "  カレー  " });
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.item.id).toBe("curry-nikomi");
    }
  });
});

describe("formatDays", () => {
  it("#15 min===maxのときは単一値", () => {
    expect(formatDays(2, 2)).toBe("約2日");
  });

  it("#16 min!==maxのときは範囲", () => {
    expect(formatDays(2, 3)).toBe("約2〜3日");
  });
});

describe("formatWeeks", () => {
  it("#17 範囲表示", () => {
    expect(formatWeeks(2, 4)).toBe("約2〜4週間");
  });

  it("min===maxのときは単一値", () => {
    expect(formatWeeks(3, 3)).toBe("約3週間");
  });
});

describe("normalizeQuery", () => {
  it("前後空白を除去する", () => {
    expect(normalizeQuery("  みそ汁  ")).toBe("みそ汁");
  });

  it("カタカナをひらがなに変換する", () => {
    expect(normalizeQuery("カレー")).toBe(normalizeQuery("かれー"));
  });
});

describe("getAllCategories / getCategoryById", () => {
  it("#18 全5カテゴリを返し、idの重複がない", () => {
    const all = getAllCategories();
    expect(all).toHaveLength(5);
    const ids = new Set(all.map((c) => c.id));
    expect(ids.size).toBe(5);
  });

  it("#19 id指定で加熱調理カテゴリの日数を取得できる", () => {
    const item = getCategoryById("kanetsu-okazu");
    expect(item).not.toBeNull();
    expect(item?.refrigDaysMin).toBe(2);
    expect(item?.refrigDaysMax).toBe(3);
  });

  it("#20 存在しないidはnullを返す", () => {
    expect(getCategoryById("no-such-id")).toBeNull();
  });
});
