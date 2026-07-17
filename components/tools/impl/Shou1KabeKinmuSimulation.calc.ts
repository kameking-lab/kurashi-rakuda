/*
 * 小1の壁 勤務シミュレーション（学童時間×勤務時間）（P2-T36）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t36-shou1-kabe-kinmu-simulation.md
 * Shou1KabeKinmuSimulation.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（HoikuenOmukaeGyakusan.calc.ts と同じ構成）。
 *
 * ★実装上の最重要論点★
 * 学童保育の開所時間・お迎え締切時刻は、国の基準（参酌基準＝市町村への目安に過ぎない）に
 * 全国一律の数値が存在しない（data/seido/gakudou-hoiku-kijun.json の
 * overview.standardsNature.note を参照）。実際の時間は施設・市町村ごとに異なるため、
 * 本ツールは学童の閉所時刻をユーザー自身に入力してもらう設計とし、架空の全国一律値は
 * 一切ハードコードしない。時刻の加減算そのものは制度データに依存しない純粋な計算だが、
 * 対象学年・待機児童統計などの参考情報のみ data/seido/gakudou-hoiku-kijun.json から取得する。
 */
import seido from "@/data/seido/gakudou-hoiku-kijun.json";
import { type SeidoDataset } from "@/lib/tools/seido";

export const gakudouHoikuDataset = seido as unknown as SeidoDataset;

/** 画面・注記に表示する定型の免責文言。学童の時刻はユーザー入力である旨を必ず含む */
export const SHOU1_KABE_DISCLAIMER =
  "学童保育の開所時間・お迎え締切時刻は、施設や市区町村によって異なり、全国一律の基準はありません。本ツールの計算には、必ずご自身が利用している（利用予定の）学童の閉所時刻を入力してください。この結果は入力した時刻から機械的に計算した目安であり、実際の勤務時間の調整は就業規則や上長の指示に従ってください。子どもが一人になる時間が生じる場合は、留守番の可否や安全対策（鍵の管理、来客対応、過ごし方の約束など）をご家庭の状況に応じて検討し、必要に応じて学童・学校・自治体の窓口にご相談ください。";

/** 対象学年（小1〜小6）。data/seido/gakudou-hoiku-kijun.json の eligibility.gradeRange 由来 */
export const GRADE_RANGE_LABEL = seido.data.eligibility.gradeRange.value;
/** 支援の単位の定員（おおむね40人）。data/seido/gakudou-hoiku-kijun.json の standards.supportUnit.maxChildren 由来 */
export const SUPPORT_UNIT_MAX_CHILDREN = seido.data.standards.supportUnit.maxChildren.value;
/** 全国の待機児童数（合計）。data/seido/gakudou-hoiku-kijun.json の statistics.waitingChildren.total 由来 */
export const WAITING_CHILDREN_TOTAL = seido.data.statistics.waitingChildren.total.value;
export const WAITING_CHILDREN_SURVEY_DATE = seido.data.statistics.surveyDate.value;

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

const WAITING_BY_GRADE: Record<Grade, { value: number; label: string }> = {
  1: seido.data.statistics.waitingChildren.grade1,
  2: seido.data.statistics.waitingChildren.grade2,
  3: seido.data.statistics.waitingChildren.grade3,
  4: seido.data.statistics.waitingChildren.grade4,
  5: seido.data.statistics.waitingChildren.grade5,
  6: seido.data.statistics.waitingChildren.grade6,
};

export interface GradeWaitingStat {
  grade: Grade;
  /** その学年の待機児童数（全国） */
  count: number;
  /** データ上のラベル（例: "待機児童数：小学4年生（最多）"） */
  label: string;
}

/** 学年別の待機児童数（参考情報）を返す。grade が null・範囲外の場合は null */
export function getGradeWaitingStat(grade: Grade | null): GradeWaitingStat | null {
  if (grade === null) return null;
  const stat = WAITING_BY_GRADE[grade];
  if (!stat) return null;
  return { grade, count: stat.value, label: stat.label };
}

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

/** 移動時間・バッファの入力値検証（0以上の有限数であること） */
function validateNonNegativeMinutes(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export interface Shou1KabeInputs {
  /** 学童の閉所時刻（"HH:mm"）。全国一律値が存在しないためユーザー自身の入力を必須とする */
  gakudouHeishoJikoku: string;
  /** 学童から自宅までの移動時間（分）。子どもが一人で帰宅する場合の目安として使う */
  gakudouKaraJitakuIdouMin: number;
  /** 退勤時刻・勤務終了時刻（"HH:mm"） */
  taikinJikoku: string;
  /** 職場から自宅までの移動時間（分） */
  shokubaKaraJitakuIdouMin: number;
  /** 退勤後の準備時間・バッファ（分） */
  bufferMin: number;
  /** 出勤時刻・勤務開始時刻（"HH:mm"）。空文字なら未入力として扱う */
  shukkinJikoku: string;
}

export interface HitoriJikan {
  /** 子どもが一人になる時間（分）。一人にならない場合は0 */
  minutes: number;
  /** "◯時間◯分" 表示（0分の場合は "0分"） */
  label: string;
}

export interface WorkableTime {
  /** 実労働可能時間（分） */
  minutes: number;
  /** "◯時間◯分" 表示 */
  label: string;
}

export interface TaikinGenkai {
  /** 子どもが一人にならないための退勤限界時刻（分）。算出不可の場合は null */
  minutes: number | null;
  /** "HH:mm" 表示、または算出不可の文言 */
  label: string;
  /** 学童の閉所時刻までに間に合う退勤時刻が存在するか */
  possible: boolean;
}

export type Shou1KabeResult =
  | {
      ok: true;
      /** 子どもが学童から自宅に着く時刻（分） */
      kodomoKitakuMin: number;
      kodomoKitakuLabel: string;
      /** 親が自宅に着く時刻（分） */
      oyaKitakuMin: number;
      oyaKitakuLabel: string;
      /** 子どもが一人になる時間 */
      hitoriJikan: HitoriJikan;
      /** 子どもを一人にしないための退勤限界時刻（参考） */
      taikinGenkai: TaikinGenkai;
      /** 出勤時刻が入力された場合のみ算出。未入力なら null */
      workable: WorkableTime | null;
    }
  | { ok: false; error: string };

const MINUTES_PER_DAY = 24 * 60;

/**
 * 学童の閉所時刻・移動時間・退勤時刻から、子どもが一人になる時間（分）を算出する。
 * あわせて、子どもを一人にしないための退勤限界時刻・（出勤時刻が入力されていれば）
 * その場合の実労働可能時間も算出する。
 */
export function calcShou1KabeKinmuSimulation(inputs: Shou1KabeInputs): Shou1KabeResult {
  const gakudouHeishoMin = parseHHMM(inputs.gakudouHeishoJikoku);
  if (gakudouHeishoMin === null) {
    return { ok: false, error: "学童の閉所時刻の形式が正しくありません（例: 18:00）。" };
  }

  if (!validateNonNegativeMinutes(inputs.gakudouKaraJitakuIdouMin)) {
    return { ok: false, error: "学童から自宅までの移動時間は0以上の数値で入力してください。" };
  }

  const taikinMin = parseHHMM(inputs.taikinJikoku);
  if (taikinMin === null) {
    return { ok: false, error: "退勤時刻の形式が正しくありません（例: 18:00）。" };
  }

  if (!validateNonNegativeMinutes(inputs.shokubaKaraJitakuIdouMin)) {
    return { ok: false, error: "職場から自宅までの移動時間は0以上の数値で入力してください。" };
  }
  if (!validateNonNegativeMinutes(inputs.bufferMin)) {
    return { ok: false, error: "退勤後の準備時間（バッファ）は0以上の数値で入力してください。" };
  }

  const gakudouKaraJitakuIdouMin = Math.round(inputs.gakudouKaraJitakuIdouMin);
  const shokubaKaraJitakuIdouMin = Math.round(inputs.shokubaKaraJitakuIdouMin);
  const bufferMin = Math.round(inputs.bufferMin);

  const kodomoKitakuMin = gakudouHeishoMin + gakudouKaraJitakuIdouMin;
  if (kodomoKitakuMin >= MINUTES_PER_DAY) {
    return {
      ok: false,
      error:
        "学童の閉所時刻に対して自宅までの移動時間が長すぎます。日をまたぐ計算はできません。入力内容をご確認ください。",
    };
  }

  const oyaKitakuMin = taikinMin + bufferMin + shokubaKaraJitakuIdouMin;
  if (oyaKitakuMin >= MINUTES_PER_DAY) {
    return {
      ok: false,
      error:
        "退勤時刻に対して移動時間・準備時間が長すぎます。日をまたぐ計算はできません。入力内容をご確認ください。",
    };
  }

  const hitoriJikanMin = Math.max(0, oyaKitakuMin - kodomoKitakuMin);
  const hitoriJikan: HitoriJikan = {
    minutes: hitoriJikanMin,
    label: hitoriJikanMin === 0 ? "0分" : formatDuration(hitoriJikanMin),
  };

  const taikinGenkaiMinRaw = kodomoKitakuMin - bufferMin - shokubaKaraJitakuIdouMin;
  const taikinGenkaiPossible = taikinGenkaiMinRaw >= 0;
  const taikinGenkai: TaikinGenkai = taikinGenkaiPossible
    ? { minutes: taikinGenkaiMinRaw, label: formatHHMM(taikinGenkaiMinRaw), possible: true }
    : {
        minutes: null,
        label: "算出できません（学童の閉所時刻までに間に合う退勤時刻がありません）",
        possible: false,
      };

  const shukkinInput = inputs.shukkinJikoku.trim();
  if (shukkinInput === "") {
    return {
      ok: true,
      kodomoKitakuMin,
      kodomoKitakuLabel: formatHHMM(kodomoKitakuMin),
      oyaKitakuMin,
      oyaKitakuLabel: formatHHMM(oyaKitakuMin),
      hitoriJikan,
      taikinGenkai,
      workable: null,
    };
  }

  const shukkinMin = parseHHMM(shukkinInput);
  if (shukkinMin === null) {
    return { ok: false, error: "出勤時刻（勤務開始時刻）の形式が正しくありません（例: 09:00）。" };
  }

  let workable: WorkableTime | null = null;
  if (taikinGenkai.possible && taikinGenkai.minutes !== null) {
    const workableMin = taikinGenkai.minutes - shukkinMin;
    if (workableMin >= 0) {
      workable = { minutes: workableMin, label: formatDuration(workableMin) };
    }
  }

  return {
    ok: true,
    kodomoKitakuMin,
    kodomoKitakuLabel: formatHHMM(kodomoKitakuMin),
    oyaKitakuMin,
    oyaKitakuLabel: formatHHMM(oyaKitakuMin),
    hitoriJikan,
    taikinGenkai,
    workable,
  };
}
