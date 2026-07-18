import { describe, it, expect } from "vitest";
import {
  scoreAudience,
  sortByAudience,
  isHighlighted,
  isProfileEmpty,
  type Profile,
} from "@/lib/personalize";
import type { Audience } from "@/app/lib/audience";

const universal: Audience = {
  universal: true,
  lifeStages: [],
  lifeEvents: [],
  childAgeBands: [],
  gender: null,
};
const parenting: Audience = {
  universal: false,
  lifeStages: ["infant", "toddler"],
  lifeEvents: ["parenting"],
  childAgeBands: ["age0_1", "age1_3"],
  gender: null,
};
const caregiving: Audience = {
  universal: false,
  lifeStages: ["adult", "senior"],
  lifeEvents: ["caregiving"],
  childAgeBands: [],
  gender: null,
};
const womensHealth: Audience = {
  universal: false,
  lifeStages: ["adult"],
  lifeEvents: [],
  childAgeBands: [],
  gender: "female",
};

describe("personalize", () => {
  it("未設定プロフィールは空判定", () => {
    expect(isProfileEmpty(null)).toBe(true);
    expect(isProfileEmpty({})).toBe(true);
    expect(isProfileEmpty({ lifeEvents: [] })).toBe(true);
    expect(isProfileEmpty({ lifeEvents: ["parenting"] })).toBe(false);
  });

  it("未設定なら全スコア0（既定順維持）", () => {
    expect(scoreAudience(null, parenting)).toBe(0);
    expect(scoreAudience({}, caregiving)).toBe(0);
  });

  it("イベント一致で加点、関連が強いほど高スコア", () => {
    const p: Profile = { lifeEvents: ["parenting"], lifeStages: ["infant"], childAgeBands: ["age0_1"] };
    expect(scoreAudience(p, parenting)).toBeGreaterThan(scoreAudience(p, caregiving));
  });

  it("性別ミスマッチは減点されるが除外はしない（スコアは数値）", () => {
    const male: Profile = { gender: "male", lifeStages: ["adult"] };
    // adult 一致(+4) と gender ミスマッチ(-3) → 依然として数値スコア（除外しない）
    expect(typeof scoreAudience(male, womensHealth)).toBe("number");
  });

  it("sortByAudience は全件を返し、1つも落とさない", () => {
    const items = [
      { id: "a", audience: universal },
      { id: "b", audience: caregiving },
      { id: "c", audience: parenting },
    ];
    const sorted = sortByAudience(items, { lifeEvents: ["parenting"], lifeStages: ["infant"] });
    expect(sorted).toHaveLength(items.length);
    expect(new Set(sorted.map((x) => x.id))).toEqual(new Set(["a", "b", "c"]));
    // 育児プロフィールでは parenting が先頭に来る
    expect(sorted[0].id).toBe("c");
  });

  it("未設定プロフィールは入力順のコピーを返す（並べ替えなし）", () => {
    const items = [
      { id: "a", audience: caregiving },
      { id: "b", audience: parenting },
    ];
    const out = sortByAudience(items, null);
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
    expect(out).not.toBe(items); // コピー
  });

  it("安定ソート: 同点は元の順を保つ", () => {
    const items = [
      { id: "x", audience: caregiving },
      { id: "y", audience: caregiving },
    ];
    const out = sortByAudience(items, { lifeEvents: ["parenting"] }); // どちらも0点
    expect(out.map((x) => x.id)).toEqual(["x", "y"]);
  });

  it("isHighlighted は未設定で false、強一致で true", () => {
    expect(isHighlighted(null, parenting)).toBe(false);
    expect(isHighlighted({ lifeEvents: ["parenting"] }, parenting)).toBe(true);
    expect(isHighlighted({ lifeEvents: ["caregiving"] }, parenting)).toBe(false);
  });
});
