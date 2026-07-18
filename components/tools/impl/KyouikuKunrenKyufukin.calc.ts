/**
 * 資格・学び直し 費用と給付金（教育訓練給付）チェック（P3-T03）の計算ロジック本体。
 * 仕様: specs/b-tools/p3-t03-kyouiku-kunren-kyufukin.md
 *
 * 制度データは data/seido/kyouiku-kunren-kyufukin.json を単一の情報源(SSOT)とする。
 * 給付率・上限額・支給要件期間・暫定措置の期限など、すべて同JSONを import して参照し、
 * 本ファイルに数値やプロースをハードコードしない（制度が変わったらJSONだけ差し替える）。
 *
 * ★このファイルが守っている「罠」★（仕様書 §0〜§7）
 *   1. 一般・特定一般・専門実践で「支給要件期間（通算3年、初めて受給する場合は1〜2年）」の
 *      年数がそれぞれ異なる（専門実践だけ初回2年）。混同しない。
 *   2. 離職者は「離職の翌日から受講開始までの期間が1年以内」という要件がある。
 *      JSON上は専門実践の項目（leaverGracePeriod）だが、note に「3種類すべてに共通の要件」と
 *      明記されているため、一般・特定一般・専門実践の3区分すべてにこの値を適用する。
 *   3. 特定一般・専門実践の給付率の上乗せ（特定一般50%、専門実践70%/80%）は「差額精算」であり、
 *      基本給付に別枠で加算される額ではなく最終的な支給総額を指す。合算して二重計上しない。
 *   4. 専門実践教育訓練給付金は受講費用ベースの概算金額計算をしない（仕様書§5参照）。
 *      6か月ごとの分割支給・3段階の差額精算・年間上限・複数年度の合算が絡むため、
 *      率と上限額の提示にとどめる（一般・特定一般は単純な一括支給なので計算する）。
 *   5. 教育訓練支援給付金は令和8年度末（JSON の amendments の expiresOn の翌日）で
 *      暫定措置が終了する。期限は JSON の amendments から読み、日付をハードコードしない。
 *   6. 教育訓練休暇給付金の給付率・給付日数は JSON 上 value: null（未確認）。
 *      本ツールでは金額計算をせず、JSON の note をそのまま表示する。
 *   7. 教育訓練休暇給付金の要件①（休暇開始前2年間に12か月以上の被保険者期間）は
 *      「直近2年間の被保険者期間」を問うものだが、本ツールの入力は通算の被保険者期間のみ
 *      のため、月数を年換算した近似値で判定する（仕様書§6に明記）。
 */
import kyouikuKunrenKyufukin from "@/data/seido/kyouiku-kunren-kyufukin.json";
import { todayJst, type SeidoDataset } from "@/lib/tools/seido";

export const kyouikuKunrenKyufukinDataset = kyouikuKunrenKyufukin as unknown as SeidoDataset;

const D = kyouikuKunrenKyufukin.data;

export const DISCLAIMER = kyouikuKunrenKyufukin.disclaimer;

// ---------------------------------------------------------------- 共通の制度事実
export const MINIMUM_BENEFIT_AMOUNT = D.overview.minimumBenefitAmount.value;
export const MINIMUM_BENEFIT_AMOUNT_NOTE = D.overview.minimumBenefitAmount.note;
export const RE_RECEIPT_INTERVAL_TEXT = D.overview.reReceiptInterval.value;
export const RE_RECEIPT_INTERVAL_NOTE = D.overview.reReceiptInterval.note;
export const OVERVIEW_DESCRIPTION = D.overview.description;

/** 離職者の受講開始猶予期間（年）。専門実践のJSON項目だが3区分すべてに共通の要件（JSON note参照） */
export const LEAVER_GRACE_YEARS = D.senmonJissen.leaverGracePeriod.value;
export const LEAVER_GRACE_NOTE = D.senmonJissen.leaverGracePeriod.note;

// ---------------------------------------------------------------- 一般教育訓練給付金
export const IPPAN_BENEFIT_RATE = D.ippan.benefitRate.value;
export const IPPAN_BENEFIT_CAP = D.ippan.benefitCap.value;
export const IPPAN_ELIGIBILITY_YEARS = D.ippan.eligibilityPeriod.value;
export const IPPAN_ELIGIBILITY_YEARS_FIRST_TIME = D.ippan.eligibilityPeriodFirstTime.value;
export const IPPAN_APPLICATION_DEADLINE = D.ippan.applicationDeadline.value;
export const IPPAN_APPLICATION_DEADLINE_NOTE = D.ippan.applicationDeadline.note;
export const IPPAN_CAREER_CONSULTING_NOTE = D.ippan.careerConsultingRequired.note;

// ---------------------------------------------------------------- 特定一般教育訓練給付金
export const TOKUTEI_IPPAN_BENEFIT_RATE = D.tokuteiIppan.benefitRate.value;
export const TOKUTEI_IPPAN_BENEFIT_CAP = D.tokuteiIppan.benefitCap.value;
export const TOKUTEI_IPPAN_BENEFIT_RATE_AFTER = D.tokuteiIppan.benefitRateAfterQualification.value;
export const TOKUTEI_IPPAN_BENEFIT_CAP_AFTER = D.tokuteiIppan.benefitCapAfterQualification.value;
export const TOKUTEI_IPPAN_AFTER_QUALIFICATION_NOTE = D.tokuteiIppan.benefitRateAfterQualification.note;
export const TOKUTEI_IPPAN_QUALIFICATION_CONDITION = D.tokuteiIppan.qualificationCondition.value;
export const TOKUTEI_IPPAN_ELIGIBILITY_YEARS = D.tokuteiIppan.eligibilityPeriod.value;
export const TOKUTEI_IPPAN_ELIGIBILITY_YEARS_FIRST_TIME = D.tokuteiIppan.eligibilityPeriodFirstTime.value;
export const TOKUTEI_IPPAN_PRIOR_PROCEDURE_DEADLINE = D.tokuteiIppan.priorProcedureDeadline.value;
export const TOKUTEI_IPPAN_PRIOR_PROCEDURE_NOTE = D.tokuteiIppan.priorProcedureDeadline.note;
export const TOKUTEI_IPPAN_APPLICATION_DEADLINE = D.tokuteiIppan.applicationDeadline.value;

// ---------------------------------------------------------------- 専門実践教育訓練給付金
export const SENMON_JISSEN_STAGES = D.senmonJissen.stages.rows;
export const SENMON_JISSEN_STAGES_NOTE = D.senmonJissen.stages.note;
export const SENMON_JISSEN_WAGE_INCREASE_THRESHOLD = D.senmonJissen.wageIncreaseThreshold.value;
export const SENMON_JISSEN_MAX_YEARS = D.senmonJissen.maxYears.value;
export const SENMON_JISSEN_MAX_TOTAL_BENEFIT = D.senmonJissen.maxTotalBenefit.value;
export const SENMON_JISSEN_MAX_TOTAL_BENEFIT_NOTE = D.senmonJissen.maxTotalBenefit.note;
export const SENMON_JISSEN_ELIGIBILITY_YEARS = D.senmonJissen.eligibilityPeriod.value;
export const SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME = D.senmonJissen.eligibilityPeriodFirstTime.value;
export const SENMON_JISSEN_PRIOR_PROCEDURE_DEADLINE = D.senmonJissen.priorProcedureDeadline.value;
export const SENMON_JISSEN_PRIOR_PROCEDURE_NOTE = D.senmonJissen.priorProcedureDeadline.note;

// ---------------------------------------------------------------- 教育訓練支援給付金
export const SHIEN_BENEFIT_RATE = D.shienKyufukin.benefitRate.value;
export const SHIEN_BENEFIT_RATE_NOTE = D.shienKyufukin.benefitRate.amendmentNote;
export const SHIEN_PROVISIONAL_MEASURE_TEXT = D.shienKyufukin.provisionalMeasureUntil.value;
export const SHIEN_PROVISIONAL_MEASURE_NOTE = D.shienKyufukin.provisionalMeasureUntil.note;
export const SHIEN_AGE_LIMIT = D.shienKyufukin.ageLimit.value;
export const SHIEN_EXCLUDED_TRAINING_TYPES = D.shienKyufukin.excludedTrainingTypes.value;
export const SHIEN_CERTIFICATION_INTERVAL = D.shienKyufukin.certificationInterval.value;

// ---------------------------------------------------------------- 教育訓練休暇給付金
export const KYUUKA_ESTABLISHED_ON = D.kyuukaKyufukin.establishedOn.value;
export const KYUUKA_MINIMUM_LEAVE_DAYS = D.kyuukaKyufukin.minimumLeaveDays.value;
export const KYUUKA_MINIMUM_LEAVE_NOTE = D.kyuukaKyufukin.minimumLeaveDays.note;
export const KYUUKA_REQUIREMENT_INSURED_MONTHS = D.kyuukaKyufukin.requirementInsuredMonths.value;
export const KYUUKA_REQUIREMENT_ENROLLMENT_YEARS = D.kyuukaKyufukin.requirementEnrollmentYears.value;
export const KYUUKA_REQUIREMENT_ENROLLMENT_YEARS_NOTE = D.kyuukaKyufukin.requirementEnrollmentYears.note;
export const KYUUKA_EMPLOYER_APPROVAL_REQUIRED = D.kyuukaKyufukin.employerApprovalRequired.value;
export const KYUUKA_EMPLOYER_APPROVAL_NOTE = D.kyuukaKyufukin.employerApprovalRequired.note;
export const KYUUKA_BENEFIT_RATE_NOTE = D.kyuukaKyufukin.benefitRate.note;
export const KYUUKA_BENEFIT_DAYS_NOTE = D.kyuukaKyufukin.benefitDays.note;

// ---------------------------------------------------------------- 入力

export type CourseType = "ippan" | "tokuteiIppan" | "senmonJissen" | "unsure";
export type EmploymentStatus = "employed" | "leftJob";

export interface KyouikuKunrenKyufukinInput {
  /** 雇用保険の被保険者期間（通算・年）。1年未満は小数可（例: 1.5） */
  insuredYears: number;
  /** 初めて教育訓練給付金を受給しようとするか（過去に受給したことがない） */
  isFirstTime: boolean;
  /** 在職中か、離職しているか */
  employmentStatus: EmploymentStatus;
  /** 離職している場合の、離職日の翌日からの経過期間（月）。在職中は無視される */
  monthsSinceLeaving: number;
  /** 受講予定・受講中の講座の種類。分からない場合は "unsure" */
  courseType: CourseType;
  /** 受講費用の見込み（円）。任意。入力があれば一般・特定一般教育訓練の概算給付額を計算する */
  trainingCost?: number;
}

// ---------------------------------------------------------------- 結果

export type CategoryStatus = "target" | "notTarget" | "notApplicable";

export const STATUS_LABEL: Record<CategoryStatus, string> = {
  target: "支給要件を満たす見込み",
  notTarget: "対象外",
  notApplicable: "対象区分外",
};

export type CategoryKey =
  | "ippan"
  | "tokuteiIppan"
  | "senmonJissen"
  | "shienKyufukin"
  | "kyuukaKyufukin";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  ippan: "一般教育訓練給付金",
  tokuteiIppan: "特定一般教育訓練給付金",
  senmonJissen: "専門実践教育訓練給付金",
  shienKyufukin: "教育訓練支援給付金",
  kyuukaKyufukin: "教育訓練休暇給付金",
};

export interface CategoryResult {
  key: CategoryKey;
  label: string;
  status: CategoryStatus;
  statusLabel: string;
  /** 表示する給付率・上限額・要件期間などの説明文（すべてJSONの value フィールド由来） */
  numbers: string[];
  /** 判定理由・注記（JSONの note/amendmentNote の原文を含む） */
  notes: string[];
  /** 受講費用の入力がある場合の概算給付額（円）。上限適用後、4,000円以下は0 */
  estimatedBenefit?: number;
}

export interface KyouikuKunrenKyufukinResult {
  categories: CategoryResult[];
  /** 5区分のうち1つでも「支給要件を満たす見込み」があるか */
  anyTarget: boolean;
  /** 5区分に共通する注記（常時表示） */
  overviewNotes: string[];
}

// ---------------------------------------------------------------- 判定ヘルパー

function meetsInsuredPeriod(
  insuredYears: number,
  isFirstTime: boolean,
  normalYears: number,
  firstTimeYears: number,
): boolean {
  if (insuredYears >= normalYears) return true;
  if (isFirstTime && insuredYears >= firstTimeYears) return true;
  return false;
}

function isLeaverExpired(employmentStatus: EmploymentStatus, monthsSinceLeaving: number): boolean {
  if (employmentStatus !== "leftJob") return false;
  return monthsSinceLeaving > LEAVER_GRACE_YEARS * 12;
}

function yen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

/** 計算した支給額が data.overview.minimumBenefitAmount（4,000円）以下の場合は支給されない */
function applyMinimumFloor(amount: number): number {
  return amount <= MINIMUM_BENEFIT_AMOUNT ? 0 : Math.round(amount);
}

/**
 * 教育訓練支援給付金の暫定措置が期限切れかどうか。
 * JSON の amendments から「教育訓練支援給付金」に言及する status="expires" の項目を探し、
 * その expiresOn を基準日と比較する（日付をハードコードしない）。
 */
export function isShienKyufukinProvisionalExpired(today: string): boolean {
  const amendment = (kyouikuKunrenKyufukin.amendments ?? []).find(
    (a) => a.status === "expires" && a.summary.includes("教育訓練支援給付金"),
  );
  if (!amendment || !amendment.expiresOn) return false;
  return today > amendment.expiresOn;
}

// ---------------------------------------------------------------- 区分ごとの判定

function buildIppan(input: KyouikuKunrenKyufukinInput): CategoryResult {
  const notes: string[] = [];
  const courseMismatch = input.courseType !== "unsure" && input.courseType !== "ippan";
  const meetsPeriod = meetsInsuredPeriod(
    input.insuredYears,
    input.isFirstTime,
    IPPAN_ELIGIBILITY_YEARS,
    IPPAN_ELIGIBILITY_YEARS_FIRST_TIME,
  );
  const leaverExpired = isLeaverExpired(input.employmentStatus, input.monthsSinceLeaving);

  let status: CategoryStatus;
  if (courseMismatch) {
    status = "notApplicable";
    notes.push(
      "選択した受講予定の講座が一般教育訓練ではないため、この区分は対象外です（参考情報として表示しています）。",
    );
  } else if (!meetsPeriod) {
    status = "notTarget";
    notes.push(
      `支給要件期間（通算${IPPAN_ELIGIBILITY_YEARS}年以上。初めて受給する場合は${IPPAN_ELIGIBILITY_YEARS_FIRST_TIME}年以上）を満たしていません（入力値: 被保険者期間${input.insuredYears}年）。`,
    );
  } else if (leaverExpired) {
    status = "notTarget";
    notes.push(LEAVER_GRACE_NOTE);
  } else {
    status = "target";
  }

  notes.push(`申請期限の目安: ${IPPAN_APPLICATION_DEADLINE}`, IPPAN_APPLICATION_DEADLINE_NOTE);
  notes.push(IPPAN_CAREER_CONSULTING_NOTE);

  let estimatedBenefit: number | undefined;
  if (status === "target" && input.trainingCost !== undefined && input.trainingCost > 0) {
    const raw = Math.min(input.trainingCost * IPPAN_BENEFIT_RATE, IPPAN_BENEFIT_CAP);
    estimatedBenefit = applyMinimumFloor(raw);
    if (estimatedBenefit === 0) notes.push(MINIMUM_BENEFIT_AMOUNT_NOTE);
  }

  return {
    key: "ippan",
    label: CATEGORY_LABELS.ippan,
    status,
    statusLabel: STATUS_LABEL[status],
    numbers: [
      `給付率: 教育訓練経費の${IPPAN_BENEFIT_RATE * 100}%（上限${yen(IPPAN_BENEFIT_CAP)}）`,
      `支給要件期間: 通算${IPPAN_ELIGIBILITY_YEARS}年以上（初めて受給する場合は${IPPAN_ELIGIBILITY_YEARS_FIRST_TIME}年以上）`,
    ],
    notes,
    estimatedBenefit,
  };
}

function buildTokuteiIppan(input: KyouikuKunrenKyufukinInput): CategoryResult {
  const notes: string[] = [];
  const courseMismatch = input.courseType !== "unsure" && input.courseType !== "tokuteiIppan";
  const meetsPeriod = meetsInsuredPeriod(
    input.insuredYears,
    input.isFirstTime,
    TOKUTEI_IPPAN_ELIGIBILITY_YEARS,
    TOKUTEI_IPPAN_ELIGIBILITY_YEARS_FIRST_TIME,
  );
  const leaverExpired = isLeaverExpired(input.employmentStatus, input.monthsSinceLeaving);

  let status: CategoryStatus;
  if (courseMismatch) {
    status = "notApplicable";
    notes.push(
      "選択した受講予定の講座が特定一般教育訓練ではないため、この区分は対象外です（参考情報として表示しています）。",
    );
  } else if (!meetsPeriod) {
    status = "notTarget";
    notes.push(
      `支給要件期間（通算${TOKUTEI_IPPAN_ELIGIBILITY_YEARS}年以上。初めて受給する場合は${TOKUTEI_IPPAN_ELIGIBILITY_YEARS_FIRST_TIME}年以上）を満たしていません（入力値: 被保険者期間${input.insuredYears}年）。`,
    );
  } else if (leaverExpired) {
    status = "notTarget";
    notes.push(LEAVER_GRACE_NOTE);
  } else {
    status = "target";
  }

  notes.push(TOKUTEI_IPPAN_PRIOR_PROCEDURE_NOTE, `事前手続きの期限: ${TOKUTEI_IPPAN_PRIOR_PROCEDURE_DEADLINE}`);
  notes.push(`申請期限の目安: ${TOKUTEI_IPPAN_APPLICATION_DEADLINE}`);
  notes.push(TOKUTEI_IPPAN_AFTER_QUALIFICATION_NOTE, TOKUTEI_IPPAN_QUALIFICATION_CONDITION);

  let estimatedBenefit: number | undefined;
  if (status === "target" && input.trainingCost !== undefined && input.trainingCost > 0) {
    const baseRaw = Math.min(input.trainingCost * TOKUTEI_IPPAN_BENEFIT_RATE, TOKUTEI_IPPAN_BENEFIT_CAP);
    estimatedBenefit = applyMinimumFloor(baseRaw);
    const afterRaw = Math.min(
      input.trainingCost * TOKUTEI_IPPAN_BENEFIT_RATE_AFTER,
      TOKUTEI_IPPAN_BENEFIT_CAP_AFTER,
    );
    const afterAmount = applyMinimumFloor(afterRaw);
    notes.push(
      `資格取得と就職の両方の条件を満たした場合の見込み合計額: 概算${yen(afterAmount)}（差額精算のため、基本給付の${yen(estimatedBenefit)}に追加されるのではなく、合計でこの額になります）。`,
    );
    if (estimatedBenefit === 0) notes.push(MINIMUM_BENEFIT_AMOUNT_NOTE);
  }

  return {
    key: "tokuteiIppan",
    label: CATEGORY_LABELS.tokuteiIppan,
    status,
    statusLabel: STATUS_LABEL[status],
    numbers: [
      `給付率: 教育訓練経費の${TOKUTEI_IPPAN_BENEFIT_RATE * 100}%（上限${yen(TOKUTEI_IPPAN_BENEFIT_CAP)}）`,
      `資格取得＋就職した場合: ${TOKUTEI_IPPAN_BENEFIT_RATE_AFTER * 100}%（上限${yen(TOKUTEI_IPPAN_BENEFIT_CAP_AFTER)}）`,
      `支給要件期間: 通算${TOKUTEI_IPPAN_ELIGIBILITY_YEARS}年以上（初めて受給する場合は${TOKUTEI_IPPAN_ELIGIBILITY_YEARS_FIRST_TIME}年以上）`,
    ],
    notes,
    estimatedBenefit,
  };
}

function buildSenmonJissen(input: KyouikuKunrenKyufukinInput): CategoryResult {
  const notes: string[] = [];
  const courseMismatch = input.courseType !== "unsure" && input.courseType !== "senmonJissen";
  const meetsPeriod = meetsInsuredPeriod(
    input.insuredYears,
    input.isFirstTime,
    SENMON_JISSEN_ELIGIBILITY_YEARS,
    SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME,
  );
  const leaverExpired = isLeaverExpired(input.employmentStatus, input.monthsSinceLeaving);

  let status: CategoryStatus;
  if (courseMismatch) {
    status = "notApplicable";
    notes.push(
      "選択した受講予定の講座が専門実践教育訓練ではないため、この区分は対象外です（参考情報として表示しています）。",
    );
  } else if (!meetsPeriod) {
    status = "notTarget";
    notes.push(
      `支給要件期間（通算${SENMON_JISSEN_ELIGIBILITY_YEARS}年以上。初めて受給する場合は${SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME}年以上）を満たしていません（入力値: 被保険者期間${input.insuredYears}年）。`,
    );
  } else if (leaverExpired) {
    status = "notTarget";
    notes.push(LEAVER_GRACE_NOTE);
  } else {
    status = "target";
  }

  notes.push(SENMON_JISSEN_PRIOR_PROCEDURE_NOTE, `事前手続きの期限: ${SENMON_JISSEN_PRIOR_PROCEDURE_DEADLINE}`);
  notes.push(SENMON_JISSEN_STAGES_NOTE, SENMON_JISSEN_MAX_TOTAL_BENEFIT_NOTE);
  for (const row of SENMON_JISSEN_STAGES) {
    if (row.note) notes.push(`第${row.stage}段階: ${row.note}`);
  }
  notes.push(
    "受講費用に対する概算給付額の計算は行っていません。6か月ごとの分割支給・3段階の差額精算・年間上限・複数年度の合算が絡むため、率と上限額の目安提示にとどめています。詳しい見込み額はハローワークにご相談ください。",
  );

  return {
    key: "senmonJissen",
    label: CATEGORY_LABELS.senmonJissen,
    status,
    statusLabel: STATUS_LABEL[status],
    numbers: [
      ...SENMON_JISSEN_STAGES.map(
        (row) => `第${row.stage}段階: ${row.rate * 100}%（年間上限${yen(row.annualCap)}） - ${row.condition}`,
      ),
      `最大受給期間: ${SENMON_JISSEN_MAX_YEARS}年`,
      `受給総額の上限（最大年数・最高給付率の場合）: ${yen(SENMON_JISSEN_MAX_TOTAL_BENEFIT)}`,
      `支給要件期間: 通算${SENMON_JISSEN_ELIGIBILITY_YEARS}年以上（初めて受給する場合は${SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME}年以上）`,
    ],
    notes,
  };
}

function buildShienKyufukin(input: KyouikuKunrenKyufukinInput, today: string): CategoryResult {
  const notes: string[] = [];
  const courseMismatch = input.courseType !== "unsure" && input.courseType !== "senmonJissen";
  const senmonMeetsPeriod = meetsInsuredPeriod(
    input.insuredYears,
    input.isFirstTime,
    SENMON_JISSEN_ELIGIBILITY_YEARS,
    SENMON_JISSEN_ELIGIBILITY_YEARS_FIRST_TIME,
  );
  const leaverExpired = isLeaverExpired(input.employmentStatus, input.monthsSinceLeaving);
  const provisionalExpired = isShienKyufukinProvisionalExpired(today);

  let status: CategoryStatus;
  if (courseMismatch) {
    status = "notApplicable";
    notes.push(
      "専門実践教育訓練を受講する場合のみが対象の給付金です。選択した受講予定の講座が専門実践教育訓練ではないため、この区分は対象外です。",
    );
  } else if (provisionalExpired) {
    status = "notTarget";
    notes.push(SHIEN_PROVISIONAL_MEASURE_NOTE, `暫定措置の期限: ${SHIEN_PROVISIONAL_MEASURE_TEXT}`);
  } else if (input.employmentStatus !== "leftJob") {
    status = "notTarget";
    notes.push("在職中は対象になりません。専門実践教育訓練を受講する失業状態の方向けの給付です。");
  } else if (!senmonMeetsPeriod || leaverExpired) {
    status = "notTarget";
    notes.push(
      "専門実践教育訓練給付金の支給要件（被保険者期間・離職からの経過期間）を満たさないため、教育訓練支援給付金も対象になりません。",
    );
  } else {
    status = "target";
  }

  notes.push(
    `対象年齢: 受講開始時に${SHIEN_AGE_LIMIT}歳未満（本ツールは年齢を入力していないため、別途ご確認ください）。`,
  );
  notes.push(SHIEN_EXCLUDED_TRAINING_TYPES);
  notes.push(`失業認定の頻度: ${SHIEN_CERTIFICATION_INTERVAL}`);
  notes.push(SHIEN_BENEFIT_RATE_NOTE);
  if (!provisionalExpired) notes.push(SHIEN_PROVISIONAL_MEASURE_NOTE);

  return {
    key: "shienKyufukin",
    label: CATEGORY_LABELS.shienKyufukin,
    status,
    statusLabel: STATUS_LABEL[status],
    numbers: [
      `給付率: 雇用保険の基本手当日額の${SHIEN_BENEFIT_RATE * 100}%`,
      `暫定措置の期限: ${SHIEN_PROVISIONAL_MEASURE_TEXT}`,
    ],
    notes,
  };
}

function buildKyuukaKyufukin(input: KyouikuKunrenKyufukinInput): CategoryResult {
  const notes: string[] = [];

  // 要件①（休暇開始前2年間に12か月以上の被保険者期間）は「直近2年間の実績」を問うが、
  // 本ツールの入力は通算の被保険者期間のみのため、月数を年換算した近似値で判定する。
  const meetsRequirement1Approx = input.insuredYears >= KYUUKA_REQUIREMENT_INSURED_MONTHS / 12;
  const meetsRequirement2 = input.insuredYears >= KYUUKA_REQUIREMENT_ENROLLMENT_YEARS;
  const meetsEither = meetsRequirement1Approx || meetsRequirement2;

  let status: CategoryStatus;
  if (input.employmentStatus !== "employed") {
    status = "notTarget";
    notes.push(
      "離職者向けの給付ではありません。在職中に、就業規則等に基づく教育訓練休暇を取得する方向けの給付です。",
    );
  } else if (!meetsEither) {
    status = "notTarget";
    notes.push(`要件①・要件②のいずれも満たしていません（入力値: 被保険者期間${input.insuredYears}年）。`);
  } else {
    status = "target";
  }

  notes.push(
    `要件①: 休暇開始前2年間に${KYUUKA_REQUIREMENT_INSURED_MONTHS}か月以上の被保険者期間（本ツールでは通算の被保険者期間を年換算して近似判定しており、直近2年間の実績とは異なる場合があります）。`,
  );
  notes.push(
    `要件②: 休暇開始前に${KYUUKA_REQUIREMENT_ENROLLMENT_YEARS}年以上の雇用保険加入期間。${KYUUKA_REQUIREMENT_ENROLLMENT_YEARS_NOTE}`,
  );
  notes.push(KYUUKA_MINIMUM_LEAVE_NOTE);
  notes.push(KYUUKA_EMPLOYER_APPROVAL_NOTE);
  notes.push(KYUUKA_BENEFIT_RATE_NOTE);
  notes.push(KYUUKA_BENEFIT_DAYS_NOTE);

  return {
    key: "kyuukaKyufukin",
    label: CATEGORY_LABELS.kyuukaKyufukin,
    status,
    statusLabel: STATUS_LABEL[status],
    numbers: [
      `創設日: ${KYUUKA_ESTABLISHED_ON}`,
      `対象となる休暇: 連続${KYUUKA_MINIMUM_LEAVE_DAYS}日以上・無給の教育訓練休暇`,
      `要件①: 休暇開始前2年間に${KYUUKA_REQUIREMENT_INSURED_MONTHS}か月以上の被保険者期間`,
      `要件②: 休暇開始前に${KYUUKA_REQUIREMENT_ENROLLMENT_YEARS}年以上の雇用保険加入期間`,
      "給付率・給付日数: 2026-07-17時点で未確認（下記の注記を参照）",
    ],
    notes,
  };
}

// ---------------------------------------------------------------- 全区分の判定

export function evaluateKyouikuKunrenKyufukin(
  input: KyouikuKunrenKyufukinInput,
  today: string = todayJst(),
): KyouikuKunrenKyufukinResult {
  const categories: CategoryResult[] = [
    buildIppan(input),
    buildTokuteiIppan(input),
    buildSenmonJissen(input),
    buildShienKyufukin(input, today),
    buildKyuukaKyufukin(input),
  ];

  return {
    categories,
    anyTarget: categories.some((c) => c.status === "target"),
    overviewNotes: [OVERVIEW_DESCRIPTION, RE_RECEIPT_INTERVAL_TEXT, MINIMUM_BENEFIT_AMOUNT_NOTE],
  };
}

// ---------------------------------------------------------------- バリデーション付きエントリポイント

export type KyouikuKunrenKyufukinCalcResult =
  | { ok: true; result: KyouikuKunrenKyufukinResult }
  | { ok: false; error: string };

export function calculateKyouikuKunrenKyufukin(
  input: Partial<KyouikuKunrenKyufukinInput>,
  today: string = todayJst(),
): KyouikuKunrenKyufukinCalcResult {
  if (
    input.insuredYears === undefined ||
    input.insuredYears === null ||
    Number.isNaN(input.insuredYears)
  ) {
    return { ok: false, error: "雇用保険の被保険者期間（年）を入力してください" };
  }
  if (input.insuredYears < 0) {
    return { ok: false, error: "被保険者期間は0以上の数値で入力してください" };
  }
  if (!input.employmentStatus) {
    return { ok: false, error: "在職中か離職しているかを選択してください" };
  }
  if (input.employmentStatus === "leftJob") {
    if (
      input.monthsSinceLeaving === undefined ||
      input.monthsSinceLeaving === null ||
      Number.isNaN(input.monthsSinceLeaving)
    ) {
      return { ok: false, error: "離職してからの経過期間（月）を入力してください" };
    }
    if (input.monthsSinceLeaving < 0) {
      return { ok: false, error: "離職してからの経過期間は0以上の数値で入力してください" };
    }
  }
  if (!input.courseType) {
    return {
      ok: false,
      error: "受講予定・受講中の講座の種類を選択してください（分からない場合は「わからない」を選べます）",
    };
  }
  if (input.trainingCost !== undefined && input.trainingCost !== null && input.trainingCost < 0) {
    return { ok: false, error: "受講費用は0以上の数値で入力してください" };
  }

  const normalized: KyouikuKunrenKyufukinInput = {
    insuredYears: input.insuredYears,
    isFirstTime: input.isFirstTime ?? false,
    employmentStatus: input.employmentStatus,
    monthsSinceLeaving: input.employmentStatus === "leftJob" ? (input.monthsSinceLeaving as number) : 0,
    courseType: input.courseType,
    trainingCost:
      input.trainingCost === undefined || input.trainingCost === null ? undefined : input.trainingCost,
  };

  return { ok: true, result: evaluateKyouikuKunrenKyufukin(normalized, today) };
}
