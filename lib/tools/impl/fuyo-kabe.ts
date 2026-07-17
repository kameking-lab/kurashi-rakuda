/**
 * 扶養の壁シミュレーター2026 の計算ロジック（specs/s-tools/02-fuyou-kabe-simu.md）。
 *
 * すべての制度数値は data/seido/fuyou-kabe.json から読む。ここに数値を書かない。
 * （唯一の例外は「2」「3」のような算術上の定数と、月数12）
 *
 * ★2026年（令和8年）分の要点★
 *   所得税の課税最低限は 178万円（給与所得控除74万 ＋ 基礎控除104万）。
 *   「103万円の壁」は令和8年分には存在しない。
 */

import seido from "@/data/seido/fuyou-kabe.json";
import kyuyoKoujo from "@/data/seido/kyuyo-shotoku-koujo.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const fuyoKabeDataset = seido as unknown as SeidoDataset;

const D = seido.data;
/** 給与所得控除の速算表（220万円超の解禁データ。2026-07-17 G3第2弾） */
const K = kyuyoKoujo.data;

// ---------------------------------------------------------------- 型

export type FuyoTarget = "spouse" | "parent" | "none";
export type EmployerSize = "51plus" | "under51" | "unknown";

export interface FuyoInput {
  /** 年間の給与収入（円・額面） */
  salary: number;
  /** 年齢（歳） */
  age: number;
  /** 誰の扶養に入っているか */
  target: FuyoTarget;
  /** 学生か（昼間部。夜間・通信・定時制は false 相当の扱い） */
  isStudent: boolean;
  /** 勤務先の厚生年金被保険者数 */
  employerSize: EmployerSize;
  /** 週の所定労働時間 */
  weeklyHours: number;
  /** 2か月を超えて使用される見込みか */
  overTwoMonths: boolean;
  /** 扶養者（配偶者）の年間給与収入。target="spouse" のとき使う */
  supporterSalary?: number;
  /** 同一世帯か（130万円の壁の2分の1要件） */
  sameHousehold: boolean;
  /** 試算の基準月（YYYY-MM）。2026-10 以降は社保の賃金要件が撤廃される */
  baseMonth: string;
}

export type WallStatus = "safe" | "crossed" | "unknown";

export interface WallResult {
  key: string;
  /** 表示名（2026年の実際の金額ベース） */
  name: string;
  amount: number | null;
  status: WallStatus;
  /** 超えると何が起きるか */
  effect: string;
  /** 「壁」ではなく「坂」か（超えても崖にならない） */
  isSlope: boolean;
  note?: string;
}

// ---------------------------------------------------------------- 給与所得

/**
 * 220万円以上の給与収入 → 給与所得（令和8・9年分）。
 * 根拠: kyuyo-shotoku-koujo.json の tableFY2026（速算表全域）と betsuhyou5.equivalenceRule
 * （2026-07-17 データ第2弾で解禁。従前は未収集のため null を返していた）。
 *
 * ★別表第五の罠★ 220万円以上660万円未満は、収入を4,000円単位に切り捨ててから
 * 速算表を適用する（所得税法第28条第4項・別表第五と完全一致することを
 * データ側が全1,100区分で機械照合済み）。660万円以上では切り捨ててはならない。
 */
function salaryIncomeOver220(salary: number): number | null {
  const rows = K.tableFY2026.rows;
  const noTruncateMin = 6_600_000; // 別表第五の適用上限（660万円以上は速算表を直接適用）
  const base =
    salary < noTruncateMin ? Math.floor(salary / K.betsuhyou5.granularity.value) * K.betsuhyou5.granularity.value : salary;

  for (const r of rows) {
    if (base >= r.incomeMin && (r.incomeMax === null || base <= r.incomeMax)) {
      if (r.deduction !== null) return base - r.deduction;
      // formula: "収入金額×30％＋80,000円" 等。★浮動小数を避け整数演算★
      const m = /×(\d+)％＋([\d,]+)円/.exec(r.formula);
      if (!m) return null; // 想定外の書式 → 推測しない
      const pct = Number(m[1]);
      const add = Number(m[2].replace(/,/g, ""));
      return Math.floor((base * (100 - pct)) / 100) - add;
    }
  }
  return null;
}

/**
 * 給与収入 → 給与所得（令和8・9年分）。
 * 220万円未満: data.kyuyoShotokuKoujo.specialTableFY2026to2027（措法29条の4第2項の特例表）
 * 220万円以上: kyuyo-shotoku-koujo.json の速算表（salaryIncomeOver220）
 * 出典: 国税庁「源泉所得税の改正のあらまし（令和8年4月）」・タックスアンサーNo.1410
 */
export function salaryIncome(salary: number): number | null {
  const rows = D.kyuyoShotokuKoujo.specialTableFY2026to2027.rows;
  const min = rows[0].incomeMin;
  const max = rows[rows.length - 1].incomeMax;

  if (salary < min) return 0;
  if (salary >= max) return salaryIncomeOver220(salary);

  for (const r of rows) {
    if (salary >= r.incomeMin && salary < r.incomeMax) {
      if (r.salaryIncome !== null) return r.salaryIncome; // 定額指定の行
      // formula: "その収入金額 − 74万円"
      return salary - D.kyuyoShotokuKoujo.minimumFY2026to2027.value;
    }
  }
  return null;
}

/** 給与所得控除の最低保障額（令和8・9年分＝74万円） */
export function kyuyoKoujoMinimum(): number {
  return D.kyuyoShotokuKoujo.minimumFY2026to2027.value;
}

// ---------------------------------------------------------------- 基礎控除

/**
 * 合計所得金額 → 基礎控除（令和8・9年分）。
 * 根拠: data.kisoKoujo.bracketsFY2026to2027.brackets
 * 出典: 国税庁あらまし／財務省「令和8年度税制改正の大綱の概要」
 *
 * ★注意★ brackets[0] は「合計所得489万円以下 → 104万円」。
 * 原典の表は132万円以下／132万円超336万円以下／336万円超489万円以下の3行が
 * 縦結合されており、いずれも104万円。大綱の「489万円以下である場合 42万円」が裏取り。
 */
export function kisoKoujo(totalIncome: number): number | null {
  for (const b of D.kisoKoujo.bracketsFY2026to2027.brackets) {
    if (b.totalIncomeMax === null) return null; // 2,350万円超は未収集
    if (totalIncome <= b.totalIncomeMax) return b.deduction;
  }
  return null;
}

/** 課税所得（所得税）。所得控除は基礎控除＋勤労学生控除のみを扱う */
export function taxableIncome(salary: number, opts: { isStudent: boolean }): number | null {
  const s = salaryIncome(salary);
  if (s === null) return null;
  const kiso = kisoKoujo(s);
  if (kiso === null) return null;

  let deductions = kiso;
  if (opts.isStudent && isKinroGakuseiEligible(salary)) {
    // 勤労学生控除の控除額（27万円）は未収集のため加算しない。
    // 所得要件の判定のみ行う（specs §4.1 / data.walls.items[5].note）。
    deductions += 0;
  }
  return Math.max(0, s - deductions);
}

/** 所得税の課税最低限（＝178万円）。給与所得控除の最低保障＋最大の基礎控除から導出 */
export function kazeiSaiteiGen(): number {
  const wall = D.walls.items.find((w) => w.key === "shotokuzei-honnin");
  return wall?.amount2026 ?? 0;
}

// ---------------------------------------------------------------- 税の壁

function wallAmount(key: string): number | null {
  return D.walls.items.find((w) => w.key === key)?.amount2026 ?? null;
}

export function isKinroGakuseiEligible(salary: number): boolean {
  const limit = wallAmount("kinrou-gakusei");
  return limit !== null && salary <= limit;
}

/** 扶養控除・配偶者控除の所得要件（給与136万円以下）を満たすか */
export function isFuyoKoujoEligible(salary: number): boolean {
  const limit = wallAmount("fuyou-koujo");
  return limit !== null && salary <= limit;
}

/**
 * 特定親族特別控除の額（19歳以上23歳未満の親族を扶養する側が受ける）。
 * 根拠: data.tokuteiShinzokuTokubetsuKoujo.rows
 */
export function tokuteiShinzokuKoujo(salary: number, age: number): number {
  if (age < 19 || age >= 23) return 0;
  for (const r of D.tokuteiShinzokuTokubetsuKoujo.rows) {
    if (salary > r.salaryMin && salary <= r.salaryMax) return r.deduction;
  }
  return 0;
}

/**
 * 配偶者特別控除の額。
 * 根拠: data.haiguushaTokubetsuKoujo（rows と incomeEarnerBrackets）
 * 所得者（扶養する側）の合計所得金額が1,000万円超なら適用なし。
 */
export function haiguushaTokubetsuKoujo(salary: number, supporterSalary: number): number {
  const supporterIncome = salaryIncome(supporterSalary);
  // 扶養者の給与所得が計算できない場合（速算表の想定外書式など）に備え、
  // incomeEarnerBrackets の salaryEquivalentMax でも判定できるようにしている。
  const brackets = D.haiguushaTokubetsuKoujo.incomeEarnerBrackets;
  let earnerIndex = -1;
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    const byIncome = supporterIncome !== null && supporterIncome <= b.max;
    const bySalary = supporterSalary <= b.salaryEquivalentMax;
    if (supporterIncome !== null ? byIncome : bySalary) {
      earnerIndex = i;
      break;
    }
  }
  if (earnerIndex === -1) return 0; // 所得者の合計所得1,000万円超 → 適用なし

  for (const r of D.haiguushaTokubetsuKoujo.rows) {
    if (salary > r.salaryMin && salary <= r.salaryMax) {
      return r.deductions[earnerIndex];
    }
  }
  return 0;
}

// ---------------------------------------------------------------- 社会保険

/**
 * 賃金要件（月額8.8万円）が有効か。
 * 2026年10月1日に撤廃される予定（data.amendments）。
 */
export function isWageRequirementActive(baseMonth: string): boolean {
  const a = seido.amendments.find(
    (x) => x.status === "scheduled" && x.summary.includes("賃金要件"),
  );
  if (!a?.effectiveFrom) return true;
  const abolishMonth = a.effectiveFrom.slice(0, 7);
  return baseMonth < abolishMonth;
}

export interface ShahoResult {
  /** 被用者保険に加入するか。unknown は企業規模不明 */
  enrolled: boolean | "unknown";
  reasons: string[];
  wageRequirementActive: boolean;
}

/**
 * 106万円の壁（被用者保険の適用拡大）の判定。
 * 根拠: data.socialInsurance.shortTimeWorker
 * 出典: 厚生年金保険法第12条第5号／日本年金機構
 *
 * ★「106万円」は法令上の数値ではない★ 法令は報酬月額8.8万円以上。
 * 判定は年収ではなく月額の所定内賃金で行う。
 */
export function judgeShaho(input: FuyoInput): ShahoResult {
  const st = D.socialInsurance.shortTimeWorker;
  const wageActive = isWageRequirementActive(input.baseMonth);
  const reasons: string[] = [];

  if (input.weeklyHours < st.weeklyHoursThreshold.value) {
    reasons.push(`週の所定労働時間が${st.weeklyHoursThreshold.value}時間未満のため対象外`);
    return { enrolled: false, reasons, wageRequirementActive: wageActive };
  }
  if (input.isStudent) {
    reasons.push("学生のため対象外（夜間・通信・定時制は対象になります）");
    return { enrolled: false, reasons, wageRequirementActive: wageActive };
  }
  if (!input.overTwoMonths) {
    reasons.push("2か月を超える雇用の見込みがないため対象外");
    return { enrolled: false, reasons, wageRequirementActive: wageActive };
  }
  if (wageActive) {
    const monthly = input.salary / 12;
    if (monthly < st.monthlyWageThreshold.value) {
      reasons.push(
        `所定内賃金の月額が${st.monthlyWageThreshold.value.toLocaleString("ja-JP")}円未満のため対象外`,
      );
      return { enrolled: false, reasons, wageRequirementActive: wageActive };
    }
  } else {
    reasons.push("2026年10月に賃金要件が撤廃される予定のため、月額賃金は判定に使いません");
  }

  if (input.employerSize === "under51") {
    reasons.push(`勤務先の被保険者数が${st.employerSizeThreshold.value}人未満のため対象外`);
    return { enrolled: false, reasons, wageRequirementActive: wageActive };
  }
  if (input.employerSize === "unknown") {
    reasons.push("勤務先の従業員数によって結果が変わります");
    return { enrolled: "unknown", reasons, wageRequirementActive: wageActive };
  }

  reasons.push("週20時間以上・企業規模51人以上などの要件を満たすため加入対象");
  return { enrolled: true, reasons, wageRequirementActive: wageActive };
}

/**
 * 130万円の壁（健康保険の被扶養者認定）の判定基準額。
 * 根拠: data.socialInsurance.dependentCertification
 * 19歳以上23歳未満（配偶者を除く）は150万円、60歳以上・障害者は180万円。
 */
export function dependentThreshold(age: number, target: FuyoTarget): number {
  const dc = D.socialInsurance.dependentCertification;
  if (age >= 60) return dc.annualIncomeThresholdElderlyOrDisabled.value;
  if (age >= 19 && age < 23 && target !== "spouse") {
    return dc.annualIncomeThreshold19to22.value;
  }
  return dc.annualIncomeThreshold.value;
}

export interface DependentResult {
  isDependent: boolean;
  threshold: number;
  /** 同一世帯の2分の1要件で外れたか */
  failedHalfRule: boolean;
}

export function judgeDependent(input: FuyoInput): DependentResult {
  const threshold = dependentThreshold(input.age, input.target);
  // 「130万円未満」＝ ちょうどはアウト
  let isDependent = input.salary < threshold;
  let failedHalfRule = false;

  if (isDependent && input.sameHousehold && input.supporterSalary !== undefined) {
    if (input.salary >= input.supporterSalary / 2) {
      isDependent = false;
      failedHalfRule = true;
    }
  }
  return { isDependent, threshold, failedHalfRule };
}

// ---------------------------------------------------------------- 手取り概算

/**
 * 社会保険に加入した場合の本人負担（概算）。
 * 根拠: data.insuranceRates
 *
 * ★概算である理由★
 *   - 標準報酬月額表が未収集のため、月額賃金へ直接乗じている
 *   - 健康保険料率は全国平均（都道府県別47件は未収集）
 *   いずれも queue/hoikuryo-backlog.md §8。
 *
 * ★子ども・子育て支援金（令和8年4月新設）を必ず含めること★
 *   見落とすと社保加入後の手取りを過大評価する。
 */
export function socialInsurancePremium(salary: number): number {
  const r = D.insuranceRates;
  const rate =
    r.employeesPensionRate.value / 2 +
    r.healthInsuranceRateAverage.value / 2 +
    r.childcareSupportRate.value / 2 +
    r.employmentInsuranceRateWorker.value;
  return Math.round(salary * rate);
}

// ---------------------------------------------------------------- 壁の一覧

/**
 * 入力に対して、関係する「壁」の一覧と現在地を返す。
 * 表示順は金額の小さい順（＝越えていく順）。
 */
export function evaluateWalls(input: FuyoInput): WallResult[] {
  const out: WallResult[] = [];
  const items = D.walls.items;

  const find = (key: string) => items.find((w) => w.key === key)!;

  // 住民税（確定値を出さない）
  const juuminzei = find("juuminzei");
  out.push({
    key: juuminzei.key,
    name: "住民税がかかり始める年収",
    amount: null,
    status: "unknown",
    effect: juuminzei.effect,
    isSlope: false,
    note: "お住まいの市区町村により異なります（おおむね100万円台前半）。正確な金額は市区町村にご確認ください。",
  });

  // 扶養控除・配偶者控除（136万円）
  if (input.target !== "none") {
    const w = find("fuyou-koujo");
    out.push({
      key: w.key,
      name: input.target === "spouse" ? "配偶者控除の壁" : "扶養控除の壁",
      amount: w.amount2026,
      status: isFuyoKoujoEligible(input.salary) ? "safe" : "crossed",
      effect: w.effect,
      isSlope: false,
      note:
        input.target === "spouse"
          ? "超えても配偶者特別控除に切り替わり、控除額はなだらかに減ります。"
          : "19歳以上23歳未満の方は特定親族特別控除に切り替わります。",
    });
  }

  // 勤労学生（163万円）
  if (input.isStudent) {
    const w = find("kinrou-gakusei");
    out.push({
      key: w.key,
      name: "勤労学生控除の壁",
      amount: w.amount2026,
      status: isKinroGakuseiEligible(input.salary) ? "safe" : "crossed",
      effect: w.effect,
      isSlope: false,
    });
  }

  // 所得税（178万円）— 主役
  const shotoku = find("shotokuzei-honnin");
  out.push({
    key: shotoku.key,
    name: "自分に所得税がかかり始める年収",
    amount: shotoku.amount2026,
    status: input.salary <= (shotoku.amount2026 ?? Infinity) ? "safe" : "crossed",
    effect: shotoku.effect,
    isSlope: false,
    note: "2026年（令和8年）分の課税最低限です。給与所得控除74万円＋基礎控除104万円。",
  });

  // 特定親族特別控除（197万円）
  if (input.target === "parent" && input.age >= 19 && input.age < 23) {
    const w = find("tokutei-shinzoku");
    out.push({
      key: w.key,
      name: "特定親族特別控除がなくなる年収",
      amount: w.amount2026,
      status: input.salary <= (w.amount2026 ?? Infinity) ? "safe" : "crossed",
      effect: w.effect,
      isSlope: true,
      note: "控除額は63万円から段階的に減るため、手取りが逆転する崖にはなりません。",
    });
  }

  // 配偶者特別控除（207万円）
  if (input.target === "spouse") {
    const w = find("haiguusha-tokubetsu");
    out.push({
      key: w.key,
      name: "配偶者特別控除がなくなる年収",
      amount: w.amount2026,
      status: input.salary <= (w.amount2026 ?? Infinity) ? "safe" : "crossed",
      effect: w.effect,
      isSlope: true,
      note: "控除額は38万円から段階的に減るため、手取りが逆転する崖にはなりません。",
    });
  }

  // 社会保険（106万・130万・150万）
  const shaho = judgeShaho(input);
  const w106 = find("shaho-106");
  out.push({
    key: w106.key,
    name: shaho.wageRequirementActive
      ? "勤務先の社会保険に入る年収（106万円の壁）"
      : "勤務先の社会保険に入る条件（賃金要件は撤廃予定）",
    amount: shaho.wageRequirementActive ? w106.amount2026 : null,
    status: shaho.enrolled === "unknown" ? "unknown" : shaho.enrolled ? "crossed" : "safe",
    effect: w106.effect,
    isSlope: false,
    note: shaho.reasons.join("／"),
  });

  const dep = judgeDependent(input);
  const depWall = dep.threshold === find("shaho-150").amount2026 ? find("shaho-150") : find("shaho-130");
  out.push({
    key: depWall.key,
    name: "扶養から外れる年収",
    amount: dep.threshold,
    status: dep.isDependent ? "safe" : "crossed",
    effect: depWall.effect,
    isSlope: false,
    note: dep.failedHalfRule
      ? "同一世帯の場合、扶養する方の年収の2分の1未満であることも必要です。"
      : "この金額「未満」であることが必要です（ちょうどの金額は扶養から外れます）。",
  });

  return out.sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
}

// ---------------------------------------------------------------- 総合結果

export interface FuyoResult {
  salaryIncome: number | null;
  kisoKoujo: number | null;
  taxableIncome: number | null;
  /** 基礎控除の区分外（合計所得2,350万円超）等で課税所得を計算できない */
  outOfRange: boolean;
  walls: WallResult[];
  shaho: ShahoResult;
  dependent: DependentResult;
  /** 社保に加入した場合の本人負担（概算） */
  premium: number;
  spouseDeduction: number;
  parentDeduction: number;
}

export function simulate(input: FuyoInput): FuyoResult {
  const s = salaryIncome(input.salary);
  // 220万円以上は2026-07-17に解禁済み。残る計算不能域は合計所得2,350万円超（基礎控除が未収集）のみ
  const outOfRange = s === null || kisoKoujo(s) === null;
  return {
    salaryIncome: s,
    kisoKoujo: s === null ? null : kisoKoujo(s),
    taxableIncome: taxableIncome(input.salary, { isStudent: input.isStudent }),
    outOfRange,
    walls: evaluateWalls(input),
    shaho: judgeShaho(input),
    dependent: judgeDependent(input),
    premium: socialInsurancePremium(input.salary),
    spouseDeduction:
      input.target === "spouse" && input.supporterSalary !== undefined
        ? haiguushaTokubetsuKoujo(input.salary, input.supporterSalary)
        : 0,
    parentDeduction:
      input.target === "parent" ? tokuteiShinzokuKoujo(input.salary, input.age) : 0,
  };
}
