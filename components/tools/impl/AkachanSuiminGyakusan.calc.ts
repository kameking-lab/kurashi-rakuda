/*
 * 赤ちゃん連動 睡眠逆算（P2-T32）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t32-akachan-suimin-gyakusan.md
 * AkachanSuiminGyakusan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（HoikuenOmukaeGyakusan.calc.ts と同じ構成）。
 *
 * ★重要な確認結果★（data/tables/suimin-guide-2023.json も参照）
 * 厚生労働省「健康づくりのための睡眠ガイド2023」本文・要約リーフレットのいずれにも、
 * 1歳未満（乳児）について時間数で示した推奨睡眠時間の記載は存在しない。定量的な区分は
 * 1〜2歳（11〜14時間）からであり、架空の数値（1歳未満の「12〜16時間」等）は一切収録しない。
 * 1歳未満を選んだ場合は推奨レンジとの比較を行わず、ガイドが実際に記載している定性的情報のみ
 * を表示する。
 *
 * この計算ロジック自体（時刻の逆算・日をまたぐ処理）は制度データに依存しない純粋な加減算だが、
 * 年齢区分ごとの推奨レンジ・成人の目安（6時間以上）は suimin-guide-2023.json から取得する。
 */
import guide from "@/data/tables/suimin-guide-2023.json";

/** 画面・注記に表示する定型の免責文言 */
export const AKACHAN_SUIMIN_DISCLAIMER = guide.disclaimer;

export type AgeBracketCode =
  | "INFANT_UNDER_1"
  | "TODDLER_1_2"
  | "PRESCHOOL_3_5"
  | "ELEMENTARY"
  | "JUNIOR_SENIOR_HIGH";

export interface ChildRecommendationCategory {
  code: string;
  label: string;
  ageFromYears: number;
  ageToYears: number;
  hoursFrom: number;
  hoursTo: number;
  rangeLabel: string;
  sourceQuote: string;
  note?: string;
}

/** 定量的な推奨レンジが明記されている4区分（1歳未満は別扱い） */
export const CHILD_RECOMMENDATION_CATEGORIES: ChildRecommendationCategory[] =
  guide.childRecommendations.categories as ChildRecommendationCategory[];

/** 1歳未満（乳児）のデータ。ガイドに時間数の記載がないため定性的情報のみを持つ */
export const INFANT_UNDER_1_DATA = guide.childRecommendations.infantUnder1;

/** 成人（保護者自身）の目安。「6時間以上を目安に」 */
export const ADULT_REFERENCE = guide.adultReference;

/** 保護者自身の必要睡眠時間の入力初期値（時間）。ガイドの成人推奨「6時間以上」に基づく */
export const DEFAULT_OYA_HITSUYOU_JIKAN_H = guide.adultReference.defaultHoursForTool;

/** 年齢区分の選択肢（UIのSelectField用）。定義順を表示順として使う */
export const AGE_BRACKET_OPTIONS: { code: AgeBracketCode; label: string }[] = [
  { code: "INFANT_UNDER_1", label: INFANT_UNDER_1_DATA.label },
  ...CHILD_RECOMMENDATION_CATEGORIES.map((c) => ({
    code: c.code as AgeBracketCode,
    label: c.label,
  })),
];

function getCategory(ageBracket: AgeBracketCode): ChildRecommendationCategory | null {
  return (
    CHILD_RECOMMENDATION_CATEGORIES.find((c) => c.code === ageBracket) ?? null
  );
}

export interface SuiminGyakusanInputs {
  /** 赤ちゃん・お子さまの年齢区分 */
  ageBracket: AgeBracketCode;
  /** 就寝予定時刻（"HH:mm"） */
  nesetsukeJikoku: string;
  /** 起床予定時刻（"HH:mm"）。就寝予定時刻の分数以下なら日をまたぐとみなす */
  kishouJikoku: string;
  /** 保護者自身の必要睡眠時間（時間）。0より大きく24以下 */
  oyaHitsuyouJikanH: number;
  /** 寝かしつけ・夜泣き対応等にかかる時間（分）。0以上 */
  bufferMin: number;
}

export type SuiminClassification = "SHORT" | "WITHIN" | "LONG" | "NOT_AVAILABLE";

export interface AkachanSuimin {
  /** 赤ちゃんの推定睡眠時間（分） */
  minutes: number;
  /** "◯時間◯分" 表示 */
  label: string;
  /** 年齢区分の推奨レンジとの比較。1歳未満は NOT_AVAILABLE */
  classification: SuiminClassification;
  /** 比較対象の推奨レンジ（1歳未満は null） */
  category: ChildRecommendationCategory | null;
}

export interface OyaShuushin {
  /** "HH:mm" 表示（就寝予定日の0:00を基準とした時刻） */
  label: string;
  /** 就寝予定日を基準とした日付のずれ（0=同じ日、1以上=日付が変わったあと） */
  dayOffset: number;
  /** 保護者の必要睡眠時間＋バッファが、赤ちゃんの睡眠時間枠に収まるかどうか */
  sufficientWindow: boolean;
}

export type SuiminGyakusanResult =
  | {
      ok: true;
      akachanSuimin: AkachanSuimin;
      oyaShuushin: OyaShuushin;
    }
  | { ok: false; error: string };

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * "HH:mm" 文字列を 0時0分からの経過分数（0〜1439）に変換する。
 * 形式が不正（範囲外・非数値・空文字等）な場合は null を返す。
 */
export function parseHHMM(s: string): number | null {
  if (typeof s !== "string") return null;
  const m = HHMM_PATTERN.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour * 60 + minute;
}

/** 0〜1439の経過分数を "HH:mm" 表示に変換する */
export function formatHHMM(min: number): string {
  const hour = Math.floor(min / 60);
  const minute = min % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 0以上の分数を "◯時間◯分" 形式に変換する（0時間・0分はそれぞれ省略） */
export function formatDuration(min: number): string {
  const hour = Math.floor(min / 60);
  const minute = min % 60;
  if (hour === 0) return `${minute}分`;
  if (minute === 0) return `${hour}時間`;
  return `${hour}時間${minute}分`;
}

function isValidAgeBracket(value: string): value is AgeBracketCode {
  return (
    value === "INFANT_UNDER_1" ||
    CHILD_RECOMMENDATION_CATEGORIES.some((c) => c.code === value)
  );
}

/**
 * 赤ちゃん・お子さまの年齢区分と就寝・起床予定時刻から、年齢別推奨睡眠時間との比較（参考情報）と、
 * 保護者自身が必要な睡眠時間を確保するための就寝時刻の目安を逆算する。
 */
export function calcAkachanSuiminGyakusan(
  inputs: SuiminGyakusanInputs
): SuiminGyakusanResult {
  if (!isValidAgeBracket(inputs.ageBracket)) {
    return { ok: false, error: "年齢区分の指定が正しくありません。" };
  }

  const nesetsukeMin = parseHHMM(inputs.nesetsukeJikoku);
  if (nesetsukeMin === null) {
    return { ok: false, error: "就寝予定時刻の形式が正しくありません（例: 20:00）。" };
  }

  const kishouMinRaw = parseHHMM(inputs.kishouJikoku);
  if (kishouMinRaw === null) {
    return { ok: false, error: "起床予定時刻の形式が正しくありません（例: 07:00）。" };
  }

  if (kishouMinRaw === nesetsukeMin) {
    return {
      ok: false,
      error: "起床予定時刻が就寝予定時刻と同じです。睡眠時間が0分になるため、入力内容をご確認ください。",
    };
  }

  if (!Number.isFinite(inputs.oyaHitsuyouJikanH) || inputs.oyaHitsuyouJikanH <= 0 || inputs.oyaHitsuyouJikanH > 24) {
    return {
      ok: false,
      error: "保護者自身の必要睡眠時間は0より大きく24以下の数値で入力してください。",
    };
  }

  if (!Number.isFinite(inputs.bufferMin) || inputs.bufferMin < 0) {
    return {
      ok: false,
      error: "寝かしつけ・夜泣き対応等にかかる時間は0以上の数値で入力してください。",
    };
  }

  // 起床予定時刻の分数が就寝予定時刻の分数以下なら、日をまたぐ（翌日の起床）とみなす。
  const crossesMidnight = kishouMinRaw <= nesetsukeMin;
  const kishouAbsMin = crossesMidnight ? kishouMinRaw + 1440 : kishouMinRaw;
  const akachanSuiminMin = kishouAbsMin - nesetsukeMin;

  const category = getCategory(inputs.ageBracket);
  let classification: SuiminClassification = "NOT_AVAILABLE";
  if (category) {
    const suiminHours = akachanSuiminMin / 60;
    if (suiminHours < category.hoursFrom) classification = "SHORT";
    else if (suiminHours > category.hoursTo) classification = "LONG";
    else classification = "WITHIN";
  }

  const oyaHitsuyouMin = Math.round(inputs.oyaHitsuyouJikanH * 60);
  const bufferMin = Math.round(inputs.bufferMin);

  const oyaShuushinAbsMin = kishouAbsMin - oyaHitsuyouMin - bufferMin;
  const dayOffset = Math.floor(oyaShuushinAbsMin / 1440);
  const oyaShuushinMinOfDay = ((oyaShuushinAbsMin % 1440) + 1440) % 1440;

  const sufficientWindow = oyaHitsuyouMin + bufferMin <= akachanSuiminMin;

  return {
    ok: true,
    akachanSuimin: {
      minutes: akachanSuiminMin,
      label: formatDuration(akachanSuiminMin),
      classification,
      category,
    },
    oyaShuushin: {
      label: formatHHMM(oyaShuushinMinOfDay),
      dayOffset,
      sufficientWindow,
    },
  };
}
