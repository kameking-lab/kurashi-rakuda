/*
 * パートシフト収入計算（壁警告付き）（P2-T27）— 計算ロジック本体。
 * 仕様: specs/b-tools/p2-t27-part-shift-shunyuu-keisan.md
 *
 * ★車輪の再発明禁止★
 * 103/106/130/150万円等の壁の金額・税額計算式・社会保険の加入判定式は、
 * ここでは一切再実装しない。すべて @/lib/tools/impl/fuyo-kabe（Q3-18で検収済み）の
 * evaluateWalls / judgeShaho / judgeDependent / FuyoInput をそのまま呼び出す
 * 薄いラッパーであり、本ファイルが独自に持つ数値は「週52週」という単位換算の
 * 定数のみで、税・社会保険の壁の金額・料率は一切保持しない。
 *
 * data/seido/part-shift-shunyuu-kabe.json から、fuyo-kabe.ts ではカバーしていない
 * シフト制特有の実務情報（月次目安108,333円・106万円と130万円で収入の算入範囲が
 * 異なる点）を取り込む。詳細は spec の「fuyo-kabe.ts では扱っていない固有情報」節。
 */
import partShiftSeido from "@/data/seido/part-shift-shunyuu-kabe.json";
import {
  evaluateWalls,
  judgeDependent,
  judgeShaho,
  fuyoKabeDataset,
  type FuyoInput,
  type FuyoTarget,
  type EmployerSize,
  type WallResult,
  type DependentResult,
  type ShahoResult,
} from "@/lib/tools/impl/fuyo-kabe";
import type { SeidoDataset } from "@/lib/tools/seido";

export { fuyoKabeDataset };
export const partShiftKabeDataset = partShiftSeido as unknown as SeidoDataset;

const PS = partShiftSeido.data;

/**
 * シフト制の月々の収入管理の実務目安（130万円÷12を切り捨てた額）。
 * fuyo-kabe.ts / Q3-18のUIは年間の壁しか見せていないため、月次管理の視点を補う。
 * fuyou-kabe.json の130万円と同一の値・同一の出典であることを part-shift-shunyuu-kabe.json
 * 自身が明記している（二重管理ではなく同一値の別ファイル記載）。
 */
export const MONTHLY_DEPENDENT_GUIDE: number = PS.dependentCertificationMonthly.monthlyThreshold.value;
/** 106万円の壁の月額賃金基準（所定内賃金。通勤手当等は含まない）。表示用の参考値 */
export const MONTHLY_SHAHO_WAGE_THRESHOLD: number = PS.shortTimeWorkerRequirements.monthlyWage.value;
/** 106万円の壁の週の所定労働時間基準。表示用の参考値 */
export const WEEKLY_HOURS_THRESHOLD: number = PS.shortTimeWorkerRequirements.weeklyHours.value;

// ---------------------------------------------------------------- 型

export type IncomeMode = "shift" | "monthlyDirect";

export interface ShiftScheduleInput {
  mode: "shift";
  /** 時給（円） */
  hourlyWage: number;
  /** 週の勤務日数 */
  daysPerWeek: number;
  /** 1日の勤務時間 */
  hoursPerDay: number;
}

export interface MonthlyDirectInput {
  mode: "monthlyDirect";
  /** シフト表等から分かる、月の所定内賃金相当の収入（円）。通勤手当は含めない */
  monthlyIncome: number;
  /** 週の所定労働時間（106万円の壁の週20時間要件の判定に使用） */
  weeklyHoursForMonthlyMode: number;
}

export type IncomeSourceInput = ShiftScheduleInput | MonthlyDirectInput;

export interface PartShiftShunyuuInput {
  income: IncomeSourceInput;
  /** 月あたりの通勤手当等（円）。106万円の判定には含めず、130万円等の被扶養者認定には含める */
  commuteAllowanceMonthly: number;
  age: number;
  target: FuyoTarget;
  isStudent: boolean;
  employerSize: EmployerSize;
  overTwoMonths: boolean;
  supporterSalary?: number;
  sameHousehold: boolean;
  /** 試算の基準月（YYYY-MM）。2026-10以降は社保の賃金要件が撤廃される予定（fuyo-kabe.ts側の判定） */
  baseMonth: string;
}

export interface MonthlyIncomeBreakdown {
  /** 所定内賃金相当の月収（通勤手当等を含まない） */
  baseMonthly: number;
  /** 通勤手当等を含む月収 */
  totalMonthly: number;
  /** 週の所定労働時間（shiftモードはhoursPerDay×daysPerWeekから自動算出。monthlyDirectモードは入力値） */
  weeklyHours: number;
}

export interface PartShiftShunyuuResult {
  monthly: MonthlyIncomeBreakdown;
  /** 年収換算（所定内賃金ベース。106万円の壁・税の壁の判定に使用） */
  annualBase: number;
  /** 年収換算（通勤手当込み。130万円等の被扶養者認定の判定に使用） */
  annualTotal: number;
  /** fuyo-kabe.ts の evaluateWalls（annualBase基準）の結果。ただし「扶養から外れる年収」の行のみ annualTotal 基準の判定に上書き済み */
  walls: WallResult[];
  /** 106万円の壁の判定（fuyo-kabe.ts の judgeShaho, annualBase基準） */
  shaho: ShahoResult;
  /** 130万円等の壁の判定（fuyo-kabe.ts の judgeDependent, annualTotal基準） */
  dependent: DependentResult;
  /** 月次目安（108,333円）まで、通勤手当込みの月収であといくらか（負なら超過） */
  monthlyDependentRemaining: number;
  monthlyGuide: number;
  monthlyShahoWageThreshold: number;
}

export type CalcResult =
  | { ok: true; result: PartShiftShunyuuResult }
  | { ok: false; error: string };

// ---------------------------------------------------------------- 定数

/**
 * 年52週換算。1か月あたりの週数は4〜5週で変動するため、「週の収入×週の勤務日数」を
 * 月ごとに単純に12倍すると実態とズレる。年52週で年収を出し12で割って月あたりの
 * 平均を出す方式のほうが、月による凸凹を均せるため実態に近い（spec §1参照）。
 */
const WEEKS_PER_YEAR = 52;

// ---------------------------------------------------------------- 検証

export function validate(input: PartShiftShunyuuInput): string | null {
  const { income } = input;
  if (income.mode === "shift") {
    if (!Number.isFinite(income.hourlyWage) || income.hourlyWage <= 0) {
      return "時給は1円以上の数値で入力してください";
    }
    if (income.hourlyWage > 100_000) {
      return "時給が現実的な範囲を超えています（100,000円以下で入力してください）";
    }
    if (!Number.isFinite(income.daysPerWeek) || income.daysPerWeek <= 0) {
      return "週の勤務日数は1日以上の数値で入力してください";
    }
    if (income.daysPerWeek > 7) {
      return "週の勤務日数は7日以下で入力してください";
    }
    if (!Number.isFinite(income.hoursPerDay) || income.hoursPerDay <= 0) {
      return "1日の勤務時間は0より大きい数値で入力してください";
    }
    if (income.hoursPerDay > 24) {
      return "1日の勤務時間は24時間以下で入力してください";
    }
  } else {
    if (!Number.isFinite(income.monthlyIncome) || income.monthlyIncome < 0) {
      return "月収は0円以上の数値で入力してください";
    }
    if (income.monthlyIncome > 10_000_000) {
      return "月収が現実的な範囲を超えています";
    }
    if (!Number.isFinite(income.weeklyHoursForMonthlyMode) || income.weeklyHoursForMonthlyMode < 0) {
      return "週の所定労働時間は0以上の数値で入力してください";
    }
    if (income.weeklyHoursForMonthlyMode > 168) {
      return "週の所定労働時間が現実的な範囲を超えています";
    }
  }
  if (!Number.isFinite(input.commuteAllowanceMonthly) || input.commuteAllowanceMonthly < 0) {
    return "通勤手当は0円以上の数値で入力してください";
  }
  if (!Number.isFinite(input.age) || input.age <= 0 || input.age > 120) {
    return "年齢を正しく入力してください（1〜120歳）";
  }
  if (input.target === "spouse" && input.supporterSalary !== undefined) {
    if (!Number.isFinite(input.supporterSalary) || input.supporterSalary < 0) {
      return "配偶者の年間給与収入は0円以上の数値で入力してください";
    }
  }
  return null;
}

// ---------------------------------------------------------------- 月収→年収換算

/** shiftモード/monthlyDirectモードいずれでも使う週の所定労働時間 */
export function resolveWeeklyHours(income: IncomeSourceInput): number {
  return income.mode === "shift" ? income.hoursPerDay * income.daysPerWeek : income.weeklyHoursForMonthlyMode;
}

/**
 * 月収・年収の換算（換算式のみ。壁判定は行わない）。
 * annualBase: 通勤手当を含まない所定内賃金ベースの年収（106万円の壁・税の壁用）
 * annualTotal: 通勤手当を含む年収（130万円等の被扶養者認定用）
 */
export function computeMonthlyIncome(
  income: IncomeSourceInput,
  commuteAllowanceMonthly: number,
): MonthlyIncomeBreakdown {
  const annualBase =
    income.mode === "shift"
      ? income.hourlyWage * income.hoursPerDay * income.daysPerWeek * WEEKS_PER_YEAR
      : income.monthlyIncome * 12;
  const annualTotal = annualBase + commuteAllowanceMonthly * 12;

  return {
    baseMonthly: annualBase / 12,
    totalMonthly: annualTotal / 12,
    weeklyHours: resolveWeeklyHours(income),
  };
}

// ---------------------------------------------------------------- fuyo-kabe.ts への委譲

/**
 * walls配列のうち「扶養から外れる年収」の行だけ、通勤手当込みの年収（annualTotal）で
 * 判定しなおした結果に status を上書きする。
 * amount（しきい値）は年齢・扶養区分のみで決まり収入に依存しないため、上書き対象は
 * status（と、半分ルールに関する note）のみでよい。
 */
function withTotalIncomeDependentStatus(walls: WallResult[], dependent: DependentResult): WallResult[] {
  return walls.map((w) => {
    if (w.name !== "扶養から外れる年収") return w;
    return {
      ...w,
      status: dependent.isDependent ? "safe" : "crossed",
      note: dependent.failedHalfRule
        ? "同一世帯の場合、扶養する方の年収の2分の1未満であることも必要です（通勤手当等を含めて判定します）。"
        : "この金額「未満」であることが必要です（ちょうどの金額は扶養から外れます）。130万円の壁の判定には通勤手当・賞与など全ての収入を含みます。",
    };
  });
}

export function calculate(input: PartShiftShunyuuInput): CalcResult {
  const error = validate(input);
  if (error) return { ok: false, error };

  const monthly = computeMonthlyIncome(input.income, input.commuteAllowanceMonthly);
  const annualBase = Math.round(monthly.baseMonthly * 12);
  const annualTotal = Math.round(monthly.totalMonthly * 12);

  const baseFuyoInput: FuyoInput = {
    salary: annualBase,
    age: input.age,
    target: input.target,
    isStudent: input.isStudent,
    employerSize: input.employerSize,
    weeklyHours: monthly.weeklyHours,
    overTwoMonths: input.overTwoMonths,
    supporterSalary: input.supporterSalary,
    sameHousehold: input.sameHousehold,
    baseMonth: input.baseMonth,
  };
  const totalFuyoInput: FuyoInput = { ...baseFuyoInput, salary: annualTotal };

  const shaho = judgeShaho(baseFuyoInput);
  const dependent = judgeDependent(totalFuyoInput);
  const walls = withTotalIncomeDependentStatus(evaluateWalls(baseFuyoInput), dependent);

  const monthlyDependentRemaining = MONTHLY_DEPENDENT_GUIDE - monthly.totalMonthly;

  return {
    ok: true,
    result: {
      monthly,
      annualBase,
      annualTotal,
      walls,
      shaho,
      dependent,
      monthlyDependentRemaining,
      monthlyGuide: MONTHLY_DEPENDENT_GUIDE,
      monthlyShahoWageThreshold: MONTHLY_SHAHO_WAGE_THRESHOLD,
    },
  };
}
