import { describe, expect, it } from "vitest";
import seido from "@/data/seido/youikuhi-santeihyou.json";
import {
  allocateByIndex,
  calcYouikuhi,
  HOUTEI_YOUIKUHI_PER_CHILD,
  INDEX_AGE_0_14,
  INDEX_AGE_15_PLUS,
  SAKIDORI_PER_CHILD,
  selectTable,
  type AgeGroup,
} from "@/components/tools/impl/YouikuhiSanteihyou.calc";

/** 仕様書 specs/s-tools/15-youikuhi-santeihyou.md のテストケース表を反映 */

describe("YouikuhiSanteihyou.calc — 子の指数・法定養育費", () => {
  it("#1 子の指数62/85・法定養育費2万・先取特権8万はJSON由来", () => {
    expect(INDEX_AGE_0_14).toBe(seido.data.childIndex.age0to14.value);
    expect(INDEX_AGE_0_14).toBe(62);
    expect(INDEX_AGE_15_PLUS).toBe(85);
    expect(HOUTEI_YOUIKUHI_PER_CHILD).toBe(20000);
    expect(SAKIDORI_PER_CHILD).toBe(80000);
  });
});

describe("YouikuhiSanteihyou.calc — 算定表の選択", () => {
  it("#2 子1人0〜14歳 → 表1", () => {
    expect(selectTable(["0-14"])?.no).toBe(1);
  });
  it("#3 子1人15歳以上 → 表2", () => {
    expect(selectTable(["15+"])?.no).toBe(2);
  });
  it("#4 子2人（0〜14と15+の混在）→ 表4（順序に依らず15+先頭で照合）", () => {
    expect(selectTable(["0-14", "15+"])?.no).toBe(4);
    expect(selectTable(["15+", "0-14"])?.no).toBe(4);
  });
  it("#5 子2人とも15歳以上 → 表5", () => {
    expect(selectTable(["15+", "15+"])?.no).toBe(5);
  });
  it("#6 子3人とも0〜14歳 → 表6", () => {
    expect(selectTable(["0-14", "0-14", "0-14"])?.no).toBe(6);
  });
  it("#7 子3人（15+2人・0-14が1人）→ 表8", () => {
    expect(selectTable(["15+", "0-14", "15+"])?.no).toBe(8);
  });
  it("#8 表にはPDFのURLが付く", () => {
    expect(selectTable(["0-14"])?.pdfUrl).toContain("courts.go.jp");
  });
  it("#9 子0人・4人は表なし", () => {
    expect(selectTable([])).toBeNull();
    expect(selectTable(["0-14", "0-14", "0-14", "0-14"] as AgeGroup[])).toBeNull();
  });
});

describe("YouikuhiSanteihyou.calc — 指数による按分", () => {
  it("#10 合計5万・10歳と15歳 → 指数62:85で按分（21,088／28,912・合計保持）", () => {
    const r = allocateByIndex(50000, ["0-14", "15+"]);
    expect(r.totalIndex).toBe(147);
    expect(r.perChild[0].amount).toBe(21088); // round(50000×62/147)
    expect(r.perChild[1].amount).toBe(28912); // 50000−21088
    expect(r.perChild[0].amount + r.perChild[1].amount).toBe(50000);
  });

  it("#11 同年齢区分の子は均等に近く分かれ、合計は保たれる", () => {
    const r = allocateByIndex(60000, ["0-14", "0-14", "0-14"]);
    expect(r.perChild.reduce((s, c) => s + c.amount, 0)).toBe(60000);
    expect(r.perChild[0].amount).toBe(20000);
  });

  it("#12 端数は最後の子に寄せる（合計7円・区別できる小額でも合計保持）", () => {
    const r = allocateByIndex(7, ["0-14", "15+"]);
    expect(r.perChild.reduce((s, c) => s + c.amount, 0)).toBe(7);
  });
});

describe("YouikuhiSanteihyou.calc — calcYouikuhi 統合", () => {
  it("#13 表選択＋按分＋法定養育費をまとめて返す", () => {
    const r = calcYouikuhi({ ages: ["0-14", "15+"], tableAmount: 50000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.table?.no).toBe(4);
    expect(r.allocation?.perChild).toHaveLength(2);
    expect(r.houteiTotal).toBe(40000); // 2万×2人
    expect(r.childrenCount).toBe(2);
  });

  it("#14 tableAmount 未指定なら按分はnull（表案内のみ）", () => {
    const r = calcYouikuhi({ ages: ["0-14"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.allocation).toBeNull();
    expect(r.table?.no).toBe(1);
  });

  it("#15 子4人以上はエラー", () => {
    const r = calcYouikuhi({ ages: ["0-14", "0-14", "0-14", "0-14"] });
    expect(r.ok).toBe(false);
  });

  it("#16 子0人はエラー", () => {
    const r = calcYouikuhi({ ages: [] });
    expect(r.ok).toBe(false);
  });

  it("#17 法定養育費・先取特権はJSON由来（回帰）", () => {
    const r = calcYouikuhi({ ages: ["15+"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.houteiPerChild).toBe(seido.data.houteiYouikuhi.monthlyAmountPerChild.value);
    expect(r.sakidoriPerChild).toBe(seido.data.sakidoriTokken.amountPerChild.value);
  });
});
