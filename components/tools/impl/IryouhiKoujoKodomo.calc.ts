/*
 * 子ども関連の医療費控除 対象チェック（P3-T04）— 計算ロジック本体（純関数）。
 * 仕様: specs/b-tools/p3-t04-iryouhi-koujo-kodomo.md
 *
 * SSOT: data/seido/iryouhi-koujo-kodomo.json（国税庁タックスアンサー No.1120/1122/1124/1128、
 * 質疑応答事例、所得税法第73条）。控除額の算定式・上限・足切り・対象/対象外の別・
 * セルフメディケーション税制の数値はすべて同JSONから読み、本ファイルにハードコードしない。
 *
 * ★実装上の最重要ロジック（compensationDeduction.perExpenseLimitRule）★
 *   保険金・出産育児一時金などの補てん額は、合計額から一括で差し引くのではなく、
 *   「その給付の目的となった医療費」を限度として個別に差し引く。引ききれない金額が
 *   生じても他の医療費からは差し引かない。子育て世帯で最も多い誤りは、出産育児一時金が
 *   出産費用を上回った場合に、その余りを他の（例えば子どもの歯科治療費などの）医療費から
 *   差し引いてしまうこと（過小評価の誤り）。本ツールは入力を「出産費用」と「それ以外の
 *   医療費」の2バケットに分け、それぞれに対応する補てん額をバケットの範囲内でのみ
 *   相殺することで、この個別対応の原則を再現する。
 *
 * ★もう1つの重要ロジック（calculation.thresholdRate/thresholdFixed）★
 *   足切り額は「10万円（総所得金額等が200万円未満の人は総所得金額等の5%）」だが、
 *   所得税法第73条の条文は「総所得金額等の5%に相当する金額（その金額が10万円を超える
 *   場合には10万円）」という一本の式であり、200万円（=10万円÷5%）がちょうど分岐点になる。
 *   min(totalIncome * thresholdRate, thresholdFixed) が両者と数学的に同値であることを
 *   テストで確認している。
 */
import seido from "@/data/seido/iryouhi-koujo-kodomo.json";
import { isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const iryouhiKoujoDataset = seido as unknown as SeidoDataset;
export const IRYOUHI_KOUJO_DISCLAIMER: string = seido.disclaimer;

const CALC = seido.data.calculation;
const COMP = seido.data.compensationDeduction;
const SELF_MED = seido.data.selfMedication;
const PROCEDURE = seido.data.procedure;
const OVERVIEW = seido.data.overview;

// ---------------------------------------------------------------- SSOT由来の定数

/** 医療費控除額の上限（200万円）。所得税法第73条第1項 */
export const MAX_DEDUCTION: number = CALC.maxDeduction.value;
/** 足切り額（原則・10万円） */
export const THRESHOLD_FIXED: number = CALC.thresholdFixed.value;
/** 総所得金額等が200万円未満の場合の足切り率（5%） */
export const THRESHOLD_RATE: number = CALC.thresholdRate.value;
/** 足切り額が10万円から5%基準に切り替わる総所得金額等の分岐点（200万円） */
export const THRESHOLD_SWITCH_INCOME: number = CALC.thresholdSwitchIncome.value;

/** 補てん金の個別対応の原則（出産育児一時金は出産費用からのみ差し引く 等） */
export const PER_EXPENSE_LIMIT_RULE_NOTE: string = COMP.perExpenseLimitRule.value;
/** 出産育児一時金等は医療費から差し引かなければならないという原則 */
export const SHUSSAN_ICHIJIKIN_NOTE: string = COMP.shussanIchijikin.value;
/** 出産手当金は補てん額として差し引く必要がない（休業補償の性格のため） */
export const SHUSSAN_TEATEKIN_SHOULD_DEDUCT: boolean = COMP.shussanTeatekin.value;
export const SHUSSAN_TEATEKIN_NOTE: string = COMP.shussanTeatekin.note ?? "";
/** 自治体の子ども医療費助成を差し引くべきかは一次情報で確定できていない（value: null） */
export const KODOMO_IRYOUHI_JYOSEI_UNCERTAIN_NOTE: string = COMP.kodomoIryouhiJyosei.note ?? "";

/** 還付額は「控除額」そのものではなく「控除額×適用税率」であるという注記 */
export const REFUND_NOTE: string = CALC.refundNote.value;

/** セルフメディケーション税制が通常の医療費控除との選択制（併用不可）であること */
export const SELF_MEDICATION_IS_EXCLUSIVE_CHOICE: boolean = SELF_MED.isExclusiveChoice.value;
/** セルフメディケーション税制の足切り額（12,000円） */
export const SELF_MEDICATION_THRESHOLD: number = SELF_MED.threshold.value;
/** セルフメディケーション税制の控除限度額（88,000円） */
export const SELF_MEDICATION_MAX_DEDUCTION: number = SELF_MED.maxDeduction.value;
/** セルフメディケーション税制の適用要件（本人が健康診査・予防接種等の取組を行っていること） */
export const SELF_MEDICATION_REQUIREMENT: string = SELF_MED.requirement.value;
/** セルフメディケーション税制の適用期間（令和8年12月31日までの支払いが対象） */
export const SELF_MEDICATION_APPLICABLE_PERIOD: string = SELF_MED.applicablePeriod.value;

/**
 * 対象品目（特定一般用医薬品等）の確認方法（P4-T03）。
 * ★取り込み方針★ 厚生労働省の対象品目一覧（商品名・製造販売業者名・成分名の一覧）は
 * 「必要に応じて１ヶ月に１回更新」される（月次更新）ため、個々の商品名をSSOT化すると
 * 即座に陳腐化する。かわりに、購入時点でその場で確認できる安定した確認方法（共通識別マーク・
 * レシート表示）を案内し、網羅的な最新リストが必要な場合は厚生労働省の一覧ページへ誘導する。
 */
export const SELF_MEDICATION_IDENTIFICATION_NOTE: string = SELF_MED.eligibleProductIdentification.value;

export interface IdentificationMethod {
  key: "mark" | "list" | "receipt";
  label: string;
  description: string;
}

/** UI表示用に構造化した3つの確認方法（★本文はSELF_MEDICATION_IDENTIFICATION_NOTEの分解であり、データを追加していない★） */
export const SELF_MEDICATION_IDENTIFICATION_METHODS: IdentificationMethod[] = [
  {
    key: "mark",
    label: "共通識別マークで確認する",
    description: "対象医薬品の一部は、パッケージに「セルフメディケーション税制の対象である旨を示す識別マーク」が印刷されています。ただし全ての対象品目にマークがあるわけではないため、マークが無いことだけを理由に対象外と判断しないでください。",
  },
  {
    key: "receipt",
    label: "レシートの表示で確認する",
    description: "対象医薬品を扱う多くの薬局・ドラッグストアでは、レシート上に対象品目である旨のマーク（例: 「★」等の記号）が印字されます。購入時のレシートを保管し、確定申告の際の記録として使えます。",
  },
  {
    key: "list",
    label: "厚生労働省の対象品目一覧で確認する",
    description: "厚生労働省ホームページに、商品名・製造販売業者名・成分名を記載した対象品目一覧（PDF・EXCEL）が公表されています。月1回程度のペースで更新されるため、正確な最新情報はこちらで確認してください。",
  },
];

/** 厚生労働省「セルフメディケーション税制」ページ（対象品目一覧の掲載元）へのリンク */
export const MHLW_SELF_MEDICATION_LIST_URL = "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000124853.html";

/**
 * 対象品目の規模感（参考情報。時点付きのスナップショットであり、現在値ではない）。
 * ★断定しない★ ツールでは必ず時点を明記して表示すること（データのamendmentNote参照）。
 */
export const SELF_MEDICATION_SCALE_NOTE: string = SELF_MED.switchOtcIngredientCount.value;

/** 手続き関連 */
export const PROCEDURE_FILING_METHOD: string = PROCEDURE.filingMethod.value;
export const PROCEDURE_REQUIRED_DOCUMENTS: string = PROCEDURE.requiredDocuments.value;
export const PROCEDURE_RECEIPT_RETENTION_YEARS: number = PROCEDURE.receiptRetentionYears.value;
export const PROCEDURE_REFUND_FILING_YEARS: number = PROCEDURE.refundFilingYears.value;
export const PROCEDURE_GENSEN_CHOUSHUUHYOU_NOTE: string = PROCEDURE.gensenChoushuuhyou.value;

/** 「生計を一にする」家族全員の医療費を合算できるという範囲の説明 */
export const SCOPE_NOTE: string = OVERVIEW.scope.value;
export const SCOPE_DETAIL_NOTE: string = OVERVIEW.scope.note ?? "";

// ---------------------------------------------------------------- 対象/対象外チェックリスト（データから構造化）

export type Relevance = "high" | "medium" | "low";

export interface EligibleItem {
  no: number;
  text: string;
  exclusion?: string;
  relevance: Relevance;
}

/** タックスアンサー No.1122 の12類型（子育て世帯の関連度つき） */
export const ELIGIBLE_ITEMS: EligibleItem[] = seido.data.eligibleExpenses.categories.items.map((item) => ({
  no: item.no,
  text: item.text,
  exclusion: "exclusion" in item ? (item.exclusion as string | undefined) : undefined,
  relevance: item.relevance as Relevance,
}));

/** 判定が真偽値で表現できる子育て世帯の論点。value: true = 対象 / false = 対象外 */
export interface KosodateBooleanTopic {
  key: string;
  label: string;
  isEligible: boolean;
  note?: string;
}

/** 判定が一文の条件（真偽値で単純化できない）の論点。歯列矯正・歯科ローン等 */
export interface KosodateConditionalTopic {
  key: string;
  label: string;
  condition: string;
  note?: string;
}

const KT = seido.data.kosodateTopics;

export const KOSODATE_BOOLEAN_TOPICS: KosodateBooleanTopic[] = [
  { key: "shussanTeikikenshin", label: KT.shussanTeikikenshin.label, isEligible: KT.shussanTeikikenshin.value, note: KT.shussanTeikikenshin.note },
  { key: "shussanTsuuinhi", label: KT.shussanTsuuinhi.label, isEligible: KT.shussanTsuuinhi.value, note: KT.shussanTsuuinhi.note },
  { key: "shussanTaxi", label: KT.shussanTaxi.label, isEligible: KT.shussanTaxi.value, note: KT.shussanTaxi.note },
  { key: "jikkaKisei", label: KT.jikkaKisei.label, isEligible: KT.jikkaKisei.value, note: KT.jikkaKisei.note },
  { key: "nyuuinShokuji", label: KT.nyuuinShokuji.label, isEligible: KT.nyuuinShokuji.value, note: KT.nyuuinShokuji.note },
  { key: "minomawarihin", label: KT.minomawarihin.label, isEligible: KT.minomawarihin.value, note: KT.minomawarihin.note },
  { key: "funinChiryou", label: KT.funinChiryou.label, isEligible: KT.funinChiryou.value, note: KT.funinChiryou.note },
  { key: "tsukisoiKoutsuuhi", label: KT.tsukisoiKoutsuuhi.label, isEligible: KT.tsukisoiKoutsuuhi.value, note: KT.tsukisoiKoutsuuhi.note },
  { key: "kenkoushindan", label: KT.kenkoushindan.label, isEligible: KT.kenkoushindan.value, note: KT.kenkoushindan.note },
];

export const KOSODATE_CONDITIONAL_TOPICS: KosodateConditionalTopic[] = [
  { key: "shiretsuKyousei", label: KT.shiretsuKyousei.label, condition: KT.shiretsuKyousei.value, note: KT.shiretsuKyousei.note },
  { key: "shikaLoan", label: KT.shikaLoan.label, condition: KT.shikaLoan.value, note: KT.shikaLoan.note },
];

export interface ExcludedItem {
  key: string;
  label: string;
  note?: string;
}

const EX = seido.data.excludedExpenses;

/** 対象外となる主なもの（子育て世帯からの問い合わせが多いもの） */
export const EXCLUDED_ITEMS: ExcludedItem[] = [
  { key: "taxiOrdinary", label: EX.taxiOrdinary.label, note: EX.taxiOrdinary.note },
  { key: "gasolineParking", label: EX.gasolineParking.label, note: EX.gasolineParking.note },
  { key: "vitamins", label: EX.vitamins.label, note: EX.vitamins.note },
  { key: "familyTsukisoiRyou", label: EX.familyTsukisoiRyou.label, note: EX.familyTsukisoiRyou.note },
];

// ---------------------------------------------------------------- 入力・バリデーション

export interface IryouhiKoujoInput {
  /** 出産費用以外の医療費（通院費・治療費・医薬品代・歯科治療費など）の年間合計額（円） */
  otherMedicalExpenses: number;
  /** 出産費用（妊婦健診の自己負担・分娩費・入院費など）の年間合計額（円） */
  shussanHiyou: number;
  /** 出産育児一時金・家族出産育児一時金等の受取額（円） */
  shussanIchijikin: number;
  /** 出産費用以外の医療費に対する保険金・高額療養費等の補てん額の合計（円） */
  otherReimbursement: number;
  /** 総所得金額等（円）。給与のみの世帯は給与所得（収入−給与所得控除）に相当する額の目安 */
  totalIncome: number;
  /** セルフメディケーション税制の対象となる特定一般用医薬品等購入費（保険金等補てん後・円）。任意（未入力は0） */
  otcExpenses: number;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

function validateNonNegative(value: number, label: string): ValidationResult {
  if (!Number.isFinite(value)) {
    return { ok: false, error: `${label}を入力してください。` };
  }
  if (value < 0) {
    return { ok: false, error: `${label}は0円以上の金額で入力してください。` };
  }
  return { ok: true };
}

/** 入力全体のバリデーション。最初に見つかったエラーを返す */
export function validateIryouhiKoujoInput(input: IryouhiKoujoInput): ValidationResult {
  const checks: [number, string][] = [
    [input.otherMedicalExpenses, "出産費用以外の医療費"],
    [input.shussanHiyou, "出産費用"],
    [input.shussanIchijikin, "出産育児一時金等の受取額"],
    [input.otherReimbursement, "出産費用以外への保険金等の補てん額"],
    [input.totalIncome, "総所得金額等"],
    [input.otcExpenses, "特定一般用医薬品等購入費"],
  ];
  for (const [value, label] of checks) {
    const v = validateNonNegative(value, label);
    if (!v.ok) return v;
  }
  return { ok: true };
}

// ---------------------------------------------------------------- 計算本体

export type RecommendedChoice = "normal" | "selfMedication" | "either" | "none";

export interface IryouhiKoujoResult {
  ok: true;
  input: IryouhiKoujoInput;

  /** 支払った医療費の合計額（出産費用＋それ以外） */
  totalMedicalPaid: number;

  /** 出産費用に充当された出産育児一時金等（出産費用を限度） */
  shussanCompensationApplied: number;
  /** 出産育児一時金等のうち出産費用を上回った余り（他の医療費からは差し引かない） */
  shussanIchijikinExcess: number;
  /** 出産費用以外の医療費に充当された保険金等（その医療費を限度） */
  otherCompensationApplied: number;
  /** 出産費用以外への補てん額のうち、対応する医療費を上回った余り（他の医療費からは差し引かない） */
  otherReimbursementExcess: number;
  /** 差し引かれた補てん額の合計 */
  totalCompensationApplied: number;

  /** 医療費控除の計算式における「実際に支払った医療費の合計額−保険金等で補てんされる金額」 */
  netMedicalExpense: number;

  /** 足切り額（10万円と総所得金額等の5%のいずれか低い方） */
  threshold: number;
  /** 総所得金額等が200万円未満で5%基準が適用されたか */
  isLowIncomeBracket: boolean;

  /** 上限を適用する前の控除額（マイナスは0に切り下げ） */
  deductionBeforeCap: number;
  /** 医療費控除額（200万円上限を適用した最終値） */
  deductionAmount: number;
  /** 200万円の上限で頭打ちになったか */
  isCapped: boolean;

  /** セルフメディケーション税制の控除額（12,000円超・88,000円上限） */
  selfMedicationDeduction: number;
  /** セルフメディケーション税制の足切り（12,000円）を超えているか */
  selfMedicationEligible: boolean;

  /** 選択制（併用不可）のもとで、金額が大きい方の選択肢（両方0なら "none"、同額なら "either"） */
  recommendedChoice: RecommendedChoice;
}

export type IryouhiKoujoCalcResult =
  | IryouhiKoujoResult
  | { ok: false; expired: true }
  | { ok: false; expired: false; error: string };

/**
 * 医療費控除額（子育て世帯の観点）を計算する。
 * @param input 医療費・補てん額・総所得金額等の入力
 * @param today 基準日（ISO）。data/seido/iryouhi-koujo-kodomo.json の期限切れ判定に使う
 *   （セルフメディケーション税制は令和8年12月31日が適用期限のため、これを過ぎると
 *   制度データの更新が必要と判断し、計算を停止する）。
 */
export function calcIryouhiKoujo(input: IryouhiKoujoInput, today: string): IryouhiKoujoCalcResult {
  if (isDataExpired(iryouhiKoujoDataset, today)) {
    return { ok: false, expired: true };
  }

  const validation = validateIryouhiKoujoInput(input);
  if (!validation.ok) {
    return { ok: false, expired: false, error: validation.error! };
  }

  const totalMedicalPaid = input.otherMedicalExpenses + input.shussanHiyou;

  // ★個別対応の原則★ 補てん額は対応する医療費の範囲内でのみ相殺する
  const shussanCompensationApplied = Math.min(input.shussanIchijikin, input.shussanHiyou);
  const shussanIchijikinExcess = Math.max(0, input.shussanIchijikin - input.shussanHiyou);
  const otherCompensationApplied = Math.min(input.otherReimbursement, input.otherMedicalExpenses);
  const otherReimbursementExcess = Math.max(0, input.otherReimbursement - input.otherMedicalExpenses);
  const totalCompensationApplied = shussanCompensationApplied + otherCompensationApplied;

  const netMedicalExpense = totalMedicalPaid - totalCompensationApplied;

  // 所得税法第73条第1項: 総所得金額等の5%（10万円を超える場合は10万円）
  const threshold = Math.min(input.totalIncome * THRESHOLD_RATE, THRESHOLD_FIXED);
  const isLowIncomeBracket = input.totalIncome < THRESHOLD_SWITCH_INCOME;

  const deductionBeforeCap = Math.max(0, netMedicalExpense - threshold);
  const deductionAmount = Math.min(deductionBeforeCap, MAX_DEDUCTION);
  const isCapped = deductionBeforeCap > MAX_DEDUCTION;

  const selfMedicationEligible = input.otcExpenses > SELF_MEDICATION_THRESHOLD;
  const selfMedicationDeduction = selfMedicationEligible
    ? Math.min(input.otcExpenses - SELF_MEDICATION_THRESHOLD, SELF_MEDICATION_MAX_DEDUCTION)
    : 0;

  let recommendedChoice: RecommendedChoice;
  if (deductionAmount === 0 && selfMedicationDeduction === 0) {
    recommendedChoice = "none";
  } else if (deductionAmount === selfMedicationDeduction) {
    recommendedChoice = "either";
  } else if (deductionAmount > selfMedicationDeduction) {
    recommendedChoice = "normal";
  } else {
    recommendedChoice = "selfMedication";
  }

  return {
    ok: true,
    input,
    totalMedicalPaid,
    shussanCompensationApplied,
    shussanIchijikinExcess,
    otherCompensationApplied,
    otherReimbursementExcess,
    totalCompensationApplied,
    netMedicalExpense,
    threshold,
    isLowIncomeBracket,
    deductionBeforeCap,
    deductionAmount,
    isCapped,
    selfMedicationDeduction,
    selfMedicationEligible,
    recommendedChoice,
  };
}

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
