/*
 * 扶養内⇄社保加入 損益分岐（P2-T04）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/16-fuyounai-shaho-songeki.md
 *
 * SSOT:
 *   - 社会保険料率・国民年金額: data/seido/fuyounai-shaho-songeki-bunkiten.json
 *   - 壁の金額（106万/130万）: data/seido/fuyou-kabe.json（Q3-18で検収済み）
 * いずれの金額・料率もコードに直書きせず import する。
 *
 * ★このツールの範囲（YMYL）★
 *   社会保険料の負担による「働き損」ゾーンと、手取りが元に戻る損益分岐点を示す。
 *   ★所得税・住民税・配偶者（特別）控除・家族手当は含めない★（税は別ツール fuyo-kabe が担当）。
 *   国民健康保険料はデータが自治体依存で null のため、130万の自分で加入するケースでは
 *   国民年金のみで試算し、国保が上乗せされる旨を明示する（捏造しない）。
 */
import seido from "@/data/seido/fuyounai-shaho-songeki-bunkiten.json";
import fuyoKabe from "@/data/seido/fuyou-kabe.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const fuyounaiShahoSongekiDataset = seido as unknown as SeidoDataset;
export const FUYOUNAI_SHAHO_DISCLAIMER = seido.disclaimer;

const CLIFF = seido.data.songekiStructure.cliff106;

/** 本人負担の合計料率（報酬月額＝年収に対する割合） */
export const BURDEN_RATE_UNDER40 = CLIFF.employeeBurdenRateUnder40.value; // 0.141
export const BURDEN_RATE_40_TO64 = CLIFF.employeeBurdenRate40to64.value; // 0.1491
/** 国民年金保険料（令和8年度・月額） */
export const KOKUMIN_NENKIN_MONTHLY = seido.data.insuranceRates.kokuminNenkinMonthly.value; // 17,920
export const KOKUMIN_NENKIN_ANNUAL = KOKUMIN_NENKIN_MONTHLY * 12;

/** 壁の金額（fuyou-kabe.json より） */
function wallAmount(key: string): number {
  const found = findWall(fuyoKabe.data, key);
  if (found == null) throw new Error(`wall not found: ${key}`);
  return found;
}
function findWall(node: unknown, key: string): number | null {
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findWall(x, key);
      if (r != null) return r;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.key === key && typeof obj.amount2026 === "number") return obj.amount2026;
    for (const v of Object.values(obj)) {
      const r = findWall(v, key);
      if (r != null) return r;
    }
  }
  return null;
}

export const WALL_106 = wallAmount("shaho-106"); // 1,060,000
export const WALL_130 = wallAmount("shaho-130"); // 1,300,000

export type Scenario = "join-shaho" | "self-insure";
export type AgeGroup = "under40" | "age40to64";

export function burdenRate(age: AgeGroup): number {
  return age === "under40" ? BURDEN_RATE_UNDER40 : BURDEN_RATE_40_TO64;
}

export interface FuyounaiShahoInput {
  scenario: Scenario;
  ageGroup: AgeGroup;
  /** 働いた場合に想定する年収（円） */
  targetIncome: number;
}

export interface FuyounaiShahoResult {
  ok: true;
  scenario: Scenario;
  wall: number;
  /** この年収で新たに発生する社会保険料（本人・年額） */
  socialInsurance: number;
  /** 社保料を引いた後の手取り（税は考慮しない） */
  takeHome: number;
  /** 壁のすぐ手前で働いたときの手取りの目安（＝壁の金額） */
  takeHomeJustBelowWall: number;
  /** 壁のすぐ手前と比べた手取りの差（マイナスなら働き損） */
  diffVsJustBelow: number;
  /** 手取りが壁手前の水準に戻る損益分岐点の年収 */
  breakEvenIncome: number;
  /** targetIncome が働き損ゾーン（壁〜損益分岐点）に入っているか */
  inLossZone: boolean;
  /** 国民健康保険料が別途上乗せされるか（self-insure のとき true） */
  kokuhoNotIncluded: boolean;
}

export type FuyounaiShahoCalcResult = FuyounaiShahoResult | { ok: false; error: string };

export function calcFuyounaiShaho(input: FuyounaiShahoInput): FuyounaiShahoCalcResult {
  if (!Number.isFinite(input.targetIncome) || input.targetIncome <= 0) {
    return { ok: false, error: "想定年収を入力してください。" };
  }

  if (input.scenario === "join-shaho") {
    const rate = burdenRate(input.ageGroup);
    const wall = WALL_106;
    const socialInsurance = Math.round(input.targetIncome * rate);
    const takeHome = input.targetIncome - socialInsurance;
    const takeHomeJustBelowWall = wall;
    const breakEvenIncome = Math.ceil(wall / (1 - rate));
    return {
      ok: true,
      scenario: input.scenario,
      wall,
      socialInsurance,
      takeHome,
      takeHomeJustBelowWall,
      diffVsJustBelow: takeHome - takeHomeJustBelowWall,
      breakEvenIncome,
      inLossZone: input.targetIncome >= wall && input.targetIncome < breakEvenIncome,
      kokuhoNotIncluded: false,
    };
  }

  // self-insure: 130万で扶養を外れ、勤務先の社保にも入れず自分で国民年金（＋国保）を負担
  const wall = WALL_130;
  const socialInsurance = KOKUMIN_NENKIN_ANNUAL; // 国保は自治体依存のため含めない
  const takeHome = input.targetIncome - socialInsurance;
  const takeHomeJustBelowWall = wall;
  const breakEvenIncome = wall + KOKUMIN_NENKIN_ANNUAL; // 国年のみで戻る年収（国保分さらに上）
  return {
    ok: true,
    scenario: input.scenario,
    wall,
    socialInsurance,
    takeHome,
    takeHomeJustBelowWall,
    diffVsJustBelow: takeHome - takeHomeJustBelowWall,
    breakEvenIncome,
    inLossZone: input.targetIncome >= wall && input.targetIncome < breakEvenIncome,
    kokuhoNotIncluded: true,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
