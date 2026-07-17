/**
 * 8a独立検算テスト（YMYLダブルチェック: 実装者=オーパス、検算者=統合検算セッション。2026-07-17合格）。
 *
 * ★このファイルの計算チェーンは、実装（hoikuryo-shotokuwari.ts）を参照せずに、
 *   data/seido/ の一次資料由来の値（juuminzei.json / kyuyo-shotoku-koujo.json の条文照合済みの値）
 *   だけから検算者が独立に書いたもの★ 実装と検算の2つの独立実装が同じ答えを出すことを格子照合で保証する。
 *   実装をリファクタリングしてこのテストが落ちた場合、どちらが条文に忠実かを一次資料で確認すること
 *   （このテストに合わせて実装を直すのでも、実装に合わせてこのテストを直すのでもなく、条文が正）。
 *
 * 検算の全体記録（公式計算例3件の独立突合を含む）は BACKLOG.md の Q3-09 8a検算の項を参照。
 */
import { describe, expect, it } from "vitest";
import {
  estimateHouseholdShotokuwari,
  estimateShotokuwari,
  shotokuwariNonTaxableLimit,
  type ShotokuwariInput,
  type Dependents,
} from "@/lib/tools/impl/hoikuryo-shotokuwari";

// ---- 検算者の独立実装（データの数値のみ使用。丸めは条文・データのnoteに従う） ----
function mySalaryIncome(s: number): number {
  let base = s;
  if (s >= 2_200_000 && s < 6_600_000) base = Math.floor(s / 4000) * 4000; // 別表第五equivalenceRule
  let ded: number;
  if (base <= 1_900_000) ded = Math.min(650_000, base);
  else if (base <= 3_600_000) ded = Math.floor((base * 30) / 100) + 80_000;
  else if (base <= 6_600_000) ded = Math.floor((base * 20) / 100) + 440_000;
  else if (base <= 8_500_000) ded = Math.floor((base * 10) / 100) + 1_100_000;
  else ded = 1_950_000;
  return Math.max(0, base - ded);
}

function myLimit(hasSpouse: boolean, d: Dependents): number {
  const n =
    (hasSpouse ? 1 : 0) +
    (d.general ?? 0) +
    (d.specific ?? 0) +
    (d.elderly ?? 0) +
    (d.elderlyCohabiting ?? 0) +
    (d.under16 ?? 0);
  return 350_000 * (n + 1) + 100_000 + (n > 0 ? 320_000 : 0);
}

function myShotokuwari(opts: {
  salary: number;
  shaho: number;
  hasSpouse: boolean;
  d: Dependents;
  designated: boolean;
  extra?: number;
}): { shotoku: number; kazei: number; zei: number } {
  const shotoku = mySalaryIncome(opts.salary);
  // 配偶者控除の逓減（地方税法314条の2第1項10号: 所得者900万以下33万/950万以下22万/1000万以下11万/超は0）
  const haiguusha = !opts.hasSpouse
    ? 0
    : shotoku <= 9_000_000
      ? 330_000
      : shotoku <= 9_500_000
        ? 220_000
        : shotoku <= 10_000_000
          ? 110_000
          : 0;
  const koujo =
    430_000 +
    opts.shaho +
    haiguusha +
    (opts.d.general ?? 0) * 330_000 +
    (opts.d.specific ?? 0) * 450_000 +
    (opts.d.elderly ?? 0) * 380_000 +
    (opts.d.elderlyCohabiting ?? 0) * 450_000 +
    (opts.extra ?? 0);
  const kazei = Math.floor(Math.max(0, shotoku - koujo) / 1000) * 1000;
  const rate = opts.designated ? 8 : 6;
  const before = Math.floor((kazei * rate) / 100);
  // 人的控除差の配偶者加算: 実装は900万超を加算しない（caveat開示・上限側に立つ既知の簡略化）。
  // 検算側も同じ条件で比較し、900万超のケースは別テストで「5万円の下限が吸収する」ことを確認する
  const diff =
    50_000 +
    (opts.hasSpouse && shotoku <= 9_000_000 ? 50_000 : 0) +
    (opts.d.general ?? 0) * 50_000 +
    (opts.d.specific ?? 0) * 180_000 +
    (opts.d.elderly ?? 0) * 100_000 +
    (opts.d.elderlyCohabiting ?? 0) * 130_000;
  const cpct = opts.designated ? 4 : 3;
  const cbase = kazei <= 2_000_000 ? Math.min(diff, kazei) : Math.max(diff - (kazei - 2_000_000), 50_000);
  const zei = Math.max(0, before - Math.floor((cbase * cpct) / 100));
  return { shotoku, kazei, zei };
}

const FAMILIES: Array<{ label: string; hasSpouse: boolean; d: Dependents }> = [
  { label: "単身", hasSpouse: false, d: {} },
  { label: "配偶者", hasSpouse: true, d: {} },
  { label: "配偶者+年少2", hasSpouse: true, d: { under16: 2 } },
  { label: "配偶者+特定1+一般1+年少1", hasSpouse: true, d: { specific: 1, general: 1, under16: 1 } },
  { label: "一般2", hasSpouse: false, d: { general: 2 } },
  { label: "同居老親1", hasSpouse: false, d: { elderlyCohabiting: 1 } },
];

const BOUNDARY_SALARIES = [
  0, 1, 650_000, 650_001, 1_100_000, 1_100_001, 1_899_999, 1_900_000, 1_900_001,
  2_199_999, 2_200_000, 2_203_999, 2_204_000, 3_599_999, 3_600_000, 3_600_001,
  5_436_629, 5_505_000, 6_543_200, 6_599_999, 6_600_000, 6_600_001,
  8_499_999, 8_500_000, 8_500_001, 12_000_000, 20_000_000, 29_999_999,
];

describe("8a独立検算 — 格子照合（境界値＋擬似乱択）", () => {
  const salaries = [...BOUNDARY_SALARIES];
  for (let s = 137_777; s <= 12_000_000; s += 244_444) salaries.push(s); // 擬似乱択（決定的）

  it("全組合せで検算者の独立計算と一致する", () => {
    let checked = 0;
    const mismatches: string[] = [];
    for (const salary of salaries) {
      for (const fam of FAMILIES) {
        for (const designated of [false, true]) {
          const shaho = Math.round(salary * 0.14);
          const input: ShotokuwariInput = {
            salary,
            socialInsurance: { kind: "actual", amount: shaho },
            hasSpouse: fam.hasSpouse,
            dependents: fam.d,
            isDesignatedCity: designated,
          };
          const est = estimateShotokuwari(input);
          const mine = myShotokuwari({ salary, shaho, hasSpouse: fam.hasSpouse, d: fam.d, designated });
          const mineMin = myShotokuwari({ salary, shaho, hasSpouse: fam.hasSpouse, d: fam.d, designated, extra: 70_000 });
          if (est.kind !== "estimated") {
            mismatches.push(`${salary}/${fam.label}/${designated}: unavailable ${est.reason}`);
            continue;
          }
          checked++;
          if (est.breakdown.salaryIncome !== mine.shotoku)
            mismatches.push(`${salary}/${fam.label}: 給与所得 ${est.breakdown.salaryIncome} != ${mine.shotoku}`);
          if (est.breakdown.taxableIncome !== mine.kazei)
            mismatches.push(`${salary}/${fam.label}: 課税所得 ${est.breakdown.taxableIncome} != ${mine.kazei}`);
          if (est.breakdown.shotokuwari !== mine.zei)
            mismatches.push(`${salary}/${fam.label}/${designated}: 所得割 ${est.breakdown.shotokuwari} != ${mine.zei}`);
          if (est.range.max !== mine.zei || est.range.min !== mineMin.zei)
            mismatches.push(`${salary}/${fam.label}/${designated}: range [${est.range.min},${est.range.max}] != [${mineMin.zei},${mine.zei}]`);
          const limit = myLimit(fam.hasSpouse, fam.d);
          if (shotokuwariNonTaxableLimit({ hasSpouse: fam.hasSpouse, dependents: fam.d }) !== limit)
            mismatches.push(`${fam.label}: 非課税限度額不一致`);
          if (est.isShotokuwariNonTaxable !== (mine.shotoku <= limit))
            mismatches.push(`${salary}/${fam.label}: 非課税判定不一致`);
        }
      }
    }
    expect(mismatches, mismatches.slice(0, 10).join("\n")).toEqual([]);
    expect(checked).toBeGreaterThan(600);
  });

  it("所得割の非課税限度額の境界（単身45万・給与収入110万相当）", () => {
    // 給与所得45万ちょうど → 収入110万（110万−65万=45万）。「以下」なので非課税
    expect(mySalaryIncome(1_100_000)).toBe(450_000);
    const at = estimateShotokuwari({
      salary: 1_100_000, socialInsurance: { kind: "actual", amount: 0 }, isDesignatedCity: false,
    });
    const over = estimateShotokuwari({
      salary: 1_100_001, socialInsurance: { kind: "actual", amount: 0 }, isDesignatedCity: false,
    });
    expect(at.kind === "estimated" && at.isShotokuwariNonTaxable).toBe(true);
    expect(over.kind === "estimated" && over.isShotokuwariNonTaxable).toBe(false);
  });

  it("900万超の配偶者加算の省略は、調整控除の5万円下限に吸収され数値影響がない（現実的な入力域）", () => {
    // 給与所得>900万 ⇒ 課税所得は概ね700万超 ⇒ 200万超の式で {diff−(kazei−200万)} は負 → 下限5万が効く。
    // 法定の加算（4万/2万）を入れても入れなくても base=5万 で同一。
    for (const salary of [11_000_000, 11_500_000, 12_000_000, 20_000_000]) {
      for (const designated of [false, true]) {
        const est = estimateShotokuwari({
          salary, socialInsurance: { kind: "actual", amount: Math.round(salary * 0.14) },
          hasSpouse: true, isDesignatedCity: designated,
        });
        expect(est.kind).toBe("estimated");
        if (est.kind !== "estimated") continue;
        expect(est.breakdown.chouseiKoujo).toBe(Math.floor((50_000 * (designated ? 4 : 3)) / 100));
      }
    }
  });

  it("配偶者特別控除・特定親族特別控除の対象は推計しない（解禁条件b）", () => {
    const base = { salary: 4_000_000, socialInsurance: { kind: "actual", amount: 600_000 } as const, isDesignatedCity: false };
    expect(estimateShotokuwari({ ...base, hasSpouseSpecialDeduction: true }).kind).toBe("unavailable");
    expect(estimateShotokuwari({ ...base, hasTokuteiShinzokuSpecialDeduction: true }).kind).toBe("unavailable");
  });
});

describe("8a独立検算 — 世帯合算（estimateHouseholdShotokuwari）", () => {
  const actual = (salary: number, amount: number): ShotokuwariInput => ({
    salary,
    socialInsurance: { kind: "actual", amount },
    isDesignatedCity: false,
  });

  it("共働き2人分は各人の所得割の単純合算になる（両者とも課税）", () => {
    const a = estimateShotokuwari(actual(4_000_000, 560_000));
    const b = estimateShotokuwari(actual(3_000_000, 420_000));
    const hh = estimateHouseholdShotokuwari([actual(4_000_000, 560_000), actual(3_000_000, 420_000)]);
    expect(hh.kind).toBe("estimated");
    if (hh.kind !== "estimated" || a.kind !== "estimated" || b.kind !== "estimated") return;
    expect(hh.total).toBe(a.breakdown.shotokuwari + b.breakdown.shotokuwari);
    expect(hh.range.min).toBe(a.range.min + b.range.min);
    expect(hh.range.max).toBe(a.range.max + b.range.max);
    expect(hh.allNonTaxable).toBe(false);
  });

  it("★所得割非課税の稼得者の寄与は0円★（機械計算値をそのまま足さない）", () => {
    // 年収110万（給与所得45万＝非課税限度ちょうど）・社保0 → 機械計算では課税所得2万×6%が出てしまうが、
    // 附則第3条の3により所得割は課されないので、合算への寄与は0円でなければならない
    const nonTaxable = actual(1_100_000, 0);
    const solo = estimateShotokuwari(nonTaxable);
    expect(solo.kind === "estimated" && solo.isShotokuwariNonTaxable).toBe(true);
    if (solo.kind !== "estimated") return;
    expect(solo.breakdown.shotokuwari).toBeGreaterThan(0); // 機械計算値は正（これを足してはいけない）

    const main = actual(4_000_000, 560_000);
    const mainSolo = estimateShotokuwari(main);
    const hh = estimateHouseholdShotokuwari([main, nonTaxable]);
    if (hh.kind !== "estimated" || mainSolo.kind !== "estimated") return;
    expect(hh.total).toBe(mainSolo.breakdown.shotokuwari);
    expect(hh.range.max).toBe(mainSolo.range.max);
    expect(hh.allNonTaxable).toBe(false);
    expect(hh.caveats.some((c) => c.includes("0円として合算"))).toBe(true);
  });

  it("全員が所得割非課税なら allNonTaxable（→UIは課税状況の見直しを促し、階層は出さない）", () => {
    const hh = estimateHouseholdShotokuwari([actual(1_000_000, 0), actual(900_000, 0)]);
    expect(hh.kind === "estimated" && hh.allNonTaxable).toBe(true);
    if (hh.kind !== "estimated") return;
    expect(hh.total).toBe(0);
  });

  it("片方が推計不可（配偶者特別控除）なら世帯全体が unavailable", () => {
    const hh = estimateHouseholdShotokuwari([
      actual(4_000_000, 560_000),
      { ...actual(1_500_000, 0), hasSpouseSpecialDeduction: true },
    ]);
    expect(hh.kind).toBe("unavailable");
  });
});
