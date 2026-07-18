/**
 * チャイルドシート適合チェック（P3-T01）の計算・判定ロジック。
 * 仕様: specs/b-tools/p3-t01-child-seat-kitei.md
 *
 * すべての制度事実は data/seido/child-seat-kitei.json を単一の情報源(SSOT)とする。
 * 年齢のしきい値・違反点数・反則金の有無・安全基準の文言・統計値はすべて同JSONを
 * import して参照し、本ファイルには制度上の数値をハードコードしない
 * （官報・統計が更新されたら child-seat-kitei.json だけを差し替えれば追随する）。
 *
 * ★このファイルが守っている鉄則（★データの限界★）★
 *   1. 反則金（penalty.fineAmount）は null である。道路交通法第71条の3には罰則の
 *      規定が置かれていないため、交通反則通告制度上の「反則行為」に該当せず、
 *      反則金という概念自体が存在しない。★0円ではなく「存在しない」ため、
 *      本ファイル・UIのどこでも金額として表示・計算してはならない★。
 *   2. 道路交通法上の使用義務のしきい値は「年齢（6歳未満）」のみであり、身長・体重を
 *      基準にした法的な着脱の境界線は存在しない（ツール名に「身長体重」とあるが、
 *      これは着座姿勢の実務上の目安であって法規上の基準ではない）。そのため本ツールは
 *      身長・体重の具体的な数値入力・数値判定を行わない。
 *   3. safetyStandard.regulation129Detail は値が null（未確認）。国連協定規則第129号
 *      （R129）・旧基準（R44）の適用開始日や身長区分の具体的な数値は、一次情報で
 *      確認できていないため、本ファイルはこれらの数値を一切生成しない。
 *   4. 免除事由（施行令第26条の3の2第3項の全8号）に該当しても、それは「使用義務が
 *      免除される」という法的な扱いを示すのみであり、安全を保証するものではない。
 *      該当する免除事由を表示する箇所には、必ずこの旨を併記する。
 *   5. 統計値（使用率・致死率等）は令和7年調査時点の値であり、次回調査（例年秋公表）
 *      で更新される。本ファイルの値は isDataExpired() の対象期間内でのみ正確である。
 */

import childSeatKitei from "@/data/seido/child-seat-kitei.json";
import { isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const childSeatDataset = childSeatKitei as unknown as SeidoDataset;

const D = childSeatKitei.data;

// ---------------------------------------------------------------- 使用義務（年齢）

/** 使用義務の対象年齢の上限（6歳未満）。道路交通法第14条第3項の「幼児」の定義に基づく */
export const AGE_THRESHOLD = D.obligation.ageThreshold.value;
/** 警察庁による使用義務の平易な説明 */
export const OBLIGATION_NPA_SUMMARY = D.obligation.npaSummary.value;
/** 義務者は運転者であり保護者ではない、という注記 */
export const OBLIGATION_LEGAL_NOTE = D.obligation.legalText.note;
/** 座席ベルト装着義務（第71条の3第2項）との関係。6歳以上でも「何もしなくてよくなる」わけではない */
export const SEATBELT_OBLIGATION_SEPARATE = D.obligation.seatBeltObligationSeparate.value;
/** 6歳以上の子供への使用継続の推奨（法的義務ではない） */
export const SIX_PLUS_RECOMMENDATION = D.usage.sixPlusRecommendation.value;
/** 対象となる車両（自家用車に限らずレンタカー・社用車等も含む） */
export const TARGET_VEHICLE = D.obligation.targetVehicle.value;

export type ObligationStatus = "obligated" | "notObligated";

export const OBLIGATION_STATUS_LABEL: Record<ObligationStatus, string> = {
  obligated: "使用義務あり（6歳未満）",
  notObligated: "法的な使用義務なし（6歳以上）",
};

// ---------------------------------------------------------------- 免除事由（全8号）

export type ExemptionKey =
  | "structurallyImpossible"
  | "seatCountExceeded"
  | "medical"
  | "physique"
  | "nursing"
  | "commercialPassenger"
  | "nonProfitTransport"
  | "emergency";

/** 施行令第26条の3の2第3項が定める号数（第1号〜第8号）。UI表示・並び順に使う */
export const EXEMPTION_NUMBER_LABEL: Record<ExemptionKey, string> = {
  structurallyImpossible: "第1号",
  seatCountExceeded: "第2号",
  medical: "第3号",
  physique: "第4号",
  nursing: "第5号",
  commercialPassenger: "第6号",
  nonProfitTransport: "第7号",
  emergency: "第8号",
};

export const EXEMPTION_KEYS = Object.keys(EXEMPTION_NUMBER_LABEL) as ExemptionKey[];

export interface ExemptionDetail {
  key: ExemptionKey;
  number: string;
  /** 一般向けの短い見出し（チェックボックスのラベルに使う） */
  label: string;
  /** 条文の要旨（value） */
  value: string;
  note?: string;
}

/** 免除事由8号の詳細。label（短い見出し）はUI向けにこのファイルで付与し、value/noteはデータからそのまま取得する */
export const EXEMPTIONS: Record<ExemptionKey, ExemptionDetail> = {
  structurallyImpossible: {
    key: "structurallyImpossible",
    number: EXEMPTION_NUMBER_LABEL.structurallyImpossible,
    label: "座席の構造上、チャイルドシートを固定できない座席にしか乗せられない",
    value: D.exemptions.structurallyImpossible.value,
    note: D.exemptions.structurallyImpossible.note,
  },
  seatCountExceeded: {
    key: "seatCountExceeded",
    number: EXEMPTION_NUMBER_LABEL.seatCountExceeded,
    label: "乗車人数が多く、全員分のチャイルドシートを固定できない（定員超過ではない）",
    value: D.exemptions.seatCountExceeded.value,
    note: D.exemptions.seatCountExceeded.note,
  },
  medical: {
    key: "medical",
    number: EXEMPTION_NUMBER_LABEL.medical,
    label: "負傷・障害のため、使用させることが療養上・健康保持上適当でない",
    value: D.exemptions.medical.value,
    note: D.exemptions.medical.note,
  },
  physique: {
    key: "physique",
    number: EXEMPTION_NUMBER_LABEL.physique,
    label: "著しい肥満など、身体の状態により適切に使用させることができない",
    value: D.exemptions.physique.value,
  },
  nursing: {
    key: "nursing",
    number: EXEMPTION_NUMBER_LABEL.nursing,
    label: "運転者以外の人が、授乳やおむつ交換など装着させたままではできない世話をしている",
    value: D.exemptions.nursing.value,
    note: D.exemptions.nursing.note,
  },
  commercialPassenger: {
    key: "commercialPassenger",
    number: EXEMPTION_NUMBER_LABEL.commercialPassenger,
    label: "タクシー・バスなど一般旅客自動車運送事業の車に、旅客として乗車させる",
    value: D.exemptions.commercialPassenger.value,
    note: D.exemptions.commercialPassenger.note,
  },
  nonProfitTransport: {
    key: "nonProfitTransport",
    number: EXEMPTION_NUMBER_LABEL.nonProfitTransport,
    label: "自家用有償旅客運送等（道路運送法第78条第2号・第3号）による運送のため乗車させる",
    value: D.exemptions.nonProfitTransport.value,
  },
  emergency: {
    key: "emergency",
    number: EXEMPTION_NUMBER_LABEL.emergency,
    label: "応急の救護のため、医療機関などへ緊急に搬送する",
    value: D.exemptions.emergency.value,
    note: D.exemptions.emergency.note,
  },
};

/** 免除規定の根拠条文（政令） */
export const EXEMPTION_LEGAL_BASIS = D.exemptions.legalBasis.value;
/** 法第71条の3第3項ただし書 */
export const EXEMPTION_LAW_PROVISO = D.exemptions.lawProviso.value;
/** ★免除は安全を保証しない★ を含む総説 */
export const EXEMPTION_DESCRIPTION = D.exemptions.description;

// ---------------------------------------------------------------- 罰則（制裁）

export interface PenaltyInfo {
  violationName: string;
  points: number;
  /** 反則金があるか。falseの場合、fineAmountは必ずnull */
  hasFine: boolean;
  /** 反則金の額。★存在しないためnull。0円という意味ではない★ */
  fineAmount: number | null;
  hasCriminalPenalty: boolean;
  liablePerson: string;
}

export const PENALTY: PenaltyInfo = {
  violationName: D.penalty.violationName.value,
  points: D.penalty.points.value,
  hasFine: D.penalty.hasFine.value,
  fineAmount: D.penalty.fineAmount.value,
  hasCriminalPenalty: D.penalty.hasCriminalPenalty.value,
  liablePerson: D.penalty.liablePerson.value,
};

// ---------------------------------------------------------------- 安全基準

export const SAFETY_STANDARD = {
  mustComplyWithStandard: D.safetyStandard.mustComplyWithStandard.value,
  nonCompliantNotSufficient: D.safetyStandard.nonCompliantNotSufficient.value,
  eMark: D.safetyStandard.eMark.value,
  typeApprovalMark: D.safetyStandard.typeApprovalMark.value,
  iSizeMarking: D.safetyStandard.iSizeMarking.value,
  uncertifiedWarning: D.safetyStandard.uncertifiedWarning.value,
  isofixAftermarketWarning: D.safetyStandard.isofixAftermarketWarning.value,
  isofixStandardArticle: D.safetyStandard.isofixStandardArticle.value,
};

// ---------------------------------------------------------------- 使い方の注意（参考情報）

export const USAGE_NOTES = {
  frontSeatWarning: D.usage.frontSeatWarning.value,
  priceNotSafety: D.usage.priceNotSafety.value,
  secondHandCautions: D.usage.secondHandCautions.value,
};

// ---------------------------------------------------------------- 統計（参考情報）

export const STATISTICS = {
  usageRate: D.statistics.usageRate.value,
  usageRateUnder1: D.statistics.usageRateUnder1.value,
  usageRate1to4: D.statistics.usageRate1to4.value,
  usageRate5: D.statistics.usageRate5.value,
  fatalityRatio: D.statistics.fatalityRatio.value,
  properInstallationRate: D.statistics.properInstallationRate.value,
  properSeatingRate: D.statistics.properSeatingRate.value,
  usersAmongCasualties: D.statistics.usersAmongCasualties.value,
};

export const STATISTICS_SURVEY_NOTE = D.statistics.description;

// ---------------------------------------------------------------- 入力バリデーション

const MIN_AGE = 0;
const MAX_AGE = 20;

export interface AgeValidation {
  ok: boolean;
  error?: string;
}

/** 年齢の入力バリデーション（整数・範囲チェックのみ） */
export function validateAge(ageYears: number): AgeValidation {
  if (!Number.isInteger(ageYears)) {
    return { ok: false, error: "年齢は整数で入力してください。" };
  }
  if (ageYears < MIN_AGE || ageYears > MAX_AGE) {
    return { ok: false, error: `年齢は${MIN_AGE}〜${MAX_AGE}歳の範囲で入力してください。` };
  }
  return { ok: true };
}

/**
 * 年齢から使用義務の有無を判定する。
 * 道路交通法第14条第3項「幼児（六歳未満の者をいう。）」に基づき、しきい値は
 * ageYears < AGE_THRESHOLD（6歳未満）。6歳ちょうどは「6歳以上」であり義務なし。
 */
export function classifyObligation(ageYears: number): ObligationStatus {
  return ageYears < AGE_THRESHOLD ? "obligated" : "notObligated";
}

// ---------------------------------------------------------------- 総合

export interface ChildSeatResult {
  ok: true;
  expired: boolean;
  ageYears: number;
  obligationStatus: ObligationStatus;
  obligationLabel: string;
  /**
   * 使用義務がある場合にのみ意味を持つ、選択された免除事由。
   * 6歳以上（義務なし）の場合、そもそも免除を論じる前提がないため常に空配列になる。
   */
  matchedExemptions: ExemptionDetail[];
  /** 免除事由の選択欄自体を表示すべきか（義務がある場合のみ） */
  exemptionRelevant: boolean;
  penalty: PenaltyInfo;
  safetyStandard: typeof SAFETY_STANDARD;
  statistics: typeof STATISTICS;
}

export interface ChildSeatError {
  ok: false;
  error: string;
}

export function calcChildSeatKitei(
  ageYears: number,
  selectedExemptions: ExemptionKey[],
  today: string,
): ChildSeatResult | ChildSeatError {
  const validation = validateAge(ageYears);
  if (!validation.ok) {
    return { ok: false, error: validation.error! };
  }

  const obligationStatus = classifyObligation(ageYears);
  const exemptionRelevant = obligationStatus === "obligated";
  const matchedExemptions = exemptionRelevant
    ? selectedExemptions.map((key) => EXEMPTIONS[key]).filter((v): v is ExemptionDetail => Boolean(v))
    : [];
  const expired = isDataExpired(childSeatDataset, today);

  return {
    ok: true,
    expired,
    ageYears,
    obligationStatus,
    obligationLabel: OBLIGATION_STATUS_LABEL[obligationStatus],
    matchedExemptions,
    exemptionRelevant,
    penalty: PENALTY,
    safetyStandard: SAFETY_STANDARD,
    statistics: STATISTICS,
  };
}
