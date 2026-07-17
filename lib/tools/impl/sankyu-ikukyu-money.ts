/**
 * 産休育休まるごとお金シミュレーター の計算ロジック（specs/s-tools/03-sankyu-ikukyu-money.md）。
 *
 * すべての制度数値は data/seido/ikukyu-kyufu.json から読む。ここに数値を書かない。
 * （例外は「2」「3」「30」のような算術・暦法上の定数と、後述の DIVISOR / MONTHS）
 *
 * ★このファイルが守っている「罠」★（仕様書 §9.3）
 *   1. 母親の賃金日額の起算点は「産前休業開始日の前6か月」（育休開始前ではない）
 *   2. 産前期間の起算点は「出産の日（予定日後なら予定日）」。遅れた日数も産前に含む
 *   3. 支給単位期間は暦月ではない（休業開始応当日ベース）
 *   4. 80% は 67%＋13% の合算で最大28日限定。給付率が80%になったのではない
 *   5. 社保料免除は3歳未満まで。雇用保険の育休給付（原則1歳）と混同しない
 *   6. 出生後休業支援給付は減額されないが、育休給付が不支給なら連動して不支給
 *   7. 出産手当金の率は 0.6667 を乗じない。× 2 ÷ 3 の有理数で計算する
 *
 * ★8月1日の改定への追随★
 *   支給限度額は毎年8月1日に改定される。基準日が amendments の expiresOn を過ぎたら
 *   isDataExpired() が true になり、simulate() は金額を出さない（expired: true）。
 *   データを差し替えるだけで追随し、コード修正は不要。
 */

import seido from "@/data/seido/ikukyu-kyufu.json";
import { addDays, isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const ikukyuKyufuDataset = seido as unknown as SeidoDataset;

const D = seido.data;
const T = D.shussanTeateKin;
const I = D.shussanIkujiIchijikin;
const K = D.ikujiKyugyoKyufuKin;
const SJ = D.shusshoJiIkujiKyugyoKyufuKin;
const SG = D.shusshoGoKyugyoShienKyufuKin;
const M = D.shakaiHokenryoMenjo;

/**
 * 休業開始時賃金日額の算式に現れる定数。
 * 根拠: K.wageDailyFormula.value =「…直近6か月間に支払われた賃金の総額 ÷ 180」
 * 数値ノードが無いため const で持つが、データ側の文字列と一致することを
 * tests/sankyu-ikukyu-money.test.ts が固定している（データが変わればテストが落ちる）。
 */
const WAGE_BASE_MONTHS = 6;
const WAGE_BASE_DIVISOR = 180;

/**
 * 支給単位期間の支給日数の原則値。休業終了日を含む期間以外は暦日数に
 * かかわらず30日で計算する（K.monthlyMax67 の検算注記「16,110円×30日×67%」
 * が根拠。上限額・下限額も30日前提で公表されている）。
 */
export const NOMINAL_PERIOD_DAYS = 30;

// ---------------------------------------------------------------- 型

export type Role = "mother" | "father";
export type InsuredPeriod = "over12months" | "under12months" | "unknown";
export type HealthInsurance = "kyokai" | "kumiai" | "kyosai" | "kokuho" | "hifuyou";

/** 出生後休業支援給付・配偶者要件の例外7類型（SG.spouseRequirementExceptions.value のインデックス） */
export type SpouseException = "none" | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface SankyuInput {
  role: Role;
  /** 出産予定日（YYYY-MM-DD）。産前休業の起算点 */
  dueDate: string;
  /** 実際の出産日。未定なら null（予定日で試算する） */
  birthDate?: string | null;
  /** 子の数（単胎=1・双子=2…）。2以上で多胎（産前98日・一時金は児の数だけ） */
  babyCount: number;
  /** 産休前の月給（額面・賞与を含まない） */
  monthlySalary: number;
  /** 給与明細の社会保険料（健康保険＋厚生年金の本人負担・月額）。免除額の集計に使う */
  monthlyPremium: number;
  insuredPeriod: InsuredPeriod;
  healthInsurance: HealthInsurance;
  /** 育休の取得予定期間（月数） */
  leaveMonths: number;
  /** 同一の子について何回目の育休か */
  leaveCount: number;
  /** 配偶者が育休を取るか */
  spouseTakesLeave: boolean;
  /** 配偶者の出生後休業の日数 */
  spouseLeaveDays: number;
  /** 配偶者要件の例外に該当するか */
  spouseException: SpouseException;
  /** 産科医療補償制度の加入機関で出産するか */
  hasObstetricCompensation: boolean;
  /** 妊娠日数（流産・死産の場合の一時金の判定用）。未指定は通常の出産とみなす */
  pregnancyDays?: number;
  /** 一支給単位期間中に事業主から支払われる賃金（円）。就業しないなら0 */
  wagePerPeriod: number;
  /** 産後パパ育休の日数（role="father" のとき） */
  papaLeaveDays: number;
  /** 基準日（ISO）。データの有効期限判定に使う */
  today: string;
}

// ---------------------------------------------------------------- 暦

/** 2つの日付の差（日数）。to − from */
export function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 月を加算する。応当日が無い月は末日にクランプ（1/31 + 1か月 = 2/28） */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, last);
  return `${String(ny).padStart(4, "0")}-${String(nm + 1).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** YYYY-MM を返す */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function addMonthsToMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** 円未満を切り捨てる。浮動小数の誤差（0.67×483300 = 323811.00000000006 等）を吸収する */
function yenFloor(v: number): number {
  return Math.floor(v + 1e-6);
}

// ---------------------------------------------------------------- タイムライン

export interface Timeline {
  /** 産前休業の開始日（出産予定日から逆算） */
  prenatalStart: string;
  /** 産前休業の終了日＝出産日（実際の出産日が未定なら予定日） */
  prenatalEnd: string;
  prenatalDays: number;
  postnatalStart: string;
  postnatalEnd: string;
  postnatalDays: number;
  /** 母の育児休業の開始日（産後休業の翌日） */
  childcareLeaveStart: string;
  childcareLeaveEnd: string;
  /** 法令上の産前の起算点（出産の日。出産の日が予定日後なら予定日） */
  statutoryAnchor: string;
  /** 出産が予定日より遅れた日数（早まった場合は負） */
  delayDays: number;
}

/** 産前の支給期間（日数）。多胎は98日 */
export function prenatalPeriodDays(babyCount: number): number {
  return babyCount >= 2 ? T.periodBeforeBirthMultiple.value : T.periodBeforeBirth.value;
}

/**
 * ★罠2★ 産前期間の起算点。
 * 「出産の日（出産の日が出産の予定日後であるときは、出産の予定日）以前42日」
 * 出産が遅れれば起算点は予定日のままなので、遅れた日数も産前に含まれる。
 * 出産が早まれば起算点は出産の日になり、産前は短くなる。
 */
export function statutoryAnchor(dueDate: string, birthDate?: string | null): string {
  if (!birthDate) return dueDate;
  return birthDate > dueDate ? dueDate : birthDate;
}

export function buildTimeline(input: SankyuInput): Timeline {
  const birth = input.birthDate ?? input.dueDate;
  const anchor = statutoryAnchor(input.dueDate, input.birthDate);
  const p = prenatalPeriodDays(input.babyCount);

  // 産前休業は予定日から逆算して始める（実務）。法令上の起算点（anchor）以前 p 日と
  // 重なる範囲が支給対象になるため、開始日は両者の遅いほうになる。
  // 出産が早まった場合、anchor − (p−1) は予定日基準より前になるので予定日基準が残る。
  const byAnchor = addDays(anchor, -(p - 1));
  const byDue = addDays(input.dueDate, -(p - 1));
  const prenatalStart = byAnchor > byDue ? byAnchor : byDue;

  // 産前は出産の日まで（出産の日は産前に含む）
  const prenatalEnd = birth;
  const prenatalDays = Math.max(0, diffDays(prenatalStart, prenatalEnd) + 1);

  const postnatalStart = addDays(birth, 1);
  const postnatalDays = T.periodAfterBirth.value; // 多胎でも56日
  const postnatalEnd = addDays(birth, postnatalDays);

  // 母は産後休業（56日）が明けてから育児休業に入る。
  // 父には産休がないため、出生の翌日（産後パパ育休を取るならその明け）から入る。
  const childcareLeaveStart =
    input.role === "mother"
      ? addDays(postnatalEnd, 1)
      : addDays(birth, 1 + Math.max(0, input.papaLeaveDays));
  const childcareLeaveEnd = addDays(addMonths(childcareLeaveStart, input.leaveMonths), -1);

  return {
    prenatalStart,
    prenatalEnd,
    prenatalDays,
    postnatalStart,
    postnatalEnd,
    postnatalDays,
    childcareLeaveStart,
    childcareLeaveEnd,
    statutoryAnchor: anchor,
    delayDays: input.birthDate ? diffDays(input.dueDate, input.birthDate) : 0,
  };
}

// ---------------------------------------------------------------- 出産手当金

/**
 * 標準報酬日額（標準報酬月額の30分の1）。
 * 端数処理（健康保険法第99条第2項）: 5円未満切捨・5円以上10円未満は10円に切上。
 */
export function standardDailyWage(monthlyStandard: number): number {
  const v = monthlyStandard / 30;
  const base = Math.floor(v / 10) * 10;
  return v - base >= 5 ? base + 10 : base;
}

/**
 * 出産手当金の支給日額。
 * ★罠7★ rate.value（0.6667）は近似値。法令は「3分の2」なので × 2 ÷ 3 で計算する。
 * 端数処理: 50銭未満切捨・50銭以上1円未満は1円に切上。
 */
export function shussanTeateDailyAmount(monthlyStandard: number): number {
  const v = (standardDailyWage(monthlyStandard) * 2) / 3;
  const base = Math.floor(v);
  return v - base >= 0.5 ? base + 1 : base;
}

export interface ShussanTeateResult {
  eligible: boolean;
  /** 数値を出せないときは null（被保険者期間12か月未満は②の値が未収集） */
  dailyAmount: number | null;
  amount: number | null;
  days: number;
  reason: string;
}

/** 出産手当金は健康保険の被保険者本人が対象（国保・被扶養者は対象外） */
export function isShussanTeateCovered(hi: HealthInsurance): boolean {
  return hi === "kyokai" || hi === "kumiai";
}

export function calcShussanTeate(input: SankyuInput, tl: Timeline): ShussanTeateResult {
  const days = tl.prenatalDays + tl.postnatalDays;

  if (input.role === "father") {
    // 出産手当金は出産する被保険者本人（母）にのみ支給される。父の月給・加入区分では算定できない
    return {
      eligible: false,
      dailyAmount: null,
      amount: null,
      days,
      reason:
        "出産手当金は、出産のために仕事を休んだ健康保険の被保険者ご本人（お母さん）に支給される給付です。お父さんには支給されないため、この試算には含めていません。お母さんの分は、お母さんの勤務先・健康保険の条件で「お母さん」を選んで試算してください。",
    };
  }
  if (input.healthInsurance === "kyosai") {
    return {
      eligible: false,
      dailyAmount: null,
      amount: null,
      days,
      reason: "公務員の方は共済組合の制度が適用されます。本ツールの前提と異なるため金額を表示しません。",
    };
  }
  if (!isShussanTeateCovered(input.healthInsurance)) {
    return {
      eligible: false,
      dailyAmount: null,
      amount: null,
      days,
      reason:
        "出産手当金は健康保険の被保険者ご本人が対象です。国民健康保険の方・ご家族の被扶養者の方には支給されません（出産育児一時金は受け取れます）。",
    };
  }
  if (input.insuredPeriod !== "over12months") {
    // ★数値を出さない★ 被保険者期間12か月未満は「②前年度9月30日の全被保険者の
    // 標準報酬月額の平均」との比較が必要だが、その値が未収集（baseFormulaUnder12Months.note）
    return {
      eligible: true,
      dailyAmount: null,
      amount: null,
      days,
      reason:
        "被保険者期間が12か月に満たない場合、支給日額は「①これまでの標準報酬月額の平均」と「②前年度9月30日時点の全被保険者の標準報酬月額の平均」のいずれか少ない額をもとに決まります。②の額を本ツールは収録していないため、金額を表示しません。勤務先・加入している健康保険にご確認ください。",
    };
  }

  const daily = shussanTeateDailyAmount(input.monthlySalary);
  return {
    eligible: true,
    dailyAmount: daily,
    amount: daily * days,
    days,
    reason: "支給開始日以前の直近12か月の標準報酬月額の平均をもとに計算しています。",
  };
}

// ---------------------------------------------------------------- 出産育児一時金

export interface IchijikinResult {
  eligible: boolean;
  perChild: number;
  babyCount: number;
  amount: number;
  reason: string;
}

/** 一時金の支給要件の日数（85日）。eligibilityWeeks.value の文言から取る */
export const ICHIJIKIN_MIN_PREGNANCY_DAYS = Number(
  /(\d+)日/.exec(I.eligibilityWeeks.value)?.[1] ?? 0,
);

/** 妊娠85日（4か月）以降の生産・死産・流産・人工妊娠中絶が支給要件 */
export function isIchijikinEligible(pregnancyDays?: number): boolean {
  if (pregnancyDays === undefined) return true; // 通常の出産
  return pregnancyDays >= ICHIJIKIN_MIN_PREGNANCY_DAYS;
}

export function calcIchijikin(input: SankyuInput): IchijikinResult {
  const perChild = input.hasObstetricCompensation
    ? I.amount.value
    : I.amountWithoutCompensation.value;
  const count = Math.max(1, input.babyCount);

  if (!isIchijikinEligible(input.pregnancyDays)) {
    return {
      eligible: false,
      perChild,
      babyCount: count,
      amount: 0,
      reason: `出産育児一時金は${I.eligibilityWeeks.value}が対象です。`,
    };
  }
  return {
    eligible: true,
    perChild,
    babyCount: count,
    amount: perChild * count,
    reason: input.hasObstetricCompensation
      ? I.amount.label
      : I.amountWithoutCompensation.label,
  };
}

// ---------------------------------------------------------------- 休業開始時賃金日額

export interface WageBasePeriod {
  /** 6か月間の起算日 */
  from: string;
  /** 6か月間の末日 */
  to: string;
  /** 起算の基準になった休業（母は産前休業、父は育児休業） */
  basedOn: "prenatalLeave" | "childcareLeave";
}

/**
 * ★罠1（最頻出のバグ）★ 賃金日額の6か月の起算点。
 * 母親は育休開始前が産休中で賃金がないため、「産前休業開始日の前6か月」で見る。
 * 「育休開始前6か月」で計算すると賃金ゼロの月が入り、給付額が激減する。
 */
export function wageBasePeriod(input: SankyuInput, tl: Timeline): WageBasePeriod {
  const start = input.role === "mother" ? tl.prenatalStart : tl.childcareLeaveStart;
  return {
    from: addMonths(start, -WAGE_BASE_MONTHS),
    to: addDays(start, -1),
    basedOn: input.role === "mother" ? "prenatalLeave" : "childcareLeave",
  };
}

export interface WageDaily {
  /** クランプ前の賃金日額 */
  raw: number;
  /** 上下限でクランプした後の賃金日額（これで給付額を計算する） */
  value: number;
  atMax: boolean;
  atMin: boolean;
  max: number;
  min: number;
  basePeriod: WageBasePeriod;
}

/** 休業開始時賃金日額 = 直近6か月の賃金総額 ÷ 180。上限・下限でクランプする */
export function calcWageDaily(input: SankyuInput, tl: Timeline): WageDaily {
  const max = K.wageDailyMax.value;
  const min = K.wageDailyMin.value;
  const raw = (input.monthlySalary * WAGE_BASE_MONTHS) / WAGE_BASE_DIVISOR;
  const value = raw > max ? max : raw < min ? min : raw;
  return {
    raw,
    value,
    atMax: raw >= max,
    atMin: raw < min,
    max,
    min,
    basePeriod: wageBasePeriod(input, tl),
  };
}

/** 月給がいくらになると賃金日額が上限に達するか（＝上限 × 180 ÷ 6 = 上限 × 30） */
export function salaryAtWageDailyMax(): number {
  return (K.wageDailyMax.value * WAGE_BASE_DIVISOR) / WAGE_BASE_MONTHS;
}

// ---------------------------------------------------------------- 育児休業給付金

export type AdjustKind = "full" | "reduced" | "none";

export interface AdjustResult {
  kind: AdjustKind;
  amount: number;
}

/**
 * 就業して賃金が支払われた場合の調整（雇用保険法第61条の7第7項）。
 *   賃金 ÷ (W×日数) ≦ 13%（181日目以降30%） → 減額なし
 *   13%（30%）超〜80%未満                    → W×日数×80% − 賃金
 *   80%以上                                  → 不支給
 */
export function adjustByWage(
  base: number,
  wageBase: number,
  wage: number,
  after180: boolean,
): AdjustResult {
  if (wageBase <= 0) return { kind: "full", amount: base };
  const ratio = wage / wageBase;
  const noReduce = after180
    ? K.wageAdjustment.thresholdNoReductionAfter180.value
    : K.wageAdjustment.thresholdNoReduction.value;
  const zero = K.wageAdjustment.thresholdZero.value;

  if (ratio >= zero) return { kind: "none", amount: 0 };
  if (ratio <= noReduce + 1e-12) return { kind: "full", amount: base };
  return { kind: "reduced", amount: Math.max(0, yenFloor(wageBase * zero - wage)) };
}

/** 支給単位期間ごとの給付額。給付率の切替点をまたぐ期間は日数で按分する */
export function ikukyuAmountForDays(w: number, days: number, after180: boolean): number {
  const rate = after180 ? K.rateAfter180Days.value : K.rateFirst180Days.value;
  return yenFloor(w * days * rate);
}

export interface IkukyuPeriod {
  index: number;
  start: string;
  end: string;
  /** 支給日数。原則30日、休業終了日を含む期間のみ実日数（K.paymentDaysRule） */
  days: number;
  /** 給付率67%で計算した日数 */
  days67: number;
  /** 給付率50%で計算した日数 */
  days50: number;
  amount: number;
  adjust: AdjustKind;
}

export interface IkukyuResult {
  eligible: boolean;
  periods: IkukyuPeriod[];
  total: number;
  reason: string;
  /** 給付率の切替点（通算180日） */
  switchDays: number;
}

/**
 * ★罠3★ 支給単位期間は暦月ではない。
 * 休業開始応当日から翌月の応当日の前日まで（1/15開始なら1/15〜2/14）。
 */
export function buildSupportUnitPeriods(start: string, end: string): { start: string; end: string; days: number }[] {
  const out: { start: string; end: string; days: number }[] = [];
  let i = 0;
  let s = start;
  while (s <= end && i < 60) {
    const nominalEnd = addDays(addMonths(start, i + 1), -1);
    const e = nominalEnd > end ? end : nominalEnd;
    out.push({ start: s, end: e, days: diffDays(s, e) + 1 });
    s = addDays(e, 1);
    i += 1;
  }
  return out;
}

export function calcIkukyu(input: SankyuInput, tl: Timeline, w: WageDaily): IkukyuResult {
  const switchDays = K.rateSwitchDays.value;

  if (input.leaveCount > K.maxLeaveCount.value) {
    return {
      eligible: false,
      periods: [],
      total: 0,
      reason: `同一のお子さんについて育児休業給付が支給されるのは${K.maxLeaveCount.value}回までです。${input.leaveCount}回目は支給されません。`,
      switchDays,
    };
  }
  if (input.insuredPeriod === "under12months") {
    return {
      eligible: false,
      periods: [],
      total: 0,
      reason:
        "育児休業給付には「休業開始日前2年間に、賃金支払基礎日数11日以上の完全月が12か月以上」という要件があります。満たさない可能性がありますが、産休を取得した方には産前休業開始日を基準に判定する特例もあります。ハローワークにご確認ください。",
      switchDays,
    };
  }
  if (input.leaveMonths <= 0) {
    return { eligible: true, periods: [], total: 0, reason: "育児休業を取得しない前提で試算しています。", switchDays };
  }

  const raw = buildSupportUnitPeriods(tl.childcareLeaveStart, tl.childcareLeaveEnd);
  const periods: IkukyuPeriod[] = [];
  let cumulative = 0;
  let total = 0;

  raw.forEach((p, i) => {
    // ★支給日数は暦日数ではない★ 原則30日で固定し、休業終了日を含む
    // 最後の支給単位期間のみ実日数を使う（K.monthlyMax67 の検算注記
    // 「16,110円×30日×67%」と同じ規則）。暦日数（28〜31日）を使うと
    // 31日月で過大・2月で過小の系統誤差になる。
    const payDays = i === raw.length - 1 ? p.days : NOMINAL_PERIOD_DAYS;
    const days67 = Math.max(0, Math.min(payDays, switchDays - cumulative));
    const days50 = payDays - days67;
    cumulative += payDays;

    const base = ikukyuAmountForDays(w.value, days67, false) + ikukyuAmountForDays(w.value, days50, true);
    // 賃金の調整は支給単位期間ごと。切替点をまたぐ期間は 50% 側の閾値（30%）を使わず
    // 期間の大半を占める給付率で判定する（過半が181日目以降なら30%）
    const after180 = days50 > days67;
    const adj = adjustByWage(base, w.value * payDays, input.wagePerPeriod, after180);

    periods.push({
      index: i + 1,
      start: p.start,
      end: p.end,
      days: payDays,
      days67,
      days50,
      amount: adj.amount,
      adjust: adj.kind,
    });
    total += adj.amount;
  });

  return {
    eligible: true,
    periods,
    total,
    reason: `休業開始時賃金日額 ${w.value.toLocaleString("ja-JP")}円 × 支給日数 × 給付率（通算${switchDays}日目まで${Math.round(K.rateFirst180Days.value * 100)}%、${switchDays + 1}日目以降${Math.round(K.rateAfter180Days.value * 100)}%）で計算しています。`,
    switchDays,
  };
}

// ---------------------------------------------------------------- 出生後休業支援給付金

export const SPOUSE_EXCEPTIONS: readonly string[] = SG.spouseRequirementExceptions.value;

export interface ShusshoGoResult {
  eligible: boolean;
  days: number;
  amount: number;
  /** 本人の出生後休業が14日以上あるか */
  ownOk: boolean;
  /** 配偶者要件（14日以上、または例外7類型）を満たすか */
  spouseOk: boolean;
  reason: string;
}

/**
 * ★このツールの隠れた価値★
 * 配偶者が育休を取らなくても、例外7類型に該当すれば対象になる。
 * 判定時点は「子の出生日の翌日において」該当するか。
 */
export function isSpouseRequirementMet(input: SankyuInput): boolean {
  if (input.spouseException !== "none") return true;
  return input.spouseTakesLeave && input.spouseLeaveDays >= SG.spouseLeaveRequirement.value;
}

/** 本人の出生後休業の日数。母は産後休業が、父は産後パパ育休・育休が該当する */
export function ownPostBirthLeaveDays(input: SankyuInput, tl: Timeline): number {
  if (input.role === "mother") return tl.postnatalDays;
  return input.papaLeaveDays;
}

export function calcShusshoGo(
  input: SankyuInput,
  tl: Timeline,
  w: WageDaily,
  ikukyu: IkukyuResult,
): ShusshoGoResult {
  const maxDays = SG.maxDays.value;
  const ownDays = ownPostBirthLeaveDays(input, tl);
  const ownOk = ownDays >= SG.ownLeaveRequirement.value;
  const spouseOk = isSpouseRequirementMet(input);
  const days = Math.min(maxDays, ownDays);

  if (input.insuredPeriod === "under12months" || !ikukyu.eligible) {
    return {
      eligible: false,
      days: 0,
      amount: 0,
      ownOk,
      spouseOk,
      reason: "育児休業給付の受給要件を満たす方が対象です。",
    };
  }
  if (!ownOk) {
    return {
      eligible: false,
      days: 0,
      amount: 0,
      ownOk,
      spouseOk,
      reason: `ご本人の出生後休業が通算${SG.ownLeaveRequirement.value}日以上必要です。`,
    };
  }
  if (!spouseOk) {
    return {
      eligible: false,
      days: 0,
      amount: 0,
      ownOk,
      spouseOk,
      reason: `配偶者の方が、お子さんの出生日から8週間を経過する日の翌日までに通算${SG.spouseLeaveRequirement.value}日以上の休業をしていることが必要です。ただし次のいずれかに当てはまる場合は、配偶者の休業がなくても対象になります。`,
    };
  }

  // ★罠6★ 出生後休業支援給付は減額されない。ただし賃金が80%以上で育休給付が
  // 不支給になる場合は連動して不支給になる。
  const firstPeriod = ikukyu.periods[0];
  if (firstPeriod && firstPeriod.adjust === "none") {
    return {
      eligible: false,
      days: 0,
      amount: 0,
      ownOk,
      spouseOk,
      reason:
        "支払われる賃金が「休業開始時賃金日額 × 休業日数」の80%以上となり育児休業給付金が支給されないため、出生後休業支援給付金も支給されません。",
    };
  }

  return {
    eligible: true,
    days,
    amount: yenFloor(w.value * days * SG.rate.value),
    ownOk,
    spouseOk,
    reason: `休業開始時賃金日額 × ${days}日 × ${Math.round(SG.rate.value * 100)}%。育児休業給付金が減額される場合でも、この給付は減額されません。`,
  };
}

// ---------------------------------------------------------------- 出生時育児休業給付金（産後パパ育休）

export interface ShusshoJiResult {
  eligible: boolean;
  days: number;
  amount: number;
  /** その休業日数における就業日数の上限（比例縮小・切上） */
  workDaysLimit: number;
  /** 就業日数の上限を超える場合の就業時間の上限（比例縮小・端数処理なし） */
  workHoursLimit: number;
}

/** ★比例縮小★ 日数は切上、時間は端数処理なし（workDaysLimit.note） */
export function papaWorkLimits(leaveDays: number): { days: number; hours: number } {
  const maxDays = SJ.maxDays.value;
  const d = Math.min(leaveDays, maxDays);
  return {
    days: Math.ceil((SJ.workDaysLimit.value * d) / maxDays),
    hours: (K.workHoursLimit.value * d) / maxDays,
  };
}

export function calcShusshoJi(input: SankyuInput, w: WageDaily): ShusshoJiResult | null {
  if (input.role !== "father" || input.papaLeaveDays <= 0) return null;
  const days = Math.min(input.papaLeaveDays, SJ.maxDays.value);
  const limits = papaWorkLimits(input.papaLeaveDays);
  return {
    eligible: input.insuredPeriod !== "under12months",
    days,
    amount:
      input.insuredPeriod === "under12months" ? 0 : yenFloor(w.value * days * SJ.rate.value),
    workDaysLimit: limits.days,
    workHoursLimit: limits.hours,
  };
}

// ---------------------------------------------------------------- 社会保険料免除

/**
 * 免除される月（YYYY-MM）の一覧。
 * 原則: 開始日の属する月から、終了日の翌日が属する月の前月まで（＝月末時点で休業中）。
 * 育休のみ: 開始月と終了日翌日の属する月が同一でも、その月に14日以上取得していれば免除。
 */
export function menjoMonths(
  start: string,
  end: string,
  opts: { applyFourteenDayRule: boolean },
): string[] {
  if (end < start) return [];
  const startMonth = monthOf(start);
  const nextDayMonth = monthOf(addDays(end, 1));

  if (startMonth === nextDayMonth) {
    if (!opts.applyFourteenDayRule) return [];
    const days = diffDays(start, end) + 1;
    return days >= M.childcareLeave.fourteenDayRule.value ? [startMonth] : [];
  }

  const out: string[] = [];
  let m = startMonth;
  const last = addMonthsToMonth(nextDayMonth, -1);
  while (m <= last) {
    out.push(m);
    m = addMonthsToMonth(m, 1);
  }
  return out;
}

/** ★賞与保険料★ 育休が「連続した1か月を超える」場合のみ免除。1か月ちょうどは免除されない */
export function isBonusPremiumExempt(start: string, end: string, bonusMonth?: string): boolean {
  const oneMonthEnd = addDays(addMonths(start, 1), -1);
  if (!(end > oneMonthEnd)) return false;
  if (!bonusMonth) return true;
  // 賞与を支払った月の末日を含む必要がある
  const lastDayOfBonusMonth = addDays(addMonths(`${bonusMonth}-01`, 1), -1);
  return start <= lastDayOfBonusMonth && lastDayOfBonusMonth <= end;
}

export interface MenjoResult {
  maternityMonths: string[];
  childcareMonths: string[];
  totalMonths: number;
  /** 免除される保険料の概算（給与明細の月額が入力されているときのみ） */
  estimated: number | null;
}

export function calcMenjo(input: SankyuInput, tl: Timeline): MenjoResult {
  const maternityMonths =
    input.role === "mother"
      ? menjoMonths(tl.prenatalStart, tl.postnatalEnd, { applyFourteenDayRule: false })
      : [];
  const childcareMonths =
    input.leaveMonths > 0
      ? menjoMonths(tl.childcareLeaveStart, tl.childcareLeaveEnd, { applyFourteenDayRule: true })
      : [];
  const all = new Set([...maternityMonths, ...childcareMonths]);
  const totalMonths = all.size;
  return {
    maternityMonths,
    childcareMonths,
    totalMonths,
    estimated: input.monthlyPremium > 0 ? input.monthlyPremium * totalMonths : null,
  };
}

// ---------------------------------------------------------------- 総合

export interface SankyuResult {
  /** データの有効期限切れ（8月1日の改定を迎えた）。true のとき金額は出さない */
  expired: boolean;
  /** 共済組合（公務員）はスコープ外 */
  outOfScope: boolean;
  timeline: Timeline;
  wageDaily: WageDaily;
  shussanTeate: ShussanTeateResult;
  ichijikin: IchijikinResult;
  ikukyu: IkukyuResult;
  shusshoGo: ShusshoGoResult;
  shusshoJi: ShusshoJiResult | null;
  menjo: MenjoResult;
  /** 給付の合計（免除額は含まない）。出産手当金が算定できない場合は null */
  total: number | null;
  warnings: string[];
}

export function simulate(input: SankyuInput): SankyuResult {
  const expired = isDataExpired(ikukyuKyufuDataset, input.today);
  const tl = buildTimeline(input);
  const w = calcWageDaily(input, tl);
  const shussanTeate = calcShussanTeate(input, tl);
  const ichijikin = calcIchijikin(input);
  const ikukyu = calcIkukyu(input, tl, w);
  const shusshoGo = calcShusshoGo(input, tl, w, ikukyu);
  const shusshoJi = calcShusshoJi(input, w);
  const menjo = calcMenjo(input, tl);

  const warnings: string[] = [];
  if (w.atMax) {
    warnings.push(
      `休業開始時賃金日額が上限（${w.max.toLocaleString("ja-JP")}円）に達しています。給付は頭打ちになるため、「手取り10割」にはなりません。`,
    );
  }
  if (w.atMin) {
    warnings.push(
      `休業開始時賃金日額が下限（${w.min.toLocaleString("ja-JP")}円）に達しているため、下限額で計算しています。`,
    );
  }
  if (input.healthInsurance === "kumiai") {
    warnings.push(
      "加入されている健康保険組合が独自の付加給付を設けている場合があります。実際の支給額は組合にご確認ください。",
    );
  }
  if (input.healthInsurance === "kyosai") {
    warnings.push("公務員の方は共済組合の制度が適用されます。本ツールの結果は当てはまりません。");
  }
  if (tl.delayDays > 0) {
    warnings.push(
      `出産が予定日より${tl.delayDays}日遅れたため、その日数も産前の支給対象に含まれます（起算点が予定日になるため）。`,
    );
  }
  if (tl.delayDays < 0) {
    warnings.push(`出産が予定日より${-tl.delayDays}日早まったため、産前の期間は短くなります。`);
  }

  const partsTotal =
    (shussanTeate.amount ?? 0) + ichijikin.amount + ikukyu.total + shusshoGo.amount + (shusshoJi?.amount ?? 0);

  return {
    expired,
    outOfScope: input.healthInsurance === "kyosai",
    timeline: tl,
    wageDaily: w,
    shussanTeate,
    ichijikin,
    ikukyu,
    shusshoGo,
    shusshoJi,
    menjo,
    total: expired ? null : shussanTeate.amount === null && shussanTeate.eligible ? null : partsTotal,
    warnings,
  };
}

// ---------------------------------------------------------------- 表示用のデータ参照

/** 「手取り10割相当」の合計給付率（67%＋13%）。★給付率が80%になったのではない★ */
export const COMBINED_RATE = D.handoriJuwariSoutou.combinedRate.value;
/** 80%になるのは最大28日間のみ */
export const COMBINED_RATE_MAX_DAYS = SG.maxDays.value;
/** 社会保険料免除の対象範囲（3歳未満）。雇用保険の育休給付（原則1歳）とは異なる */
export const MENJO_TARGET_AGE = M.childcareLeave.targetAge.value;
export const RATE_FIRST = K.rateFirst180Days.value;
/** 出生後休業支援給付金の支給率（13%）。育休給付の上に「乗る」別の給付 */
export const RATE_SHUSSHO_GO = SG.rate.value;
export const RATE_AFTER = K.rateAfter180Days.value;
export const RATE_SWITCH_DAYS = K.rateSwitchDays.value;
export const WAGE_DAILY_MAX = K.wageDailyMax.value;
export const WAGE_DAILY_MIN = K.wageDailyMin.value;
