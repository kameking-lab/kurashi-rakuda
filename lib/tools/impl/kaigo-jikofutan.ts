/**
 * 介護保険 自己負担シミュレーター の計算ロジック（specs/s-tools/05-kaigo-hoken-futan.md）。
 *
 * すべての制度数値は data/seido/kaigo-hoken.json から読む。ここに数値を書かない。
 * （例外は「2」「10」のような算術・端数処理上の定数）
 *
 * ★このファイルが守っている「罠」★（仕様書 §9.2）
 *   1. 要介護度を「状態像」で説明しない（法令・告示に根拠がない）。基準時間のみを出す
 *   2. 負担割合の2要件は AND。OR で書くと1割の人を2割と誤る
 *   3. 非課税世帯・生活保護は課税所得では判定できない（先に世帯の課税状況を見る）
 *   4. 2026-08-01 の補足給付の分岐は「公開日」ではなく「試算対象月」で決める
 *   5. 多床室（室料を徴収しない老健等）の第3段階②だけ据置。配列から必ず引く
 *   6. 区分支給限度基準額の超過分に負担割合を掛けない（全額自己負担）
 *   7. 超過分・食費・居住費を高額介護サービス費の上限計算に入れない
 *   8. kyojuhi[].stage1 の 0 を falsy 判定しない（無料であって未設定ではない）
 *   9. hikazei-80man は世帯（limit）と個人（limitIndividual）の両方を持つ
 *  10. 経過的要介護を選択肢から落とさない（levels[] からループで生成する）
 *  11. yokaigoNintei.levels と kubunShikyuGendo.levels の key は完全一致しない
 *  12. futanWariai.brackets の順序に依存しない（rate の降順で評価する）
 *
 * ★数値を出さないところ★
 *   - 1〜7級地（市町村別の級地・サービス種類別の上乗せ率が未収集。yenMax は上限値にすぎない）
 *   - 補足給付の第2/第3段階①の境界（一次資料間で 80.9万 と 82.65万 が食い違う）
 *   - 高額医療・高額介護合算療養費（現行限度額が未確認。実装そのものを保留）
 */

import seido from "@/data/seido/kaigo-hoken.json";
import { isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const kaigoHokenDataset = seido as unknown as SeidoDataset;

const D = seido.data;
const FW = D.futanWariai;
const KG = D.kubunShikyuGendo;
const TK = D.tanka;
const KK = D.kougakuKaigoServiceHi;
const HK = D.hojokyufu;
const YN = D.yokaigoNintei;

// ---------------------------------------------------------------- 型

export type AgeGroup = "age65plus" | "age40to64";
export type Household = "single" | "couple";
export type TaxStatus = "seikatsuHogo" | "hikazei" | "taxed";
export type Mode = "zaitaku" | "shisetsu";

export interface KaigoInput {
  /** 試算の基準日＝サービスを受ける月（ISO）。★2026-08-01 の分岐はここで決まる★ */
  serviceDate: string;
  ageGroup: AgeGroup;
  /** 世帯区分（65歳以上が2人以上なら couple）。負担割合の第2要件のしきい値が変わる */
  household: Household;
  /** 要介護度（kubunShikyuGendo.levels[].key） */
  careLevel: string;
  /** 級地（tanka.grades[].grade）。既定は上乗せなしの地域 */
  grade: string;
  /** 本人の合計所得金額（負担割合の第1要件） */
  totalIncome: number;
  /** 世帯の65歳以上の方の「年金収入＋その他の合計所得金額」（負担割合の第2要件） */
  pensionPlusOtherIncome: number;
  /** 本人の課税所得（高額介護サービス費の区分） */
  taxableIncome: number;
  /**
   * 【非課税世帯】高額介護サービス費の判定に使う「公的年金等の収入金額＋その他の合計所得金額」。
   * ★非課税年金（遺族年金・障害年金）は含めない★ 施行令第22条の2の2の「年金収入等」は
   * 公的年金等の収入金額（＝所得税法上の公的年金等）＋合計所得金額から公的年金等に係る
   * 雑所得を控除した額であり、補足給付（施行規則第83条の5第1号イ。非課税年金を明示的に加算）
   * とは定義が異なる。遺族・障害年金受給者で両者を混同すると区分を取り違える。
   */
  kougakuNenkinIncome: number;
  /** 世帯の課税状況。★高額介護サービス費・補足給付の判定はここから始める★ */
  taxStatus: TaxStatus;
  /** 同一世帯の合計所得金額38万円以下の19歳未満の者（世帯主の場合のみ効く） */
  youngDependents: { under16: number; age16to18: number };
  isHouseholder: boolean;
  mode: Mode;
  /** 【在宅】1か月の利用単位数。null なら限度額いっぱいで試算する */
  usedUnits: number | null;
  /** 【施設】居住費の部屋タイプ（hojokyufu.<期間>.kyojuhi[].type） */
  roomType: string;
  /** 【施設】滞在日数 */
  stayDays: number;
  isShortStay: boolean;
  /** 【施設】預貯金等の額（補足給付の要件） */
  savings: number;
  /** 【施設】補足給付の段階判定に使う本人の「年金収入金額＋合計所得金額」。★非課税年金も含む★
   * 高額介護サービス費の判定（kougakuNenkinIncome。非課税年金を含めない）とは別入力。 */
  hojokyufuIncome: number;
}

// ---------------------------------------------------------------- データから導出する定数

/**
 * 高額介護サービス費の判定の基準年の切替月。
 * 根拠: KK.judgmentRules.baseYear.value =「…その月が1月から7月までの場合には前々年」
 * 数値ノードが無いため文字列から取る（データが変わればテストが落ちる）。
 */
const BASE_YEAR_RULE = /(\d+)月から(\d+)月/.exec(KK.judgmentRules.baseYear.value);
export const BASE_YEAR_PREV2_LAST_MONTH = Number(BASE_YEAR_RULE?.[2] ?? 0);

/**
 * 年少扶養控除の調整措置の控除額。
 * 根拠: KK.judgmentRules.youngDependentAdjustment.value
 *   =「…16歳未満×33万円、16歳以上19歳未満×12万円を課税所得から控除する」
 */
const YD = KK.judgmentRules.youngDependentAdjustment.value;
const YD_UNDER = /(\d+)歳未満×(\d+)万円/.exec(YD);
const YD_MIDDLE = /(\d+)歳以上(\d+)歳未満×(\d+)万円/.exec(YD);
export const YOUNG_DEPENDENT_UNDER16_DEDUCTION = Number(YD_UNDER?.[2] ?? 0) * 10_000;
export const YOUNG_DEPENDENT_16TO18_DEDUCTION = Number(YD_MIDDLE?.[3] ?? 0) * 10_000;

/**
 * 「市町村民税世帯非課税 かつ 年金等が一定額以下」の区分のしきい値。
 * ★2026-07-17 データ訂正★ 従前の「80万円」は誤りで、施行令の条文は80.9万円。
 * さらに2026-08-01から82.65万円へ引き上げ（補足給付の境界と同一基準・年金額連動）。
 * データの incomeMax / incomeMaxBeforeAug2026 を基準日で切り替える。
 */
const HIKAZEI_80MAN = KK.brackets.find((b) => b.key === "hikazei-80man")!;

/** 基準日に応じた「非課税かつ年金等」区分の境界額 */
export function hikazei80manThreshold(serviceDate: string): number {
  const b = HIKAZEI_80MAN as { incomeMax?: number; incomeMaxBeforeAug2026?: number };
  return (serviceDate >= HOJOKYUFU_EFFECTIVE_FROM ? b.incomeMax : b.incomeMaxBeforeAug2026)!;
}

/**
 * 上乗せのない級地（＝1単位10円）。既定値かつ、確定額を出せる唯一の級地。
 * 根拠: TK.gradeAssignmentRule.note「ツールでは『その他地域（10円）』を既定とし…」
 * ★市町村別の級地一覧が未収集のため、1〜7級地では確定額を出さない★
 */
export const BASE_GRADE = TK.grades.find((g) => g.ratioMax === 1)!;

/**
 * ★2026-08-01 の補足給付の改正日★
 * コードに日付を書かず、fromAug2026 が根拠にしている出典と同じ amendment から取る。
 * データを差し替えるだけで施行日が追随する。
 */
export const HOJOKYUFU_AMENDMENT = seido.amendments.find(
  (a) => a.sourceId === HK.fromAug2026.sourceId && a.status === "scheduled" && a.effectiveFrom,
)!;
export const HOJOKYUFU_EFFECTIVE_FROM = HOJOKYUFU_AMENDMENT.effectiveFrom!;

/**
 * ★第2段階/第3段階①の境界（2026-07-17 データ第2弾で決着・解禁）★
 * 「80.9万円 vs 82.65万円」は別の時点の同一基準で、どちらも正しい
 * （boundaryResolution）。境界は老齢基礎年金（満額）に連動して改定され、
 * 〜2026-07-31 は 809,000円、2026-08-01〜 は 826,500円。
 * 補足給付の金額表と同じく「試算対象月」で切り替える（★罠4と同じ構造★）。
 */
export const BOUNDARY_STAGE2_3A_FROM_AUG2026 = HK.userStages.boundaryStage2Stage3a.value;
export const BOUNDARY_STAGE2_3A_BEFORE_AUG2026 =
  HK.userStages.boundaryStage2Stage3aBeforeAug2026.value;

/** 試算対象月に応じた第2段階/第3段階①の境界額 */
export function stage2Stage3aBoundary(serviceDate: string): number {
  return serviceDate >= HOJOKYUFU_EFFECTIVE_FROM
    ? BOUNDARY_STAGE2_3A_FROM_AUG2026
    : BOUNDARY_STAGE2_3A_BEFORE_AUG2026;
}

/**
 * 2026-08-01 の境界改定をまたいで段階が変わる所得の範囲か
 * （80.9万円超〜82.65万円以下）。この帯の方は、2026年7月分までは第3段階①、
 * 8月分からは第2段階になるため、注意書きを添える（金額自体は確定して出す）。
 */
export function isStageChangingAtAug2026(income: number): boolean {
  return (
    income > BOUNDARY_STAGE2_3A_BEFORE_AUG2026 && income <= BOUNDARY_STAGE2_3A_FROM_AUG2026
  );
}

// ---------------------------------------------------------------- 負担割合

export interface FutanWariaiResult {
  /** 負担割合を10倍した整数（1/2/3）。★浮動小数の 0.1 を掛けない★ */
  rate10: number;
  label: string;
  reason: string;
  /** ★AND★ 第1要件（合計所得金額）を満たすか */
  firstRequirementMet: boolean;
  /** ★AND★ 第2要件（年金収入＋その他の合計所得金額）を満たすか */
  secondRequirementMet: boolean;
  /** 第1要件だけを満たして1割になったか（＝理由を明示すべきケース） */
  firstOnly: boolean;
}

/** 第2要件のしきい値（単身／夫婦等でしきい値が違う） */
function secondThreshold(
  b: (typeof FW.brackets)[number],
  household: Household,
): number | null {
  return household === "couple"
    ? b.pensionPlusOtherIncomeMinCouple
    : b.pensionPlusOtherIncomeMinSingle;
}

/** 1割（フォールバック）の bracket。全しきい値が null であることで識別する */
const FALLBACK_BRACKET = FW.brackets.find((b) => b.totalIncomeMin === null)!;

/**
 * ★実装上の最重要論点★ 負担割合の判定。
 *
 * FW.note:「2つの要件はAND条件（「かつ」）。合計所得金額の要件を満たしても、
 * 年金収入＋その他合計所得金額の要件を満たさなければ1割のまま。」
 *
 * ★ステップ1★ 40〜64歳（第2号被保険者）は所得にかかわらず一律1割。
 * 所得を一切見ずに早期リターンする（FW.description）。
 */
export function judgeFutanWariai(input: KaigoInput): FutanWariaiResult {
  const fallback: FutanWariaiResult = {
    rate10: Math.round(FALLBACK_BRACKET.rate * 10),
    label: FALLBACK_BRACKET.label,
    reason: "",
    firstRequirementMet: false,
    secondRequirementMet: false,
    firstOnly: false,
  };

  if (input.ageGroup === "age40to64") {
    return {
      ...fallback,
      reason:
        "40〜64歳（第2号被保険者）の方は、所得にかかわらず一律で1割負担です（所得は判定に使いません）。",
    };
  }

  // ★brackets の順序に依存しない★ 負担割合の高い順に AND で評価する
  const ordered = [...FW.brackets]
    .filter((b) => b.totalIncomeMin !== null)
    .sort((a, b) => b.rate - a.rate);

  let firstOnly = false;
  for (const b of ordered) {
    const th2 = secondThreshold(b, input.household);
    const first = input.totalIncome >= b.totalIncomeMin!;
    const second = th2 !== null && input.pensionPlusOtherIncome >= th2;

    // ★AND★ 「||」で書くと、合計所得だけ高い方を2割・3割と誤る
    if (first && second) {
      return {
        rate10: Math.round(b.rate * 10),
        label: b.label,
        reason: b.note,
        firstRequirementMet: true,
        secondRequirementMet: true,
        firstOnly: false,
      };
    }
    if (first && !second) firstOnly = true;
  }

  return {
    ...fallback,
    reason: firstOnly
      ? "合計所得金額は基準を超えていますが、年金収入＋その他の合計所得金額が基準に届かないため1割です（2つの要件の両方を満たす必要があります）。"
      : FALLBACK_BRACKET.note,
    firstRequirementMet: firstOnly,
    secondRequirementMet: false,
    firstOnly,
  };
}

// ---------------------------------------------------------------- 1単位の単価

export interface TankaResult {
  /** 計算に使う単価（円）。★1〜7級地でも上限値では計算しない★ */
  yen: number;
  /** 確定額を出せるか（上乗せのない地域のみ true） */
  certain: boolean;
  grade: string;
  /** 選択された級地の単価の上限値（確定額ではない） */
  yenMax: number;
  note?: string;
}

/**
 * ★重大な注意★ TK.note:「単価は『級地 × サービス種類』の組合せで決まる。…
 * 『1級地は一律11.40円』は誤り。下表の yenMax は級地ごとの上限値にすぎない。」
 *
 * → 1〜7級地では確定額を出さず、上乗せのない地域（10円）で計算した額を示す。
 *   根拠のない丸めを実装しないための、仕様上の意図的な回避。
 */
export function resolveTanka(grade: string): TankaResult {
  const g = TK.grades.find((x) => x.grade === grade) ?? BASE_GRADE;
  if (g.grade === BASE_GRADE.grade) {
    return { yen: BASE_GRADE.yenMax, certain: true, grade: g.grade, yenMax: g.yenMax };
  }
  return {
    // ★上限値を掛けた額を確定額として出さない★ 計算は上乗せなしの単価で行う
    yen: BASE_GRADE.yenMax,
    certain: false,
    grade: g.grade,
    yenMax: g.yenMax,
    note: `${g.grade}の1単位の単価は最大${g.yenMax}円ですが、実際の単価はサービスの種類（人件費割合区分）により異なり、これより低くなります（上限値です）。${TK.serviceTypeRule.value}`,
  };
}

// ---------------------------------------------------------------- 区分支給限度基準額

export interface ZaitakuResult {
  level: (typeof KG.levels)[number];
  limitUnits: number;
  usedUnits: number;
  withinUnits: number;
  /** 限度額を超えた単位数。★この分は全額自己負担★ */
  overUnits: number;
  /** サービスの費用の総額（10割） */
  totalCost: number;
  /** 限度額の範囲内の自己負担（負担割合を掛けた額） */
  withinFutan: number;
  /** 限度額を超えた分の自己負担（★負担割合を掛けない★） */
  overFutan: number;
  /** 自己負担の合計 */
  totalFutan: number;
}

/** 円 × 負担割合。★浮動小数の 0.1/0.2/0.3 を使わず整数演算にする★ */
function applyRate(yen: number, rate10: number): number {
  return Math.round((yen * rate10) / 10);
}

export function calcZaitaku(input: KaigoInput, rate10: number, tanka: TankaResult): ZaitakuResult | null {
  const level = KG.levels.find((l) => l.key === input.careLevel);
  if (!level) return null;

  const limitUnits = level.units;
  const usedUnits = input.usedUnits ?? limitUnits;
  const withinUnits = Math.min(usedUnits, limitUnits);
  const overUnits = Math.max(0, usedUnits - limitUnits);

  const withinYen = Math.round(withinUnits * tanka.yen);
  const overYen = Math.round(overUnits * tanka.yen);

  const withinFutan = applyRate(withinYen, rate10);
  // ★罠6★ KG.description「これを超えた分は全額自己負担となる」＝ 負担割合を掛けない
  const overFutan = overYen;

  return {
    level,
    limitUnits,
    usedUnits,
    withinUnits,
    overUnits,
    totalCost: withinYen + overYen,
    withinFutan,
    overFutan,
    totalFutan: withinFutan + overFutan,
  };
}

// ---------------------------------------------------------------- 高額介護サービス費

export interface KougakuResult {
  bracket: (typeof KK.brackets)[number];
  /** 年少扶養控除の調整後の課税所得（課税世帯のみ意味を持つ） */
  adjustedTaxableIncome: number | null;
  /** 世帯の上限額 */
  limit: number;
  /** 個人の上限額（hikazei-80man / seikatsu-hogo のみ） */
  limitIndividual: number | null;
  /** 上限額の対象になる自己負担（★超過分・食費・居住費を含まない★） */
  target: number;
  /** 払い戻しの見込み */
  refund: number;
  /** 上限適用後の実質負担 */
  afterLimit: number;
  /** 判定の基準年（表示用） */
  baseYear: number;
}

/**
 * 判定の基準年。
 * KK.judgmentRules.baseYear.value「サービスを受けた月の属する年の前年
 * （その月が1月から7月までの場合には前々年）」
 */
export function judgmentBaseYear(serviceDate: string): number {
  const [y, m] = serviceDate.split("-").map(Number);
  return m <= BASE_YEAR_PREV2_LAST_MONTH ? y - 2 : y - 1;
}

/**
 * ★罠3★ 非課税世帯・生活保護は課税所得では判定できない。
 * brackets[key=hikazei] / [key=seikatsu-hogo] には taxableIncomeMin/Max が存在しないため、
 * 課税所得だけで線形探索すると非課税世帯が kazei-under380（44,400円）に落ちる。
 * → 世帯の課税状況を先に見る。
 */
export function selectKougakuBracket(input: KaigoInput): (typeof KK.brackets)[number] {
  if (input.taxStatus === "seikatsuHogo") {
    return KK.brackets.find((b) => b.key === "seikatsu-hogo")!;
  }
  if (input.taxStatus === "hikazei") {
    // 「①公的年金等の収入金額＋その他の合計所得金額が80.9万円（8/1から82.65万円）以下 又は ②老齢福祉年金受給者」
    // ★補足給付と異なり非課税年金を含めない額（kougakuNenkinIncome）で判定する★
    return input.kougakuNenkinIncome <= hikazei80manThreshold(input.serviceDate)
      ? HIKAZEI_80MAN
      : KK.brackets.find((b) => b.key === "hikazei")!;
  }

  const x = adjustTaxableIncome(input);
  // 課税所得で判定できる区分だけを対象にする（genkaku-* は機械判定しない）
  const byIncome = KK.brackets.filter(
    (b) => "taxableIncomeMin" in b || "taxableIncomeMax" in b,
  );
  const hit = byIncome.find((b) => {
    const min = (b as { taxableIncomeMin?: number }).taxableIncomeMin;
    const max = (b as { taxableIncomeMax?: number }).taxableIncomeMax;
    // label の原文は「◯◯以上」「◯◯未満」＝ min は含み、max は含まない
    return (min === undefined || x >= min) && (max === undefined || x < max);
  });
  return hit ?? KK.brackets.find((b) => b.key === "kazei-under380")!;
}

/** 年少扶養控除の調整措置。世帯主の場合のみ適用する */
export function adjustTaxableIncome(input: KaigoInput): number {
  if (!input.isHouseholder) return input.taxableIncome;
  const d =
    input.youngDependents.under16 * YOUNG_DEPENDENT_UNDER16_DEDUCTION +
    input.youngDependents.age16to18 * YOUNG_DEPENDENT_16TO18_DEDUCTION;
  return Math.max(0, input.taxableIncome - d);
}

/**
 * 高額介護サービス費。
 * ★罠7★ KK.note「福祉用具購入費・住宅改修費・施設の食費居住費・
 * 区分支給限度基準額を超えた自己負担分は対象外」
 * → target には限度額の範囲内の自己負担（withinFutan）だけを渡すこと。
 */
export function calcKougaku(input: KaigoInput, target: number): KougakuResult {
  const bracket = selectKougakuBracket(input);
  const limit = bracket.limit;
  const refund = Math.max(0, target - limit);

  return {
    bracket,
    adjustedTaxableIncome: input.taxStatus === "taxed" ? adjustTaxableIncome(input) : null,
    limit,
    limitIndividual: (bracket as { limitIndividual?: number }).limitIndividual ?? null,
    target,
    refund,
    afterLimit: Math.min(target, limit),
    baseYear: judgmentBaseYear(input.serviceDate),
  };
}

// ---------------------------------------------------------------- 補足給付

type Period = typeof HK.beforeAug2026 | typeof HK.fromAug2026;
type Stage = (typeof HK.userStages.stages)[number];
type StageKey = "stage1" | "stage2" | "stage3a" | "stage3b" | "stage4";

/**
 * ★罠4★ 2026-08-01 の分岐。
 * 「公開日」ではなく「試算対象月」で切り替える。Date.now() を参照しない。
 * 施行日は amendments から導出しているため、データの差し替えで追随する。
 */
export function resolvePeriod(serviceDate: string): { period: Period; isFromAug2026: boolean } {
  const isFromAug2026 = serviceDate >= HOJOKYUFU_EFFECTIVE_FROM;
  return { period: isFromAug2026 ? HK.fromAug2026 : HK.beforeAug2026, isFromAug2026 };
}

export interface StageResult {
  /** 確定した段階。不確定域では null になる */
  stage: Stage | null;
  /** 段階を確定できないとき、候補となる段階（第2段階／第3段階①） */
  candidates: Stage[];
  /** 預貯金要件で対象外になったか */
  overSavings: boolean;
  reason: string;
}

/** 段階判定（★預貯金要件・課税状況・不確定域を順に見る★） */
export function judgeStage(input: KaigoInput): StageResult {
  const stages = HK.userStages.stages;
  const stage4 = stages.find((s) => s.key === "stage4")!;

  // ★罠3と同じ構造★ 第4段階（世帯に課税者がいる）は所得では判定しない
  if (input.taxStatus === "taxed") {
    return {
      stage: stage4,
      candidates: [],
      overSavings: false,
      reason: stage4.condition,
    };
  }

  const savingsOk = (s: Stage): boolean => {
    const limit =
      input.household === "couple"
        ? (s as { savingsLimitCouple?: number }).savingsLimitCouple
        : (s as { savingsLimitSingle?: number }).savingsLimitSingle;
    if (limit === undefined) return true;
    // 生活保護受給者は預貯金要件なし（stage1.condition）
    if (input.taxStatus === "seikatsuHogo" && s.key === "stage1") return true;
    return input.savings <= limit;
  };

  if (input.taxStatus === "seikatsuHogo") {
    const s1 = stages.find((s) => s.key === "stage1")!;
    return { stage: s1, candidates: [], overSavings: false, reason: s1.condition };
  }

  // ★第2段階/第3段階①の境界は試算対象月で切り替える★（2026-07-17 解禁）
  // stages のデータは2026-08-01以降の境界（826,500円）で書かれているため、
  // 2026年7月分以前の試算では境界を809,000円に読み替える。
  const boundary = stage2Stage3aBoundary(input.serviceDate);
  const rangeOf = (s: Stage): { min?: number; max?: number } => {
    const min = (s as { incomeMin?: number }).incomeMin;
    const max = (s as { incomeMax?: number }).incomeMax;
    if (s.key === "stage2") return { min, max: boundary };
    if (s.key === "stage3a") return { min: boundary, max };
    return { min, max };
  };

  // 所得で判定できる段階だけを対象にする（stage1 は所得の範囲を持たない）
  const byIncome = stages.filter((s) => "incomeMin" in s || "incomeMax" in s);
  const hit = byIncome.find((s) => {
    const { min, max } = rangeOf(s);
    // condition の原文は「◯◯超」「◯◯以下」＝ min は含まず、max は含む
    return (min === undefined || input.hojokyufuIncome > min) && (max === undefined || input.hojokyufuIncome <= max);
  });

  if (!hit) {
    return { stage: stage4, candidates: [], overSavings: false, reason: stage4.condition };
  }
  if (!savingsOk(hit)) {
    const limit =
      input.household === "couple"
        ? (hit as { savingsLimitCouple?: number }).savingsLimitCouple
        : (hit as { savingsLimitSingle?: number }).savingsLimitSingle;
    return {
      stage: stage4,
      candidates: [],
      overSavings: true,
      reason: `預貯金等が${(limit ?? 0).toLocaleString("ja-JP")}円を超えるため、補足給付の対象外です（基準費用額を全額負担）。`,
    };
  }
  return { stage: hit, candidates: [], overSavings: false, reason: hit.condition };
}

/**
 * 食費の日額。
 * ★罠8★ 0 を falsy 判定しない。第4段階は基準費用額を全額負担。
 */
export function shokuhiPerDay(period: Period, stageKey: StageKey, isShortStay: boolean): number {
  if (stageKey === "stage4") return period.shokuhi.kijunHiyou;
  const table = isShortStay
    ? (period.shokuhi.shortStay as Record<string, number>)
    : (period.shokuhi as unknown as Record<string, number>);
  return table[stageKey];
}

/**
 * 居住費の日額。
 * ★罠5★ 「第3段階②は +100円」と一般化してはいけない。
 * 多床室（室料を徴収しない老健等）の第3段階②だけ据置のため、必ず配列から引く。
 */
export function kyojuhiPerDay(period: Period, roomType: string, stageKey: StageKey): number | null {
  const room = period.kyojuhi.find((r) => r.type === roomType);
  if (!room) return null;
  if (stageKey === "stage4") return room.kijunHiyou;
  return (room as unknown as Record<string, number>)[stageKey];
}

export interface HojokyufuLine {
  stage: Stage;
  shokuhi: number;
  kyojuhi: number;
  perDay: number;
  monthly: number;
}

export interface HojokyufuResult {
  period: Period;
  isFromAug2026: boolean;
  stageResult: StageResult;
  /** 確定した段階の内訳。不確定域では null */
  line: HojokyufuLine | null;
  /** 不確定域で併記する候補（第2段階／第3段階①） */
  candidateLines: HojokyufuLine[];
  /** 部屋タイプが見つからない等で計算できない */
  unavailable: boolean;
  days: number;
}

export function calcHojokyufu(input: KaigoInput): HojokyufuResult {
  const { period, isFromAug2026 } = resolvePeriod(input.serviceDate);
  const stageResult = judgeStage(input);
  const days = Math.max(0, input.stayDays);

  const lineOf = (stage: Stage): HojokyufuLine | null => {
    const shokuhi = shokuhiPerDay(period, stage.key as StageKey, input.isShortStay);
    const kyojuhi = kyojuhiPerDay(period, input.roomType, stage.key as StageKey);
    if (shokuhi === undefined || kyojuhi === null) return null;
    const perDay = shokuhi + kyojuhi;
    return { stage, shokuhi, kyojuhi, perDay, monthly: perDay * days };
  };

  if (stageResult.stage) {
    const line = lineOf(stageResult.stage);
    return {
      period,
      isFromAug2026,
      stageResult,
      line,
      candidateLines: [],
      unavailable: line === null,
      days,
    };
  }

  const candidateLines = stageResult.candidates
    .map(lineOf)
    .filter((l): l is HojokyufuLine => l !== null);
  return {
    period,
    isFromAug2026,
    stageResult,
    line: null,
    candidateLines,
    unavailable: candidateLines.length === 0,
    days,
  };
}

// ---------------------------------------------------------------- 要介護度の説明（★状態像を書かない★）

export interface NinteiDefinition {
  label: string;
  /** 要介護認定等基準時間の下限（分）。非該当は下限がない */
  minutesMin: number | null;
  /** 要介護認定等基準時間の上限（分）。要介護5は上限がない */
  minutesMax: number | null;
  /** 表示用の文言。★状態像を一切含まない★ */
  text: string;
  /** 要支援2・要介護1の振り分けの説明（同じ時間帯であるため） */
  note?: string;
  /** 同じ基準時間帯の他の区分（要支援2 ⇄ 要介護1） */
  sameRangeLabels: string[];
}

/**
 * ★★このツールの最重要論点★★
 * YN.noStateDefinition:「要介護度ごとの『状態像』を定義した公式規定は存在しない」
 * → 表示は要介護認定等基準時間のみ。まとめサイトに頻出する状態像による説明を書かない
 *   （その種の文言はここに例示すらしない。tests/kaigo-jikofutan.test.ts が全文を検査する）。
 *
 * ★罠11★ yokaigoNintei.levels と kubunShikyuGendo.levels の key は完全一致しない。
 * 経過的要介護は基準時間の定義を持たないため null を返す。
 */
export function ninteiDefinition(careLevel: string): NinteiDefinition | null {
  const l = YN.levels.find((x) => x.key === careLevel);
  if (!l) return null;

  const min = l.minutesMin;
  const max = l.minutesMax;
  const text =
    min === null
      ? `要介護認定等基準時間 ${max}分未満`
      : max === null
        ? `要介護認定等基準時間 ${min}分以上`
        : `要介護認定等基準時間 ${min}分以上${max}分未満`;

  // 同じ基準時間帯の区分（要支援2と要介護1は 32〜50分で同じ）
  const sameRangeLabels = YN.levels
    .filter((x) => x.key !== l.key && x.minutesMin === min && x.minutesMax === max)
    .map((x) => x.label);

  return {
    label: l.label,
    minutesMin: min,
    minutesMax: max,
    text,
    note: (l as { note?: string }).note,
    sameRangeLabels,
  };
}

/** 要介護認定等基準時間の但し書き（★必ず併記する★） */
export const NINTEI_NOTE = YN.note;
/** 状態像による定義が存在しないことの根拠 */
export const NO_STATE_DEFINITION = YN.noStateDefinition.value;
/** 認定の仕組み（要介護度を推定せず、申請へ案内するため） */
export const NINTEI_PROCESS = YN.process.value;

// ---------------------------------------------------------------- 総合

export interface KaigoResult {
  expired: boolean;
  futanWariai: FutanWariaiResult;
  tanka: TankaResult;
  /** 在宅サービスの試算（施設モードでも限度額の参考として計算する） */
  zaitaku: ZaitakuResult | null;
  /** 高額介護サービス費。★対象は限度額の範囲内の自己負担のみ★ */
  kougaku: KougakuResult | null;
  /** 補足給付（施設モードのみ） */
  hojokyufu: HojokyufuResult | null;
  nintei: NinteiDefinition | null;
  /** 月の負担の合計（在宅） */
  monthlyTotal: number | null;
  warnings: string[];
}

export function simulate(input: KaigoInput): KaigoResult {
  const expired = isDataExpired(kaigoHokenDataset, input.serviceDate);
  const futanWariai = judgeFutanWariai(input);
  const tanka = resolveTanka(input.grade);
  const zaitaku = calcZaitaku(input, futanWariai.rate10, tanka);
  const nintei = ninteiDefinition(input.careLevel);

  // ★罠7★ 高額介護サービス費の対象は「限度額の範囲内の自己負担」だけ。
  // 超過分（overFutan）と、施設の食費・居住費は入れない。
  const kougaku = zaitaku ? calcKougaku(input, zaitaku.withinFutan) : null;
  const hojokyufu = input.mode === "shisetsu" ? calcHojokyufu(input) : null;

  const warnings: string[] = [];
  if (!tanka.certain && tanka.note) warnings.push(tanka.note);
  if (zaitaku && zaitaku.overUnits > 0) {
    warnings.push(
      `区分支給限度基準額（${zaitaku.limitUnits.toLocaleString("ja-JP")}単位）を${zaitaku.overUnits.toLocaleString("ja-JP")}単位超えています。超えた分は全額（10割）が自己負担になり、高額介護サービス費の対象にもなりません。`,
    );
  }
  if (futanWariai.firstOnly) warnings.push(futanWariai.reason);
  if (
    hojokyufu &&
    input.taxStatus === "hikazei" &&
    isStageChangingAtAug2026(input.hojokyufuIncome)
  ) {
    warnings.push(
      `年金収入金額＋合計所得金額が${BOUNDARY_STAGE2_3A_BEFORE_AUG2026.toLocaleString("ja-JP")}円を超え${BOUNDARY_STAGE2_3A_FROM_AUG2026.toLocaleString("ja-JP")}円以下の方は、第2段階と第3段階①の境界の改定（2026年8月1日）をまたいで段階が変わります。2026年7月分までは第3段階①、8月分からは第2段階です。境界は老齢基礎年金の満額に連動して今後も改定されることがあります。`,
    );
  }
  if (hojokyufu?.stageResult.overSavings) warnings.push(hojokyufu.stageResult.reason);

  const monthlyTotal =
    zaitaku && kougaku ? kougaku.afterLimit + zaitaku.overFutan : null;

  return {
    expired,
    futanWariai,
    tanka,
    zaitaku,
    kougaku,
    hojokyufu,
    nintei,
    monthlyTotal: expired ? null : monthlyTotal,
    warnings,
  };
}

// ---------------------------------------------------------------- 表示用のデータ参照

export const CARE_LEVELS = KG.levels;
export const GRADES = TK.grades;
export const ROOM_TYPES = HK.fromAug2026.kyojuhi.map((r) => r.type);
export const KOUGAKU_BRACKETS = KK.brackets;
/** 「◯◯円への減額により生活保護の被保護者とならない場合」＝ 機械判定しない区分 */
export const GENKAKU_BRACKETS = KK.brackets.filter((b) => b.key.startsWith("genkaku-"));
export const FUTAN_WARIAI_NOTE = FW.note;
export const CURRENT_DISTRIBUTION = FW.currentDistribution.value;
export const KOUGAKU_EXCLUSION_NOTE = KK.note;
export const KUBUN_DESCRIPTION = KG.description;
export const HOJOKYUFU_STAGES_NOTE = HK.userStages.note;
export const BOUNDARY_RESOLUTION_NOTE = HK.userStages.boundaryResolution.value;
export const BOUNDARY_BASIS_RULE = HK.userStages.boundaryBasisRule.value;
export const TANKA_NOTE = TK.note;
export const BASE_YEAR_RULE_TEXT = KK.judgmentRules.baseYear.value;
export const TIMING_RULE_TEXT = KK.judgmentRules.timing.value;
export const TAXABLE_INCOME_DEFINITION = KK.judgmentRules.taxableIncomeDefinition.value;
