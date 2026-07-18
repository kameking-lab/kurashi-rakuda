import { describe, expect, it } from "vitest";
import seido from "@/data/seido/kodomo-iryouhi-jyosei.json";
import {
  calcKodomoIryouhi,
  STAGE_LABELS,
  TOTAL_MUNICIPALITIES,
  type ChildStage,
} from "@/components/tools/impl/KodomoIryouhiJyosei.calc";

/** 仕様書 specs/s-tools/12-kodomo-iryouhi-jyosei.md のテストケース表を反映 */

describe("KodomoIryouhiJyosei.calc — 全国自治体数", () => {
  it("#1 総自治体数はJSON由来（1,741）", () => {
    expect(TOTAL_MUNICIPALITIES).toBe(seido.data.nationalCoverage.totalMunicipalities.value);
    expect(TOTAL_MUNICIPALITIES).toBe(1741);
  });
});

describe("KodomoIryouhiJyosei.calc — 通院の対象自治体数", () => {
  it("#2 未就学児（stage0）は全自治体が対象（1,741・100%）", () => {
    const r = calcKodomoIryouhi("outpatient", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.notCoveredCount).toBe(0);
    expect(r.coveredCount).toBe(1741);
    expect(r.coveredPercent).toBe(100);
  });

  it("#3 高校生年代（stage3）は 1,741−(9+1+145)=1,586 自治体", () => {
    const r = calcKodomoIryouhi("outpatient", 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.notCoveredCount).toBe(155);
    expect(r.coveredCount).toBe(1586);
    expect(r.coveredPercent).toBe(91.1);
  });

  it("#4 18歳超（stage4）は 20歳・22歳年度末の10自治体のみ", () => {
    const r = calcKodomoIryouhi("outpatient", 4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coveredCount).toBe(10);
  });

  it("#5 小学生（stage1）は 1,741−9=1,732 自治体", () => {
    const r = calcKodomoIryouhi("outpatient", 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coveredCount).toBe(1732);
  });

  it("#6 中学生（stage2）は 1,741−(9+1)=1,731 自治体", () => {
    const r = calcKodomoIryouhi("outpatient", 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coveredCount).toBe(1731);
  });
});

describe("KodomoIryouhiJyosei.calc — 入院（高年齢の内訳が調査に無い分もtotal差で正確に扱う）", () => {
  it("#7 入院・高校生年代（stage3）は 1,741−(1+7+116)=1,617 自治体", () => {
    const r = calcKodomoIryouhi("inpatient", 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.notCoveredCount).toBe(124);
    expect(r.coveredCount).toBe(1617);
  });

  it("#8 入院・18歳超（stage4）は 17 自治体（列挙されない高年齢分を total 差で回収）", () => {
    const r = calcKodomoIryouhi("inpatient", 4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 入院の列挙バケット合計は1,724で total 1,741 に17足りない。stage4 の対象は total−1724=17
    expect(r.coveredCount).toBe(17);
  });

  it("#9 入院・未就学児は全自治体（1,741）", () => {
    const r = calcKodomoIryouhi("inpatient", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coveredCount).toBe(1741);
  });
});

describe("KodomoIryouhiJyosei.calc — 所得制限・一部自己負担の分布", () => {
  it("#10 通院の所得制限なし1,692・あり49（JSON由来）", () => {
    const r = calcKodomoIryouhi("outpatient", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.incomeLimit.none).toBe(1692);
    expect(r.incomeLimit.withLimit).toBe(49);
  });

  it("#11 通院の一部自己負担なし1,319・あり422（JSON由来）", () => {
    const r = calcKodomoIryouhi("outpatient", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.copayment.noCopay).toBe(1319);
    expect(r.copayment.withCopay).toBe(422);
  });

  it("#12 入院の所得制限なし1,693・一部自己負担なし1,410（JSON由来）", () => {
    const r = calcKodomoIryouhi("inpatient", 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.incomeLimit.none).toBe(1693);
    expect(r.copayment.noCopay).toBe(1410);
  });
});

describe("KodomoIryouhiJyosei.calc — 一貫性とバリデーション", () => {
  it("#13 covered + notCovered は常に総数に一致", () => {
    for (const care of ["outpatient", "inpatient"] as const) {
      for (let s = 0 as ChildStage; s <= 4; s = (s + 1) as ChildStage) {
        const r = calcKodomoIryouhi(care, s);
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        expect(r.coveredCount + r.notCoveredCount).toBe(TOTAL_MUNICIPALITIES);
      }
    }
  });

  it("#14 年齢が上がるほど対象自治体数は単調に減る（通院）", () => {
    const counts = [0, 1, 2, 3, 4].map(
      (s) => (calcKodomoIryouhi("outpatient", s as ChildStage) as { coveredCount: number }).coveredCount,
    );
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it("#15 不正なcareTypeはエラー", () => {
    // @ts-expect-error 故意に不正値
    expect(calcKodomoIryouhi("xxx", 0).ok).toBe(false);
  });

  it("#16 不正なstageはエラー", () => {
    expect(calcKodomoIryouhi("outpatient", 9 as ChildStage).ok).toBe(false);
  });

  it("#17 stageLabelは全区分そろっている", () => {
    expect(Object.keys(STAGE_LABELS)).toHaveLength(5);
    expect(STAGE_LABELS[3]).toContain("高校生");
  });
});
