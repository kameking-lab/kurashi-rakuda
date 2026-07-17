/*
 * 保育園お迎え逆算 勤務可能時間計算（P2-T35）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t35-hoikuen-omukae-gyakusan.md
 * HoikuenOmukaeGyakusan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他のtoolsと同じ構成。ShokuhiMeyasu.calc.ts を参考）。
 * 制度・統計データに一切依存しない、純粋な時刻の加減算のみのロジック。日をまたぐ計算は対象外。
 */

/** 画面・注記に表示する定型の免責文言 */
export const HOIKUEN_OMUKAE_DISCLAIMER =
  "この結果は入力した時刻から機械的に計算した目安です。実際の勤務時間の調整・残業の可否は就業規則や上長の指示に従ってください。お迎えに間に合わない見込みがある場合は、延長保育の利用可否をあらかじめ職場・保育園に相談・確認しておくと安心です。";

export interface GyakusanInputs {
  /** お迎え締切時刻（"HH:mm"） */
  omukaeShimekiri: string;
  /** 職場→保育園の移動時間（分）。退勤限界時刻の算出に使う */
  shokubaToHoikuenMin: number;
  /** 保育園→職場の移動時間（分）。朝の保育園出発目安（参考値）の算出にのみ使う */
  hoikuenToShokubaMin: number;
  /** 退勤後の準備時間・バッファ（分） */
  bufferMin: number;
  /** 出勤時刻・勤務開始時刻（"HH:mm"）。空文字なら未入力として扱う */
  shukkinJikoku: string;
}

export interface WorkableTime {
  /** 実労働可能時間（分） */
  minutes: number;
  /** "◯時間◯分" 表示 */
  label: string;
}

export interface AsaShuppatsu {
  /** 朝、保育園を出発すべき目安時刻（分。0〜1439に収まらない場合は possible=false） */
  minutes: number;
  /** "HH:mm" 表示、または算出不可の文言 */
  label: string;
  /** 出勤時刻までに間に合う経路かどうか */
  possible: boolean;
}

export type GyakusanResult =
  | {
      ok: true;
      /** 退勤限界時刻（分） */
      taikinGenkaiMin: number;
      /** "HH:mm" 表示 */
      taikinGenkaiLabel: string;
      /** 出勤時刻が入力された場合のみ算出。未入力なら null */
      workable: WorkableTime | null;
      /** 出勤時刻が入力された場合のみ算出。未入力なら null */
      asaShuppatsu: AsaShuppatsu | null;
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

/** 移動時間・バッファの入力値検証（0以上の有限数であること） */
function validateNonNegativeMinutes(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * お迎え締切時刻・移動時間・バッファから退勤限界時刻を、
 * 出勤時刻が入力されていれば実労働可能時間・朝の保育園出発目安もあわせて逆算する。
 */
export function calcGyakusan(inputs: GyakusanInputs): GyakusanResult {
  const omukaeMin = parseHHMM(inputs.omukaeShimekiri);
  if (omukaeMin === null) {
    return { ok: false, error: "お迎え締切時刻の形式が正しくありません（例: 18:00）。" };
  }

  if (!validateNonNegativeMinutes(inputs.shokubaToHoikuenMin)) {
    return { ok: false, error: "職場から保育園までの移動時間は0以上の数値で入力してください。" };
  }
  if (!validateNonNegativeMinutes(inputs.hoikuenToShokubaMin)) {
    return { ok: false, error: "保育園から職場までの移動時間は0以上の数値で入力してください。" };
  }
  if (!validateNonNegativeMinutes(inputs.bufferMin)) {
    return { ok: false, error: "退勤後の準備時間（バッファ）は0以上の数値で入力してください。" };
  }

  const shokubaToHoikuenMin = Math.round(inputs.shokubaToHoikuenMin);
  const hoikuenToShokubaMin = Math.round(inputs.hoikuenToShokubaMin);
  const bufferMin = Math.round(inputs.bufferMin);

  const taikinGenkaiMin = omukaeMin - shokubaToHoikuenMin - bufferMin;
  if (taikinGenkaiMin < 0) {
    return {
      ok: false,
      error:
        "お迎え締切時刻に対して移動時間・準備時間が長すぎます。日をまたぐ計算はできません。入力内容をご確認ください。",
    };
  }

  const taikinGenkaiLabel = formatHHMM(taikinGenkaiMin);

  const shukkinInput = inputs.shukkinJikoku.trim();
  if (shukkinInput === "") {
    return {
      ok: true,
      taikinGenkaiMin,
      taikinGenkaiLabel,
      workable: null,
      asaShuppatsu: null,
    };
  }

  const shukkinMin = parseHHMM(shukkinInput);
  if (shukkinMin === null) {
    return { ok: false, error: "出勤時刻（勤務開始時刻）の形式が正しくありません（例: 09:00）。" };
  }

  const workableMin = taikinGenkaiMin - shukkinMin;
  if (workableMin < 0) {
    return {
      ok: false,
      error:
        "退勤限界時刻が出勤時刻より前になっています。勤務時間がマイナスになるため、入力内容をご確認ください。",
    };
  }

  const workable: WorkableTime = {
    minutes: workableMin,
    label: formatDuration(workableMin),
  };

  const asaShuppatsuMin = shukkinMin - hoikuenToShokubaMin;
  const asaShuppatsuPossible = asaShuppatsuMin >= 0;
  const asaShuppatsu: AsaShuppatsu = {
    minutes: asaShuppatsuMin,
    label: asaShuppatsuPossible ? formatHHMM(asaShuppatsuMin) : "算出できません（前日側にはみ出すため）",
    possible: asaShuppatsuPossible,
  };

  return {
    ok: true,
    taikinGenkaiMin,
    taikinGenkaiLabel,
    workable,
    asaShuppatsu,
  };
}
