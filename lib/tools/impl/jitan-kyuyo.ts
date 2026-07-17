/**
 * 時短勤務の給料・育児時短就業給付シミュレーター の計算ロジック
 * （specs/s-tools/04-jitan-kinmu-simu.md）。
 *
 * すべての制度数値は data/seido/ikukyu-kyufu.json と data/seido/fuyou-kabe.json から読む。
 * ここに数値を書かない（例外は「2」「100」「1000」のような算術・百分率上の定数と月数12）。
 *
 * ★このファイルが守っている「罠」★（仕様書 §9）
 *   1. 区分②（賃金が開始時賃金月額の90%超100%未満）は「調整後の支給率」の算式が未確認。
 *      10%を掛ける暫定実装は禁止（逓減後は必ず10%未満のため過大表示になる）。金額を出さない。
 *   2. 根拠条文は雇用保険法第61条の12。★ひとつ手前の条番号は給付制限の準用規定であり別物★
 *      なので取り違えないこと（J.rate.note）。条番号の取り違えは信頼性を直撃するため、
 *      tests/jitan-kyuyo.test.ts が実装・UI に誤った条番号が現れないことを機械的に固定している。
 *   3. 対象は2歳未満の子。時短の程度に上限・下限はない（「1日6時間でないと対象外」は誤り）。
 *   4. 浮動小数の罠: 24110 × 0.1 = 2410.9999… で最低限度額の境界判定が壊れる。
 *      支給率を千分率の整数に直してから整数演算する。90%の比較も整数比較にする。
 *   5. 社会保険料は時短で下がった賃金では即座に下がらない（随時改定・みなし措置）。
 *      ただし随時改定の要件もみなし措置も data/seido に未収録のため、時期・月数を断定しない。
 *   6. 子ども・子育て支援金 0.23%（令和8年4月新設）を手取りから必ず引く。外すと過大評価。
 *   7. 雇用保険料の算定基礎は実際に支払われた賃金。社会保険料の算定基礎（標準報酬月額）と違う。
 *   8. 時短就業中の社会保険料は免除されない（免除は産前産後休業・育児休業等の期間）。
 *
 * ★8月1日の改定への追随★
 *   支給限度額・最低限度額は毎年8月1日に改定される。基準日（または育児時短就業の開始日）が
 *   amendments の expiresOn を過ぎたら isDataExpired() が true になり、simulate() は金額を
 *   出さない（expired: true）。data/seido/ikukyu-kyufu.json を差し替えるだけで追随し、
 *   コード修正は不要。
 */

import ikukyu from "@/data/seido/ikukyu-kyufu.json";
import fuyou from "@/data/seido/fuyou-kabe.json";
import { isDataExpired, type SeidoDataset } from "@/lib/tools/seido";
import { addMonths, diffDays } from "@/lib/tools/impl/sankyu-ikukyu-money";

export const ikukyuKyufuDataset = ikukyu as unknown as SeidoDataset;
export const fuyoKabeDataset = fuyou as unknown as SeidoDataset;

/** 育児時短就業給付金（雇用保険法第61条の12）の制度データ */
const J = ikukyu.data.ikujiJitanShugyoKyufuKin;
/** 保険料率（令和8年度） */
const R = fuyou.data.insuranceRates;

// ---------------------------------------------------------------- 制度定数（すべてデータ由来）

/** 支給率（原則10%）。根拠: J.rate.value ／ 雇用保険法第61条の12 */
export const RATE = J.rate.value;
/** 支給限度額。根拠: J.supportLimit.value（★令和8年7月31日までの額★） */
export const SUPPORT_LIMIT = J.supportLimit.value;
/** 最低限度額。根拠: J.minimumAmount.value（★令和8年7月31日までの額★） */
export const MINIMUM_AMOUNT = J.minimumAmount.value;
/** 対象となる子の年齢の上限（未満）。根拠: J.targetChildAgeYears.value */
export const TARGET_CHILD_AGE_YEARS = J.targetChildAgeYears.value;
/** 各月の支給要件（4つ）。根拠: J.monthlyEligibility.value */
export const MONTHLY_ELIGIBILITY: readonly string[] = J.monthlyEligibility.value;
/** 時短の程度の要件（＝上限・下限はない）。根拠: J.noMinimumReduction.value */
export const NO_MINIMUM_REDUCTION = J.noMinimumReduction.value;

const RULES = J.calculationRules.rules;

/**
 * ★浮動小数の罠の回避★ 支給率を千分率の整数にする（0.1 → 100）。
 * Math.floor(Wm * 0.1) は Wm = 24,110 で 2,410 になり得る（0.1 は2進数で表現できない）。
 * 最低限度額の境界（2,411円ちょうどは不支給）が1円差で壊れるため、整数乗算してから割る。
 */
const RATE_PER_MILLE = Math.round(RATE * 1000);

/** 文字列から百分率の数値を取り出す（"… × 90%" → [90]） */
function percentsIn(text: string): number[] {
  return [...text.matchAll(/(\d+)\s*[%％]/g)].map((m) => Number(m[1]));
}

/**
 * 区分①の上端（＝開始時賃金月額の何%か）。
 * 根拠: RULES[0].case「支給対象月の賃金額 ≦ 育児時短就業開始時賃金月額 × 90%」
 * ★数値をコードに書かず、データの文言から取り出す★
 */
export const LOWER_PERCENT = percentsIn(RULES[0].case)[0];
/**
 * 区分②の上端（＝100%）。
 * 根拠: RULES[1].case「育児時短就業開始時賃金月額 × 90% < 賃金額 < 同 × 100%」
 */
export const UPPER_PERCENT = percentsIn(RULES[1].case)[percentsIn(RULES[1].case).length - 1];

/** 入力の上限（仕様書 §3）。制度の数値ではなく入力バリデーションの都合 */
export const MAX_WAGE_INPUT = 3_000_000;
/** 「引き続き」と扱う育児休業終了日からの日数（14日以内）。根拠: J.eligibility.note */
export const CONTINUED_WITHIN_DAYS = Number(/(\d+)日以内/.exec(J.eligibility.note)?.[1] ?? 0);

// ---------------------------------------------------------------- 型

export type InputMode = "direct" | "byHours";
export type InsuredMonths12 = "yes" | "no" | "unknown";

export interface JitanInput {
  /** 育児時短就業開始時賃金月額（時短前の月給・賞与を含まない） */
  wageMonthBefore: number;
  /** 時短後の1か月の賃金（inputMode="byHours" のときは時間比例で上書きされる） */
  wageMonthAfter: number;
  inputMode: InputMode;
  /** 時短前の週所定労働時間 */
  weeklyHoursBefore: number;
  /** 時短後の週所定労働時間 */
  weeklyHoursAfter: number;
  /** 子の生年月日（YYYY-MM-DD） */
  childBirthDate: string;
  /** 育児時短就業の開始日（YYYY-MM-DD） */
  jitanStartDate: string;
  /** 育児休業から引き続き時短を開始したか */
  continuedFromIkukyu: boolean;
  /** 育児休業の終了日。入力があれば「引き続き」かを14日ルールで判定する */
  ikukyuEndDate?: string | null;
  /** 開始日前2年に賃金支払基礎日数11日以上の完全月が12か月あるか */
  insuredMonths12: InsuredMonths12;
  /** その月に育児休業給付／介護休業給付を受給しているか */
  receivingOtherBenefit: boolean;
  /** 高年齢雇用継続給付の受給対象か */
  koureishaKeizoku: boolean;
  /** 支給対象月の初日から末日まで被保険者か */
  insuredWholeMonth: boolean;
  /** 都道府県。★計算には使わない★（都道府県別料率が未収集のため注記の出し分けのみ） */
  prefecture?: string | null;
  /** 基準日（ISO）。データの有効期限判定に使う */
  today: string;
}

/** 支給額の区分（J.calculationRules.rules に対応） */
export type Kubun =
  /** 区分① 賃金 ≦ 開始時賃金月額 × 90% → 賃金 × 10% */
  | "rule1"
  /** 区分② 90% < 賃金 < 100% → ★調整後の支給率が未確認のため金額を出さない★ */
  | "rule2"
  /** 賃金が減っていない（区分外。rules に定めがない） */
  | "noReduction";

export type BenefitKind =
  /** 金額を提示できる */
  | "paid"
  /** 不支給と言い切れる（最低限度額以下・各月要件を満たさない） */
  | "notPaid"
  /** 制度の対象にはなるが、本ツールでは金額を算定できない（要確認） */
  | "undeterminable"
  /** 制度の対象外 */
  | "notEligible";

export interface BenefitResult {
  kind: BenefitKind;
  kubun: Kubun;
  /** 支給額。kind="paid" 以外は null（★推測値を入れない★） */
  amount: number | null;
  /** 支給限度額により減額されたか */
  capped: boolean;
  /** 区分①の上端（開始時賃金月額 × 90%）。丸めない */
  threshold: number;
  /** 利用者に見せる説明 */
  reason: string;
}

// ---------------------------------------------------------------- 端数処理

/** 円未満を切り捨てる。★data/seido に端数処理の根拠はなく、本ツールの仮定★（§9.1） */
function yenFloor(v: number): number {
  return Math.floor(v + 1e-6);
}

// ---------------------------------------------------------------- バリデーション

export interface ValidationError {
  field: keyof JitanInput | "weeklyHours";
  message: string;
}

export function validate(input: JitanInput): ValidationError[] {
  const e: ValidationError[] = [];
  const w0 = input.wageMonthBefore;
  const wm = derivedWageAfter(input);

  if (!Number.isFinite(w0) || w0 <= 0) {
    e.push({ field: "wageMonthBefore", message: "時短を始める前の月給を入力してください。" });
  } else if (w0 > MAX_WAGE_INPUT) {
    e.push({
      field: "wageMonthBefore",
      message: `時短を始める前の月給は ${MAX_WAGE_INPUT.toLocaleString("ja-JP")} 円までで入力してください。`,
    });
  }
  if (!Number.isFinite(wm) || wm < 0) {
    e.push({ field: "wageMonthAfter", message: "時短後の月給は0円以上で入力してください。" });
  } else if (Number.isFinite(w0) && w0 > 0 && wm > w0 * 3) {
    e.push({
      field: "wageMonthAfter",
      message: "時短後の月給が、時短を始める前の月給の3倍を超えています。入力をご確認ください。",
    });
  }
  if (input.inputMode === "byHours") {
    if (!(input.weeklyHoursBefore > 0) || input.weeklyHoursBefore > 80) {
      e.push({ field: "weeklyHours", message: "時短前の週の所定労働時間を入力してください。" });
    } else if (!(input.weeklyHoursAfter > 0) || input.weeklyHoursAfter > input.weeklyHoursBefore) {
      e.push({
        field: "weeklyHours",
        message: "時短後の週の所定労働時間は、時短前の時間以下で入力してください。",
      });
    }
  }
  if (!input.childBirthDate) {
    e.push({ field: "childBirthDate", message: "お子さんの生年月日を入力してください。" });
  }
  if (!input.jitanStartDate) {
    e.push({ field: "jitanStartDate", message: "育児時短就業の開始日を入力してください。" });
  }
  if (input.childBirthDate && input.jitanStartDate && input.jitanStartDate < input.childBirthDate) {
    e.push({
      field: "jitanStartDate",
      message: "育児時短就業の開始日は、お子さんの生年月日より後の日付を入力してください。",
    });
  }
  return e;
}

// ---------------------------------------------------------------- 時短後の賃金

/**
 * ★時間比例は法令の算式ではない★（§9.3）
 * inputMode="byHours" のときの入力補助。実際の賃金は基本給・手当の設計で決まる。
 */
export function wageByHours(wageBefore: number, hoursBefore: number, hoursAfter: number): number {
  if (!(hoursBefore > 0)) return 0;
  return yenFloor((wageBefore * hoursAfter) / hoursBefore);
}

/** 実際に計算に使う「時短後の1か月の賃金」 */
export function derivedWageAfter(input: JitanInput): number {
  return input.inputMode === "byHours"
    ? wageByHours(input.wageMonthBefore, input.weeklyHoursBefore, input.weeklyHoursAfter)
    : input.wageMonthAfter;
}

// ---------------------------------------------------------------- 制度要件

/**
 * 子が2歳に達していないか（E1）。
 * 根拠: J.targetChildAge.value =「2歳に満たない子」／J.targetChildAgeYears.value = 2
 * ★2歳ちょうどは対象外★（「満たない」）。
 * ★「2歳に達する日」の厳密な定義（年齢計算に関する法律）は data/seido に未収録★ のため、
 * 誕生日の応当日を境界として扱い、UI では「2歳のお誕生日ごろまで」と幅を持たせる。
 */
export function isChildEligible(childBirthDate: string, baseDate: string): boolean {
  if (!childBirthDate) return false;
  return baseDate < addMonths(childBirthDate, TARGET_CHILD_AGE_YEARS * 12);
}

/**
 * 育児休業から「引き続き」時短を開始したか。
 * 根拠: J.eligibility.note「育児休業終了日と育児時短就業開始日の間が14日以内の場合を含む」
 * ★14日ちょうどは「引き続き」に含む★
 */
export function isContinuedFromIkukyu(ikukyuEndDate: string, jitanStartDate: string): boolean {
  const gap = diffDays(ikukyuEndDate, jitanStartDate);
  return gap >= 0 && gap <= CONTINUED_WITHIN_DAYS;
}

export interface EligibilityResult {
  /** 制度の対象になるか。false は「対象外」と言い切れる場合のみ */
  eligible: boolean;
  /** 要件を満たすか確認が必要（★「わからない」を「対象外」にしない★ §7.3） */
  needsConfirmation: boolean;
  childOk: boolean;
  insuredOk: boolean;
  reason: string;
}

/** 制度要件（E1 かつ E2）の判定。根拠: J.eligibility.value */
export function judgeEligibility(input: JitanInput): EligibilityResult {
  const childOk = isChildEligible(input.childBirthDate, input.today);
  const continued =
    input.continuedFromIkukyu ||
    (input.ikukyuEndDate ? isContinuedFromIkukyu(input.ikukyuEndDate, input.jitanStartDate) : false);

  if (!childOk) {
    return {
      eligible: false,
      needsConfirmation: false,
      childOk,
      insuredOk: false,
      reason: `育児時短就業給付金の対象は${J.targetChildAge.value}を養育する方です。お子さんが2歳のお誕生日を迎えているため、対象外と考えられます。正確な最終月は勤務先・ハローワークにご確認ください。`,
    };
  }
  if (continued) {
    return {
      eligible: true,
      needsConfirmation: false,
      childOk,
      insuredOk: true,
      reason: "育児休業から引き続き育児時短就業を開始したため、被保険者期間の要件は問われません。",
    };
  }
  if (input.insuredMonths12 === "yes") {
    return {
      eligible: true,
      needsConfirmation: false,
      childOk,
      insuredOk: true,
      reason:
        "育児時短就業開始日前2年間に、賃金支払基礎日数が11日以上ある完全月が12か月あるため、要件を満たします。",
    };
  }
  if (input.insuredMonths12 === "no") {
    return {
      eligible: false,
      needsConfirmation: false,
      childOk,
      insuredOk: false,
      reason:
        "育児休業から引き続き育児時短就業を開始した場合を除き、育児時短就業開始日前2年間に賃金支払基礎日数が11日以上ある（ない場合は80時間以上ある）完全月が12か月必要です。この要件を満たさないため、支給されない可能性があります。ハローワークにご確認ください。",
    };
  }
  // ★「わからない」を「対象外」にしない★（§7.3）
  return {
    eligible: true,
    needsConfirmation: true,
    childOk,
    insuredOk: false,
    reason:
      "育児休業から引き続きではない場合、育児時短就業開始日前2年間の被保険者期間（賃金支払基礎日数11日以上の完全月が12か月）が要件になります。この点はハローワークでの確認が必要です。以下は要件を満たす前提の参考値です。",
  };
}

// ---------------------------------------------------------------- 各月の支給要件（4つ）

export interface MonthlyCheck {
  /** J.monthlyEligibility.value の文言そのまま */
  label: string;
  ok: boolean;
  /** 満たさない場合に金額を出せるか（false なら要確認として金額を伏せる） */
  determinable: boolean;
}

/**
 * 各月の支給要件4つ。根拠: J.monthlyEligibility.value
 *
 * ★要件[2]の読み方の罠★ 原文は「初日から末日まで続けて育児休業給付又は介護休業給付を
 * 受給していない月」。「月の一部で育休給付を受けた」場合の可否は原文から一意に読めず、
 * 曖昧さを解消する情報が data/seido に無い。断定せず「要確認」にする（§4.3）。
 */
export function monthlyChecks(input: JitanInput): MonthlyCheck[] {
  const wm = derivedWageAfter(input);
  const reduced =
    input.inputMode === "byHours"
      ? input.weeklyHoursAfter < input.weeklyHoursBefore
      : wm < input.wageMonthBefore;

  return [
    { label: MONTHLY_ELIGIBILITY[0], ok: input.insuredWholeMonth, determinable: true },
    { label: MONTHLY_ELIGIBILITY[1], ok: reduced, determinable: true },
    { label: MONTHLY_ELIGIBILITY[2], ok: !input.receivingOtherBenefit, determinable: false },
    { label: MONTHLY_ELIGIBILITY[3], ok: !input.koureishaKeizoku, determinable: true },
  ];
}

// ---------------------------------------------------------------- 支給額の算定（3区分）

/**
 * 区分の判定。★整数比較★（W0 × 0.9 を丸めると 333,333 × 0.9 = 299,999.7 が
 * 300,000 になり区分が変わる。浮動小数の比較も避ける）
 * 根拠: RULES[0].case / RULES[1].case
 */
export function classify(wageBefore: number, wageAfter: number): Kubun {
  if (wageAfter * 100 <= wageBefore * LOWER_PERCENT) return "rule1";
  if (wageAfter * 100 < wageBefore * UPPER_PERCENT) return "rule2";
  return "noReduction";
}

/**
 * 区分①の支給額（賃金 × 10%）。根拠: RULES[0].formula
 * ★整数演算★ 支給率を千分率の整数にしてから乗算する（§9.2）。
 */
export function benefitRule1(wageAfter: number): number {
  return Math.floor((wageAfter * RATE_PER_MILLE) / 1000);
}

/**
 * 支給額の算定。
 *
 * ★区分②では金額を出さない（最重要の設計判断・§4.4）★
 * RULES[1].note が「調整後の支給率の厳密な算式は未確認。実装時は雇用保険法施行規則の
 * 該当条文を必ず参照すること」と明記している。10%を掛ける暫定実装は禁止
 * （逓減後の率は必ず10%未満のため、過大表示になる）。
 */
export function calcBenefit(wageBefore: number, wageAfter: number): BenefitResult {
  const threshold = (wageBefore * LOWER_PERCENT) / 100;
  const kubun = classify(wageBefore, wageAfter);

  if (kubun === "noReduction") {
    return {
      kind: "notEligible",
      kubun,
      amount: null,
      capped: false,
      threshold,
      reason:
        "時短を始める前の賃金月額から賃金が減っていないため、本ツールでは支給額を算定できません。育児時短就業給付金は、賃金が下がった分を補うための給付です。",
    };
  }
  if (kubun === "rule2") {
    // ★上限の目安★ RULES[1].note の趣旨「賃金額と支給額の合計が育児時短就業開始時
    // 賃金月額を超えないよう支給率を調整する」から、A < W0 − Wm であることのみ言える。
    return {
      kind: "undeterminable",
      kubun,
      amount: null,
      capped: false,
      threshold,
      reason: `時短による賃金の減り方が${100 - LOWER_PERCENT}%未満のため、給付の支給率が${RATE * 100}%から調整（逓減）されます。この調整後の支給率は厚生労働省令で定められており、本ツールでは確認できていないため金額を表示していません。ハローワークにご確認ください。なお、賃金額と支給額の合計が時短を始める前の賃金月額（${wageBefore.toLocaleString("ja-JP")}円）を超えることはありません。`,
    };
  }

  // 区分① → 区分③（頭打ち） → 最低限度額 の順に適用する。
  // ★二重判定を書かない★「賃金が支給限度額以上なら不支給」は、この流れから自然に0になる。
  let amount = benefitRule1(wageAfter);
  let capped = false;
  if (amount + wageAfter > SUPPORT_LIMIT) {
    amount = SUPPORT_LIMIT - wageAfter;
    capped = true;
  }
  if (amount <= MINIMUM_AMOUNT) {
    return {
      kind: "notPaid",
      kubun,
      amount: 0,
      capped,
      threshold,
      reason: capped
        ? `時短後の賃金が支給限度額（${SUPPORT_LIMIT.toLocaleString("ja-JP")}円）に近いため、算定額が最低限度額（${MINIMUM_AMOUNT.toLocaleString("ja-JP")}円）以下になり、支給されません。`
        : `算定額が最低限度額（${MINIMUM_AMOUNT.toLocaleString("ja-JP")}円）以下のため、支給されません。`,
    };
  }
  return {
    kind: "paid",
    kubun,
    amount,
    capped,
    threshold,
    reason: capped
      ? `支給限度額（${SUPPORT_LIMIT.toLocaleString("ja-JP")}円）に達したため、支給限度額から賃金額を差し引いた額になります。`
      : `支給対象月に支払われた賃金額の${RATE * 100}%です。`,
  };
}

// ---------------------------------------------------------------- 手取りの概算

/** 社会保険料の算定基礎（標準報酬月額）のシナリオ */
export type StandardWageScenario = "beforeZuiji" | "afterZuiji";

export interface PremiumBreakdown {
  /** 厚生年金保険料（本人負担・労使折半） */
  pension: number;
  /** 健康保険料（本人負担・労使折半） */
  health: number;
  /** 子ども・子育て支援金（本人負担・労使折半）★令和8年4月新設★ */
  childcareSupport: number;
  /** 雇用保険料（労働者負担。折半しない。算定基礎は実際に支払われた賃金） */
  employment: number;
  total: number;
  /** 社会保険料の算定に使った報酬月額（★等級表が未収集のため報酬月額で概算★） */
  standardWage: number;
}

/**
 * 保険料の概算（本人負担）。
 *
 * ★概算である理由★（いずれも queue/hoikuryo-backlog.md §8）
 *   - 標準報酬月額の等級表（健保50等級／厚年32等級）が未収集のため、報酬月額をそのまま使う
 *   - 健康保険料率は全国平均（都道府県別47件は未収集）
 *   - 健康保険・子ども子育て支援金の労使折半は本ツールの仮定（明示的根拠が未収録）
 *
 * ★子ども・子育て支援金（令和8年4月新設）を必ず含めること★
 *   見落とすと手取りを過大評価する（R.childcareSupportRate.note）。
 *
 * ★雇用保険料だけ算定基礎が違う★ 社会保険は標準報酬月額、雇用保険は実際に支払われた賃金。
 */
export function calcPremium(standardWage: number, wagePaid: number): PremiumBreakdown {
  const pension = yenFloor((standardWage * R.employeesPensionRate.value) / 2);
  const health = yenFloor((standardWage * R.healthInsuranceRateAverage.value) / 2);
  const childcareSupport = yenFloor((standardWage * R.childcareSupportRate.value) / 2);
  const employment = yenFloor(wagePaid * R.employmentInsuranceRateWorker.value);
  return {
    pension,
    health,
    childcareSupport,
    employment,
    total: pension + health + childcareSupport + employment,
    standardWage,
  };
}

export interface TakehomeScenario {
  scenario: StandardWageScenario;
  label: string;
  premium: PremiumBreakdown;
  /** 税引前の手取り（賃金 − 保険料）。★所得税・住民税は計算していない★ */
  beforeTax: number;
  /** 手取り + 給付。給付が算定できないときは null */
  monthlyTotal: number | null;
}

/**
 * ★中核論点★ 時短で賃金が下がっても、その月から社会保険料は下がらない。
 * 2つのシナリオを並べて出す。
 *
 * ★随時改定（月額変更届）の要件・時期、および養育期間の従前標準報酬月額のみなし措置は
 * data/seido に未収録★ のため、「いつ下がるか」を月数で断定しない
 * （queue/hoikuryo-backlog.md §8 で追跡）。
 */
export function calcTakehome(
  input: JitanInput,
  benefit: BenefitResult,
  scenario: StandardWageScenario,
): TakehomeScenario {
  const wm = derivedWageAfter(input);
  const standardWage = scenario === "beforeZuiji" ? input.wageMonthBefore : wm;
  const premium = calcPremium(standardWage, wm);
  const beforeTax = wm - premium.total;
  // 給付は非課税（ikukyu.data.handoriJuwariSoutou.taxExempt）なのでそのまま加算する
  return {
    scenario,
    label:
      scenario === "beforeZuiji"
        ? "時短にした直後の数か月（社会保険料は前の給料のまま）"
        : "社会保険料が下がったあと",
    premium,
    beforeTax,
    monthlyTotal: benefit.amount === null ? null : beforeTax + benefit.amount,
  };
}

/** 給付が非課税であること。根拠: ikukyu.data.handoriJuwariSoutou.taxExempt.value */
export const BENEFIT_TAX_EXEMPT = ikukyu.data.handoriJuwariSoutou.taxExempt.value;

// ---------------------------------------------------------------- 総合

export interface JitanResult {
  /** データの有効期限切れ（8月1日の改定を迎えた）。true のとき金額は一切出さない */
  expired: boolean;
  errors: ValidationError[];
  /** 計算に使った時短後の賃金（byHours のときは時間比例の概算） */
  wageAfter: number;
  eligibility: EligibilityResult;
  checks: MonthlyCheck[];
  benefit: BenefitResult;
  /** 時短直後・随時改定後の2シナリオ */
  takehome: TakehomeScenario[];
  /** 時短前（フルタイム）の税引前手取り。比較用 */
  beforeJitanTakehome: number;
  warnings: string[];
}

/**
 * ★STEP 1（最初に実行する）★ データの有効期限チェック。
 * 基準日または育児時短就業の開始日が expiresOn を過ぎていたら、部分的な計算結果も出さない。
 * 日付リテラルはコードに書かず、amendments から導出する。
 */
export function isExpired(input: Pick<JitanInput, "today" | "jitanStartDate">): boolean {
  if (isDataExpired(ikukyuKyufuDataset, input.today)) return true;
  return input.jitanStartDate ? isDataExpired(ikukyuKyufuDataset, input.jitanStartDate) : false;
}

export function simulate(input: JitanInput): JitanResult {
  const expired = isExpired(input);
  const errors = validate(input);
  const wageAfter = derivedWageAfter(input);
  const eligibility = judgeEligibility(input);
  const checks = monthlyChecks(input);
  const warnings: string[] = [];

  const notPaid = (reason: string): BenefitResult => ({
    kind: "notPaid",
    kubun: classify(input.wageMonthBefore, wageAfter),
    amount: 0,
    capped: false,
    threshold: (input.wageMonthBefore * LOWER_PERCENT) / 100,
    reason,
  });

  let benefit: BenefitResult;
  if (expired || errors.length > 0) {
    benefit = {
      kind: "undeterminable",
      kubun: "rule1",
      amount: null,
      capped: false,
      threshold: 0,
      reason: expired
        ? "支給限度額・最低限度額の改定時期を迎えているため、計算を停止しています。"
        : "入力内容をご確認ください。",
    };
  } else if (!eligibility.eligible) {
    benefit = {
      kind: "notEligible",
      kubun: classify(input.wageMonthBefore, wageAfter),
      amount: null,
      capped: false,
      threshold: (input.wageMonthBefore * LOWER_PERCENT) / 100,
      reason: eligibility.reason,
    };
  } else if (!checks[0].ok) {
    benefit = notPaid(`その月は「${MONTHLY_ELIGIBILITY[0]}」に当たらないため、支給されません。`);
  } else if (!checks[3].ok) {
    benefit = notPaid(`その月は「${MONTHLY_ELIGIBILITY[3]}」に当たらないため、支給されません。`);
  } else if (!checks[2].ok) {
    // ★断定しない★「初日から末日まで続けて…受給していない月」の読みが一意でない
    benefit = {
      kind: "undeterminable",
      kubun: classify(input.wageMonthBefore, wageAfter),
      amount: null,
      capped: false,
      threshold: (input.wageMonthBefore * LOWER_PERCENT) / 100,
      reason:
        "育児休業給付・介護休業給付を受け取る月と重なる場合、その月に育児時短就業給付金が支給されるかどうかは、月のどの期間に受給したかによります。復職月などが当てはまります。ハローワークにご確認ください。",
    };
  } else if (!checks[1].ok && classify(input.wageMonthBefore, wageAfter) !== "noReduction") {
    // 「賃金が減っていない」場合は calcBenefit が区分外として扱い、専用の説明を返すため
    // ここでは扱わない（不支給0円ではなく「算定できません」を出す）
    benefit = notPaid(`その月は「${MONTHLY_ELIGIBILITY[1]}」に当たらないため、支給されません。`);
  } else {
    benefit = calcBenefit(input.wageMonthBefore, wageAfter);
  }

  // ---- 警告（§4.7）
  if (!expired && errors.length === 0) {
    if (benefit.capped) {
      warnings.push(
        `支給限度額（${SUPPORT_LIMIT.toLocaleString("ja-JP")}円）に達したため、給付が減額されています。賃金額と支給額の合計は支給限度額で頭打ちになります。`,
      );
    }
    if (wageAfter >= SUPPORT_LIMIT) {
      warnings.push(
        `時短後の賃金が支給限度額（${SUPPORT_LIMIT.toLocaleString("ja-JP")}円）以上のため、支給されません。`,
      );
    }
    if (eligibility.needsConfirmation) {
      warnings.push(eligibility.reason);
    }
    if (input.prefecture) {
      warnings.push(
        "健康保険料率は全国平均9.9%で概算しています。お住まいの都道府県により異なります（都道府県別の料率は本ツールに収録していません）。",
      );
    }
    warnings.push(
      "時短勤務中の社会保険料は免除されません。保険料が免除されるのは産前産後休業・育児休業等の期間です。",
    );
    warnings.push(
      "社会保険料（健康保険・厚生年金）は、時短にしてもすぐには下がりません。下がる時期・条件は本ツールでは判定していないため、勤務先にご確認ください。",
    );
    warnings.push(
      "時短で標準報酬月額が下がっても、将来の年金額が下がらないようにする申出の制度があります（本ツールの計算には含めていません）。勤務先にご確認ください。",
    );
    if (input.inputMode === "byHours") {
      warnings.push(
        "時短後の賃金は週の所定労働時間から時間比例で概算しています。実際の給与は勤務先の規程によります。",
      );
    }
  }

  const takehome =
    expired || errors.length > 0
      ? []
      : (["beforeZuiji", "afterZuiji"] as StandardWageScenario[]).map((s) =>
          calcTakehome(input, benefit, s),
        );

  const beforeJitanPremium = calcPremium(input.wageMonthBefore, input.wageMonthBefore);

  return {
    expired,
    errors,
    wageAfter,
    eligibility,
    checks,
    benefit,
    takehome,
    beforeJitanTakehome: input.wageMonthBefore - beforeJitanPremium.total,
    warnings,
  };
}
