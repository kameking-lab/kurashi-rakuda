import { describe, expect, it } from "vitest";
import seido from "@/data/seido/kosodate-kyufu-sougou-check.json";
import {
  ALL_PROGRAMS,
  LIFE_STAGES,
  matchPrograms,
  relatedToolSlug,
} from "@/components/tools/impl/KosodateKyufuSougouCheck.calc";

/** 仕様書 specs/s-tools/18-kosodate-kyufu-sougou-check.md のテストケース表を反映 */

describe("KosodateKyufuSougouCheck.calc — 制度データの正規化", () => {
  it("#1 8制度がJSONから正規化される", () => {
    expect(ALL_PROGRAMS).toHaveLength(seido.data.programs.length);
    expect(ALL_PROGRAMS).toHaveLength(8);
  });

  it("#2 児童手当はすべての世帯が対象（isUniversal=true）", () => {
    const p = ALL_PROGRAMS.find((x) => x.key === "jido-teate");
    expect(p?.isUniversal).toBe(true);
    expect(p?.name).toContain("児童手当");
  });

  it("#3 児童扶養手当は条件付き（isUniversal=false）", () => {
    const p = ALL_PROGRAMS.find((x) => x.key === "jidou-fuyou-teate");
    expect(p?.isUniversal).toBe(false);
  });

  it("#4 各制度に対象・所管・申請先の文字列がある", () => {
    for (const p of ALL_PROGRAMS) {
      expect(p.targetSummary.length).toBeGreaterThan(0);
      expect(p.authority.length).toBeGreaterThan(0);
      expect(p.applicationTo.length).toBeGreaterThan(0);
    }
  });

  it("#5 金額・所得制限などの実データは持たない（設計原則）", () => {
    for (const p of ALL_PROGRAMS) {
      expect(p).not.toHaveProperty("amount");
      expect(p).not.toHaveProperty("incomeLimit");
    }
  });
});

describe("KosodateKyufuSougouCheck.calc — ライフステージ照合", () => {
  it("#6 妊娠期は産休育休給付・妊婦支援給付が該当", () => {
    const r = matchPrograms({ lifeStage: "妊娠" });
    const keys = r.matched.map((p) => p.key);
    expect(keys).toContain("ikukyu-kyufu");
    expect(keys).toContain("shussan-oen-kofukin");
  });

  it("#7 高校生期は児童手当・高校就学支援金・こども医療費等が該当", () => {
    const r = matchPrograms({ lifeStage: "高校生" });
    const keys = r.matched.map((p) => p.key);
    expect(keys).toContain("jido-teate");
    expect(keys).toContain("koukou-shugaku-shienkin");
    expect(keys).toContain("kodomo-iryouhi-jyosei");
  });

  it("#8 高校生期に就学援助（小中対象）は含まれない", () => {
    const r = matchPrograms({ lifeStage: "高校生" });
    expect(r.matched.map((p) => p.key)).not.toContain("shugaku-enjo-seido");
  });

  it("#9 小学生期は就学援助が該当", () => {
    const r = matchPrograms({ lifeStage: "小学生" });
    expect(r.matched.map((p) => p.key)).toContain("shugaku-enjo-seido");
  });

  it("#10 未就学期は幼児教育・保育の無償化が該当", () => {
    const r = matchPrograms({ lifeStage: "未就学" });
    expect(r.matched.map((p) => p.key)).toContain("youji-kyouiku-mushouka");
  });

  it("#11 該当制度はisUniversal（全世帯対象）が先頭に並ぶ", () => {
    const r = matchPrograms({ lifeStage: "高校生" });
    const firstConditionalIndex = r.matched.findIndex((p) => !p.isUniversal);
    const lastUniversalIndex = [...r.matched].map((p) => p.isUniversal).lastIndexOf(true);
    if (firstConditionalIndex >= 0) {
      expect(lastUniversalIndex).toBeLessThan(firstConditionalIndex);
    }
  });

  it("#12 全世帯対象数・条件付き数を数える", () => {
    const r = matchPrograms({ lifeStage: "出産・育児" });
    expect(r.universalCount + r.conditionalCount).toBe(r.matched.length);
    expect(r.universalCount).toBeGreaterThan(0);
  });
});

describe("KosodateKyufuSougouCheck.calc — ひとり親の強調", () => {
  it("#13 ひとり親を選ぶと児童扶養手当が強調キーに入る", () => {
    const r = matchPrograms({ lifeStage: "小学生", singleParent: true });
    expect(r.emphasizedKeys).toContain("jidou-fuyou-teate");
  });

  it("#14 ひとり親でなければ強調キーは空", () => {
    const r = matchPrograms({ lifeStage: "小学生", singleParent: false });
    expect(r.emphasizedKeys).toHaveLength(0);
  });

  it("#15 児童扶養手当が該当しないステージ（妊娠）ではひとり親でも強調しない", () => {
    const r = matchPrograms({ lifeStage: "妊娠", singleParent: true });
    expect(r.emphasizedKeys).toHaveLength(0);
  });
});

describe("KosodateKyufuSougouCheck.calc — 関連ツールリンク", () => {
  it("#16 児童手当・児童扶養手当・こども医療費は自ツールへの内部リンクを持つ", () => {
    expect(relatedToolSlug("jido-teate")).toBe("jido-teate");
    expect(relatedToolSlug("jidou-fuyou-teate")).toBe("jidou-fuyou-teate");
    expect(relatedToolSlug("kodomo-iryouhi-jyosei")).toBe("kodomo-iryouhi-jyosei");
  });

  it("#17 対応ツールがない制度はnull", () => {
    expect(relatedToolSlug("shussan-oen-kofukin")).toBeNull();
    expect(relatedToolSlug("shugaku-enjo-seido")).toBeNull();
    expect(relatedToolSlug("no-such-program")).toBeNull();
  });

  it("#18 ライフステージは6区分そろっている", () => {
    expect(LIFE_STAGES).toHaveLength(6);
    expect(LIFE_STAGES).toContain("妊娠");
    expect(LIFE_STAGES).toContain("高校生");
  });
});
