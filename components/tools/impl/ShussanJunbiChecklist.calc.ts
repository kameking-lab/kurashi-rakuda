/*
 * 出産準備チェックリスト（予定日逆算）（P2-T16）— 計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t16-shussan-junbi-checklist.md
 * ShussanJunbiChecklist.tsx から呼び出される。
 *
 * 本ツールが行うのは「出産予定日 → 臨月開始日（出産予定日−28日）→ 今日との差分日数」という
 * 単純な日付演算のみ（Q3-01 出産予定日・妊娠週数計算 ShussanYoteibi.calc.ts を参考にした構成）。
 * LMPからの逆算・妊娠週数の算出などの新規の妊娠計算ロジックは作らない。
 * チェックリストの項目自体は一次情報のない一般的な準備リスト（YMYL低。常時Calloutで明示する）。
 *
 * 「40週0日＝出産予定日」の考え方のみ data/tables/san-fujinka-kijun.json
 * （Q3-01・Q3-02と共有するネーゲレ概算法系の日数定数のSSOT）を再利用する。
 */
import sanFujinkaKijun from "@/data/tables/san-fujinka-kijun.json";

/** ネーゲレ概算法の基本日数（280日＝40週0日＝出産予定日）。ここに数値を書かず共有JSONを参照する */
const KIHON_NISSUU = sanFujinkaKijun.kihon_nissuu_280.value;
const NISSUU_PER_SHUUKAN = 7;
const KIHON_SHUUSUU = KIHON_NISSUU / NISSUU_PER_SHUUKAN; // 40週
/** 臨月（妊娠10か月）の開始週。産科領域で広く使われる慣用区分（36週0日〜39週6日） */
const RINGETSU_KAISHI_SHUUSUU = 36;
/** 臨月開始日は出産予定日の何日前か（40週−36週＝4週間＝28日） */
const RINGETSU_KAISHI_MAE_NISSUU =
  (KIHON_SHUUSUU - RINGETSU_KAISHI_SHUUSUU) * NISSUU_PER_SHUUKAN;

const MS_PER_DAY = 86_400_000;

/** YYYY-MM-DD → 1970-01-01 からの経過日数（整数・UTC基準） */
function toEpochDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** 経過日数（UTC基準） → YYYY-MM-DD */
function fromEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD に日数を加算（負数で減算）した YYYY-MM-DD を返す */
export function addDays(iso: string, days: number): string {
  return fromEpochDay(toEpochDay(iso) + days);
}

/** a − b の日数差（整数。a が後なら正） */
export function diffInDays(a: string, b: string): number {
  return toEpochDay(a) - toEpochDay(b);
}

/** 実行時の「今日」を YYYY-MM-DD で返す（ユーザーのローカル日付基準）。UIからのみ呼び出す */
export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → 「2026年10月8日」表記 */
export function formatJapaneseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** "YYYY-MM-DD" 形式で実在する日付か（2/30 や空文字を素通りさせない） */
export function isValidDateString(value: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export type PrepPeriod = "安定期" | "臨月" | "産後";

export type ChecklistCategoryId =
  | "stable"
  | "beforeRingetsu"
  | "hospitalBag"
  | "postpartum";

export interface ChecklistCategory {
  id: ChecklistCategoryId;
  label: string;
  items: string[];
  /** 今の時期区分にちょうど対応する区分か（UIでの強調表示に使う） */
  isCurrent: boolean;
}

/** 区分ごとの固定チェックリスト項目（一般的な目安。一次情報に基づく数値ではない） */
const CHECKLIST_ITEMS: Record<ChecklistCategoryId, { label: string; items: string[] }> = {
  stable: {
    label: "今すぐ確認したいこと",
    items: [
      "出産する産院を決める",
      "母子健康手帳・妊婦健診の受診票を確認する",
      "名前の候補を考え始める",
      "産休・育休の手続きを勤務先に確認する",
      "上の子がいる場合の預け先を検討する",
      "里帰り出産をするか検討する",
    ],
  },
  beforeRingetsu: {
    label: "臨月までに準備したいこと",
    items: [
      "ベビー用品（肌着・オムツ・ベビーベッドなど）を揃える",
      "チャイルドシートを用意する",
      "里帰りする場合は移動手段・時期を決める",
      "上の子の急な預け先・お願いできる人を決めておく",
      "緊急連絡先リスト（病院・家族・タクシー会社）を作る",
      "陣痛時に使うタクシー会社の事前登録を検討する",
    ],
  },
  hospitalBag: {
    label: "入院バッグに入れるもの",
    items: [
      "母子健康手帳・健康保険証・診察券",
      "産褥ショーツ・産褥パッド",
      "授乳しやすい服・授乳用ブラジャー",
      "赤ちゃんの退院時の服・おくるみ・肌着",
      "洗面用具・普段使いのタオル",
      "スマートフォンの充電器",
      "現金・軽食",
      "産院から指定された持ち物リストの確認",
    ],
  },
  postpartum: {
    label: "産後に向けて準備したいこと",
    items: [
      "出生届の提出（出生日から14日以内）",
      "児童手当の申請",
      "赤ちゃんの健康保険加入手続き",
      "出産育児一時金・出産手当金の手続き確認",
      "里帰りからの帰宅・生活再開の準備",
      "上の子がいる場合の赤ちゃん返りへの対応の情報収集",
    ],
  },
};

export interface ShussanJunbiChecklistResult {
  ok: true;
  dueDate: string;
  /** 臨月開始日（出産予定日−28日） */
  ringetsuStartDate: string;
  /** 出産予定日までの日数（負の値=経過日数。超過している場合） */
  daysUntilDue: number;
  /** 臨月開始日までの日数（負の値=既に臨月開始日以降） */
  daysUntilRingetsu: number;
  period: PrepPeriod;
  /** 出産予定日を過ぎている場合 true */
  overdue: boolean;
  categories: ChecklistCategory[];
}

export interface ShussanJunbiChecklistError {
  ok: false;
  message: string;
}

/**
 * 出産予定日と基準日から、時期区分（安定期／臨月／産後）と
 * 時期別チェックリストを算出する。
 *
 * 時期区分の判定:
 *   基準日 < 臨月開始日        → 安定期
 *   臨月開始日 <= 基準日 <= 出産予定日 → 臨月
 *   基準日 > 出産予定日        → 産後
 */
export function calcShussanJunbiChecklist(
  dueDate: string,
  baseDate: string,
): ShussanJunbiChecklistResult | ShussanJunbiChecklistError {
  if (!isValidDateString(dueDate)) {
    return { ok: false, message: "出産予定日を正しい日付で入力してください" };
  }
  if (!isValidDateString(baseDate)) {
    return { ok: false, message: "基準日を正しい日付で入力してください" };
  }

  const ringetsuStartDate = addDays(dueDate, -RINGETSU_KAISHI_MAE_NISSUU);
  const daysUntilDue = diffInDays(dueDate, baseDate);
  const daysUntilRingetsu = diffInDays(ringetsuStartDate, baseDate);

  let period: PrepPeriod;
  if (daysUntilRingetsu > 0) {
    period = "安定期";
  } else if (daysUntilDue >= 0) {
    period = "臨月";
  } else {
    period = "産後";
  }

  const categories: ChecklistCategory[] = (
    Object.keys(CHECKLIST_ITEMS) as ChecklistCategoryId[]
  ).map((id) => {
    const { label, items } = CHECKLIST_ITEMS[id];
    let isCurrent: boolean;
    switch (id) {
      case "stable":
      case "beforeRingetsu":
        isCurrent = period === "安定期";
        break;
      case "hospitalBag":
        isCurrent = period === "臨月";
        break;
      case "postpartum":
        isCurrent = period === "産後";
        break;
    }
    return { id, label, items, isCurrent };
  });

  return {
    ok: true,
    dueDate,
    ringetsuStartDate,
    daysUntilDue,
    daysUntilRingetsu,
    period,
    overdue: daysUntilDue < 0,
    categories,
  };
}
