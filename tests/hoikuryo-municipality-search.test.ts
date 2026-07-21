import { describe, expect, it } from "vitest";
import { groupMunicipalitiesByPrefecture, countMatched } from "@/lib/tools/impl/hoikuryo-municipality-search";

const SAMPLE = [
  { id: "hokkaido-sapporo", name: "北海道札幌市", prefecture: "北海道" },
  { id: "hokkaido-kushiro", name: "北海道釧路市", prefecture: "北海道" },
  { id: "kanagawa-yokohama", name: "神奈川県横浜市", prefecture: "神奈川県" },
  { id: "kanagawa-kawasaki", name: "神奈川県川崎市", prefecture: "神奈川県" },
  { id: "tokyo-nerima", name: "東京都練馬区", prefecture: "東京都" },
];

describe("groupMunicipalitiesByPrefecture", () => {
  it("クエリなしなら全件を都道府県ごとにグルーピングする", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE);
    expect(groups).toHaveLength(3);
    expect(groups.find((g) => g.prefecture === "北海道")?.items).toHaveLength(2);
    expect(groups.find((g) => g.prefecture === "神奈川県")?.items).toHaveLength(2);
    expect(groups.find((g) => g.prefecture === "東京都")?.items).toHaveLength(1);
  });

  it("元の並び順（都道府県の初出順）を保持する", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE);
    expect(groups.map((g) => g.prefecture)).toEqual(["北海道", "神奈川県", "東京都"]);
  });

  it("市区町村名の部分一致で絞り込む", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE, "横浜");
    expect(countMatched(groups)).toBe(1);
    expect(groups[0].items[0].id).toBe("kanagawa-yokohama");
  });

  it("都道府県名でも絞り込める", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE, "神奈川");
    expect(countMatched(groups)).toBe(2);
  });

  it("該当する都道府県が無ければグループごと消える（0件の都道府県見出しを出さない）", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE, "横浜");
    expect(groups).toHaveLength(1);
    expect(groups[0].prefecture).toBe("神奈川県");
  });

  it("全角・半角・カタカナ表記ゆれを吸収する", () => {
    const withKana = [{ id: "x", name: "サッポロ市", prefecture: "北海道" }];
    const groups = groupMunicipalitiesByPrefecture(withKana, "さっぽろ");
    expect(countMatched(groups)).toBe(1);
  });

  it("前後の空白を無視する", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE, "  横浜  ");
    expect(countMatched(groups)).toBe(1);
  });

  it("一致しないクエリは0件を返す", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE, "存在しない市");
    expect(groups).toHaveLength(0);
    expect(countMatched(groups)).toBe(0);
  });

  it("空配列を渡すと空配列を返す", () => {
    expect(groupMunicipalitiesByPrefecture([])).toEqual([]);
  });

  it("query省略時は空文字クエリと同じ（全件ヒット）", () => {
    const withDefault = groupMunicipalitiesByPrefecture(SAMPLE);
    const withEmpty = groupMunicipalitiesByPrefecture(SAMPLE, "");
    expect(withDefault).toEqual(withEmpty);
  });
});

describe("countMatched", () => {
  it("複数グループの件数を合算する", () => {
    const groups = groupMunicipalitiesByPrefecture(SAMPLE);
    expect(countMatched(groups)).toBe(5);
  });

  it("空配列なら0を返す", () => {
    expect(countMatched([])).toBe(0);
  });
});
