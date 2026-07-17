/*
 * 幼児教育・保育無償化 対象チェッカー（P2-T19）— 計算ロジック本体。
 * 仕様: specs/b-tools/p2-t19-youji-mushouka-checker.md
 *
 * 制度データは data/seido/youji-kyouiku-mushouka.json を単一の情報源(SSOT)とする。
 * 年齢区分・月額上限はすべて同JSONを import して参照し、本ファイルには金額・年齢境界の
 * 数値をハードコードしない（数値が変わったら youji-kyouiku-mushouka.json だけを更新すれば追随する）。
 *
 * 実装上の最重要論点（仕様書に詳しい）:
 * - 3〜5歳児クラスは全世帯が対象、0〜2歳児クラスは住民税非課税世帯のみが対象。
 * - 幼稚園（新制度・未移行いずれも）は満3歳以上が対象のため、0〜2歳児クラスの利用という
 *   組み合わせ自体が実務上存在しない（対象外として扱う）。
 * - 施設等利用給付認定が必要な施設種別（幼稚園・未移行／認可外／企業主導型）は、
 *   認定が「対象」の前提条件になるため status を "conditional"（条件付き対象）とする。
 * - 月額上限の数値データを持つのは認可外保育施設等（ninkagaiCaps）のみ。
 *   幼稚園・未移行や企業主導型保育の上限額はデータに存在しないため、推測値を出さず
 *   「データなし・要確認」として null を返す。
 */
import seido from "@/data/seido/youji-kyouiku-mushouka.json";

const TARGET_AGES = seido.data.targetAges;
const NINKAGAI_CAPS = seido.data.ninkagaiCaps;
export const YOUJI_MUSHOUKA_DISCLAIMER = seido.disclaimer;

/** 判定対象のクラス年齢の範囲（4月1日時点の満年齢）。データの下限〜上限をそのまま使う */
export const CLASS_AGE_MIN = TARGET_AGES.nonTaxableFrom.value;
export const CLASS_AGE_MAX = TARGET_AGES.freeForAllTo.value;

export type FacilityType =
  | "ninkaHoikusho"
  | "ninteiKodomoen"
  | "youchienShinseido"
  | "youchienMikoukou"
  | "ninkagai"
  | "kigyoushudou";

export type AgeGroup = "nonTaxable" | "freeForAll";

export type MushoukaStatus = "target" | "notTarget" | "conditional";

export const STATUS_LABEL: Record<MushoukaStatus, string> = {
  target: "対象",
  notTarget: "対象外",
  conditional: "条件付き対象",
};

interface FacilityMeta {
  label: string;
  /** 0〜2歳児クラスの受け入れがあるか（幼稚園は満3歳以上のみのため false） */
  acceptsInfant: boolean;
  /** 施設等利用給付認定が無償化適用の前提条件として必要か */
  requiresNintei: boolean;
}

/**
 * 施設種別ごとの構造的な属性（金額を含まない）。
 * これは制度上の分類テーブルであり、data/seido/youji-kyouiku-mushouka.json の
 * 金額データとは別物として本ファイルで保持する（分類そのものは金額ではないため）。
 */
export const FACILITY_META: Record<FacilityType, FacilityMeta> = {
  ninkaHoikusho: {
    label: "認可保育所",
    acceptsInfant: true,
    requiresNintei: false,
  },
  ninteiKodomoen: {
    label: "認定こども園",
    acceptsInfant: true,
    requiresNintei: false,
  },
  youchienShinseido: {
    label: "幼稚園（新制度）",
    acceptsInfant: false,
    requiresNintei: false,
  },
  youchienMikoukou: {
    label: "幼稚園（未移行・預かり保育含む）",
    acceptsInfant: false,
    requiresNintei: true,
  },
  ninkagai: {
    label: "認可外保育施設等",
    acceptsInfant: true,
    requiresNintei: true,
  },
  kigyoushudou: {
    label: "企業主導型保育等",
    acceptsInfant: true,
    requiresNintei: true,
  },
};

export const FACILITY_TYPES = Object.keys(FACILITY_META) as FacilityType[];

export interface YoujiMushoukaInput {
  /** クラス年齢（4月1日時点の満年齢）。0〜5の整数 */
  classAge: number;
  facilityType: FacilityType;
  /** 0〜2歳児クラスの場合のみ意味を持つ。世帯が住民税非課税かどうか */
  nonTaxableHousehold?: boolean;
}

export interface YoujiMushoukaResult {
  ageGroup: AgeGroup;
  status: MushoukaStatus;
  statusLabel: string;
  /** 月額上限（円）。上限の定めがない場合、または上限データが未収録の場合は null */
  monthlyCap: number | null;
  /** monthlyCap の根拠ラベル（データにない場合は null） */
  monthlyCapSource: string | null;
  requiresNintei: boolean;
  procedures: string[];
  notes: string[];
  disclaimer: string;
}

export type YoujiMushoukaCalcResult =
  | { ok: true; result: YoujiMushoukaResult }
  | { ok: false; error: string };

/** クラス年齢から年齢区分を判定する（境界値は data/seido を参照） */
export function classifyAgeGroup(classAge: number): AgeGroup | null {
  if (classAge < CLASS_AGE_MIN || classAge > CLASS_AGE_MAX) return null;
  if (classAge >= TARGET_AGES.freeForAllFrom.value && classAge <= TARGET_AGES.freeForAllTo.value) {
    return "freeForAll";
  }
  if (classAge >= TARGET_AGES.nonTaxableFrom.value && classAge <= TARGET_AGES.nonTaxableTo.value) {
    return "nonTaxable";
  }
  return null;
}

const NINTEI_PROCEDURE =
  "市区町村に「施設等利用給付認定」を申請してください。認定を受けていない期間は無償化の対象になりません。";
const NO_NINTEI_PROCEDURE =
  "入園にあたって既に受けている保育の必要性の認定（2号・3号認定）または教育標準時間認定（1号認定）に無償化の適用が含まれるため、追加の手続きは不要です。";
const CAP_DATA_MISSING_NOTE =
  "月額上限は本データに収録されていません。認定通知や施設に上限額をご確認ください。";
const INFANT_AGE_NOTE =
  "幼稚園は満3歳以上のお子さまが対象のため、0〜2歳児クラスでの利用はありません。";
const TAXABLE_HOUSEHOLD_NOTE =
  "0〜2歳児クラスの無償化は住民税非課税世帯が対象です。課税世帯は原則対象外ですが、自治体独自の減免制度がある場合がありますので、お住まいの市区町村にご確認ください。";

export function calculateYoujiMushouka(input: YoujiMushoukaInput): YoujiMushoukaCalcResult {
  const { classAge, facilityType, nonTaxableHousehold } = input;

  if (!Number.isInteger(classAge)) {
    return { ok: false, error: "クラス年齢は整数で入力してください" };
  }
  const ageGroup = classifyAgeGroup(classAge);
  if (!ageGroup) {
    return {
      ok: false,
      error: `対応年齢の範囲外です（${CLASS_AGE_MIN}〜${CLASS_AGE_MAX}歳児クラスのみ対応しています）`,
    };
  }

  const meta = FACILITY_META[facilityType];
  if (!meta) {
    return { ok: false, error: "利用施設の種別を選択してください" };
  }

  const notes: string[] = [];

  if (ageGroup === "nonTaxable") {
    if (!meta.acceptsInfant) {
      return {
        ok: true,
        result: {
          ageGroup,
          status: "notTarget",
          statusLabel: STATUS_LABEL.notTarget,
          monthlyCap: null,
          monthlyCapSource: null,
          requiresNintei: meta.requiresNintei,
          procedures: [],
          notes: [INFANT_AGE_NOTE],
          disclaimer: YOUJI_MUSHOUKA_DISCLAIMER,
        },
      };
    }

    if (nonTaxableHousehold === undefined) {
      return { ok: false, error: "世帯の住民税課税状況を選択してください" };
    }

    if (!nonTaxableHousehold) {
      return {
        ok: true,
        result: {
          ageGroup,
          status: "notTarget",
          statusLabel: STATUS_LABEL.notTarget,
          monthlyCap: null,
          monthlyCapSource: null,
          requiresNintei: meta.requiresNintei,
          procedures: [],
          notes: [TAXABLE_HOUSEHOLD_NOTE],
          disclaimer: YOUJI_MUSHOUKA_DISCLAIMER,
        },
      };
    }

    const monthlyCap = facilityType === "ninkagai" ? NINKAGAI_CAPS.age0to2NonTaxable.value : null;
    const monthlyCapSource =
      facilityType === "ninkagai" ? NINKAGAI_CAPS.age0to2NonTaxable.label : null;
    const status: MushoukaStatus = meta.requiresNintei ? "conditional" : "target";
    if (meta.requiresNintei && monthlyCap === null) notes.push(CAP_DATA_MISSING_NOTE);

    return {
      ok: true,
      result: {
        ageGroup,
        status,
        statusLabel: STATUS_LABEL[status],
        monthlyCap,
        monthlyCapSource,
        requiresNintei: meta.requiresNintei,
        procedures: [meta.requiresNintei ? NINTEI_PROCEDURE : NO_NINTEI_PROCEDURE],
        notes,
        disclaimer: YOUJI_MUSHOUKA_DISCLAIMER,
      },
    };
  }

  // ageGroup === "freeForAll"（3〜5歳児クラス、全世帯対象）
  const monthlyCap = facilityType === "ninkagai" ? NINKAGAI_CAPS.age3to5.value : null;
  const monthlyCapSource = facilityType === "ninkagai" ? NINKAGAI_CAPS.age3to5.label : null;
  const status: MushoukaStatus = meta.requiresNintei ? "conditional" : "target";
  if (meta.requiresNintei && monthlyCap === null) notes.push(CAP_DATA_MISSING_NOTE);

  return {
    ok: true,
    result: {
      ageGroup,
      status,
      statusLabel: STATUS_LABEL[status],
      monthlyCap,
      monthlyCapSource,
      requiresNintei: meta.requiresNintei,
      procedures: [meta.requiresNintei ? NINTEI_PROCEDURE : NO_NINTEI_PROCEDURE],
      notes,
      disclaimer: YOUJI_MUSHOUKA_DISCLAIMER,
    },
  };
}
