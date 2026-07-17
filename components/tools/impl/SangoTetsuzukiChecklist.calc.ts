/**
 * 産後手続きリスト生成（期限つき）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t18-sango-tetsuzuki-checklist.md
 *
 * すべての制度数値は data/seido/shussho-todoke-kigen.json・data/seido/jido-teate.json・
 * data/seido/ikukyu-kyufu.json から読む。ここに数値をハードコードしない
 * （例外は下記 ICHIJIKIN_CLAIM_YEARS。理由はコメント参照）。
 *
 * ★このファイルが守っている「罠」★（仕様書 §0）
 *   1. 出生届だけが「出生日当日」を1日目として数える（戸籍法第43条＝民法第140条の
 *      初日不算入の原則の例外）。児童手当・出産育児一時金は民法の原則どおり翌日起算。
 *      この違いを混同しない。
 *   2. 月・年単位の期間（出生届の国外3か月・出産育児一時金の2年）は民法第143条の
 *      「応当日の前日に満了」を適用する。応当日が存在しない月（例: 11/30起算+3か月→
 *      2月に30日がない）は、ただし書どおり「その月の末日そのもの」が満了日になる
 *      （前日にさらに1日戻さない）。
 *   3. 国外出生の場合、出生届とともに国籍留保届をしないと日本国籍を失う場合がある
 *      （法務省の警告）。この注意は必ずUIに出す。
 *   4. 出生届は期限を過ぎても市町村長が必ず受理する（戸籍法第46条）。「期限切れで
 *      受け付けてもらえない」という誤解を防ぐ。
 *   5. 健康保険の加入手続き等、依存データ3件から機械的に導出できない期限は扱わない
 *      （期限を推測・創作しない）。
 */

import shusshoTodoke from "@/data/seido/shussho-todoke-kigen.json";
import jidoTeate from "@/data/seido/jido-teate.json";
import ikukyuKyufu from "@/data/seido/ikukyu-kyufu.json";
import { addDays, isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const shusshoTodokeDataset = shusshoTodoke as unknown as SeidoDataset;
export const jidoTeateDataset = jidoTeate as unknown as SeidoDataset;
export const ikukyuKyufuDataset = ikukyuKyufu as unknown as SeidoDataset;

const ST = shusshoTodoke.data.deadline;
const LATE = shusshoTodoke.data.lateFiling;
const JT = jidoTeate.data.application;
const JT_START_MONTH = jidoTeate.data.payment.startMonth;
const ICHIJIKIN = ikukyuKyufu.data.shussanIkujiIchijikin;

/** 出生届（国内）の届出期間（日）。戸籍法第49条第1項 */
export const SHUSSHO_DOMESTIC_DAYS = ST.days.value;
/** 出生届（国外）の届出期間（月）。戸籍法第49条第1項 */
export const SHUSSHO_ABROAD_MONTHS = ST.monthsAbroad.value;
/** 出生届の起算日ルール（初日算入）の説明文。戸籍法第43条第1項 */
export const SHUSSHO_START_OF_PERIOD_NOTE = ST.startOfPeriod.note;
/** 国外出生時の国籍留保届に関する警告（法務省） */
export const SHUSSHO_NATIONALITY_WARNING = ST.nationalityReservationAbroad.value;
/** 出生届の期限徒過後も市町村長は必ず受理する旨（戸籍法第46条） */
export const SHUSSHO_LATE_FILING_STILL_ACCEPTED = LATE.stillAccepted.value;
/** 出生届の過料上限額（正当な理由がない場合。戸籍法第137条） */
export const SHUSSHO_PENALTY_AMOUNT = LATE.penaltyAmount.value;

/** 児童手当の15日特例の日数。こども家庭庁「児童手当制度のご案内」 */
export const JIDO_TEATE_EXCEPTION_DAYS = JT.deadline.value;
/** 15日特例を逃した場合の原則（申請した月の翌月分から支給）の説明文 */
export const JIDO_TEATE_START_MONTH_NOTE = JT_START_MONTH.note;

/**
 * 出産育児一時金の請求期限（年）。
 * ★ハードコードの例外★ ikukyu-kyufu.json の claimDeadline は
 * 「出産日の翌日から2年以内」という説明文のみのノードで、他の項目のような
 * 独立した数値フィールドを持たない。そのためこの 2 は定数として持つ。
 * tests/sango-tetsuzuki-checklist.test.ts が claimDeadline.value 文字列に
 * 「2年」が含まれることを機械照合し、データが変わった場合の追随漏れを検知する。
 */
export const ICHIJIKIN_CLAIM_YEARS = 2;
/** 出産育児一時金の請求期限の説明文（原文） */
export const ICHIJIKIN_CLAIM_DEADLINE_TEXT: string = ICHIJIKIN.claimDeadline.value;

// ---------------------------------------------------------------- 日付ユーティリティ

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIso(iso: string): { y: number; mo: number; d: number } {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`invalid ISO date: ${iso}`);
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO日付どうしの日数差（to − from） */
function diffDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * 民法第143条の一般原則（暦に従って計算し、起算日に応当する日の前日に満了する。
 * ただし最後の月に応当する日がないときはその月の末日に満了する）を適用する。
 *
 * kisanbi を起算日（1日目）として months か月後の期間満了日を返す。
 * 応当日が存在しない場合（例: 11/30起算+3か月→2月に30日がない）は、
 * その月の末日そのものを返す（前日へさらに1日戻さない＝民法第143条第2項ただし書）。
 */
export function periodEndAfterMonths(kisanbiIso: string, months: number): string {
  const { y, mo, d } = parseIso(kisanbiIso);
  const idx = y * 12 + (mo - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = (((idx % 12) + 12) % 12) + 1;
  const dim = daysInMonth(ny, nm);

  if (d <= dim) {
    const corresponding = `${ny}-${pad2(nm)}-${pad2(d)}`;
    return addDays(corresponding, -1);
  }
  // 応当日が存在しない → その月の末日そのものが満了日（ただし書）
  return `${ny}-${pad2(nm)}-${pad2(dim)}`;
}

// ---------------------------------------------------------------- 入力・バリデーション

export type BirthLocation = "domestic" | "abroad";

export interface SangoTetsuzukiInput {
  /** 出生日。ISO（YYYY-MM-DD） */
  birthDate: string;
  /** 国内出生か国外出生か（出生届の期間の分岐にのみ使う） */
  location: BirthLocation;
  /** 基準日（今日）。ISO。クライアント側で取得した「今日」を渡す */
  today: string;
}

export interface DateValidation {
  ok: boolean;
  error?: string;
}

/** 日付形式のごく簡単な検査（YYYY-MM-DD、実在する日付か） */
export function validateBirthDate(iso: string): DateValidation {
  const m = ISO_RE.exec(iso);
  if (!m) return { ok: false, error: "日付の形式が正しくありません。" };
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return { ok: false, error: "実在しない日付です。" };
  const d = new Date(t);
  const roundTrip = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  if (roundTrip !== iso) return { ok: false, error: "実在しない日付です。" };
  return { ok: true };
}

/** 出生日が今日から極端に先（約1年以上）でないか。ソフト警告のみ */
export function isBirthDateFarInFuture(birthDate: string, today: string): boolean {
  return diffDays(today, birthDate) > 365;
}

/** 出生日が今日から極端に古く（約2年以上）ないか。ソフト警告のみ */
export function isBirthDateVeryOld(birthDate: string, today: string): boolean {
  return diffDays(birthDate, today) > 730;
}

// ---------------------------------------------------------------- 手続ごとの期限計算

export type ProcedureKey = "shussho-todoke" | "jido-teate" | "shussan-ichijikin";

export interface ProcedureItem {
  key: ProcedureKey;
  label: string;
  /** 期限日（ISO） */
  deadlineDate: string;
  /** 起算日ルールの説明（「出生日当日を1日目として」「出生日の翌日を1日目として」等） */
  kisanbiNote: string;
  /** 期限日数・期間の説明（「14日以内」「15日以内」「2年以内」等） */
  periodNote: string;
  /** 今日から期限日までの残り日数（負の値＝期限超過） */
  daysRemaining: number;
  /** 期限を過ぎているか */
  overdue: boolean;
  description: string;
  legalBasis: string;
}

/** 出生届の期限日（国内=14日／国外=3か月、起算日は出生日当日） */
export function calcShusshoTodokeDeadline(birthDate: string, location: BirthLocation): string {
  if (location === "domestic") {
    return addDays(birthDate, SHUSSHO_DOMESTIC_DAYS - 1);
  }
  return periodEndAfterMonths(birthDate, SHUSSHO_ABROAD_MONTHS);
}

/** 児童手当（15日特例）の期限日（起算日は出生日の翌日） */
export function calcJidoTeateDeadline(birthDate: string): string {
  const kisanbi = addDays(birthDate, 1);
  return addDays(kisanbi, JIDO_TEATE_EXCEPTION_DAYS - 1);
}

/** 出産育児一時金の請求期限日（起算日は出産日の翌日、2年後の応当日の前日） */
export function calcIchijikinDeadline(birthDate: string): string {
  const kisanbi = addDays(birthDate, 1);
  return periodEndAfterMonths(kisanbi, ICHIJIKIN_CLAIM_YEARS * 12);
}

function buildProcedure(
  key: ProcedureKey,
  label: string,
  deadlineDate: string,
  kisanbiNote: string,
  periodNote: string,
  description: string,
  legalBasis: string,
  today: string,
): ProcedureItem {
  const daysRemaining = diffDays(today, deadlineDate);
  return {
    key,
    label,
    deadlineDate,
    kisanbiNote,
    periodNote,
    daysRemaining,
    overdue: daysRemaining < 0,
    description,
    legalBasis,
  };
}

// ---------------------------------------------------------------- 総合

export interface SangoTetsuzukiResult {
  expired: boolean;
  procedures: ProcedureItem[];
}

export function calcSangoTetsuzuki(input: SangoTetsuzukiInput): SangoTetsuzukiResult {
  const expired =
    isDataExpired(shusshoTodokeDataset, input.today) ||
    isDataExpired(jidoTeateDataset, input.today) ||
    isDataExpired(ikukyuKyufuDataset, input.today);

  if (expired) {
    return { expired: true, procedures: [] };
  }

  const { birthDate, location, today } = input;

  const shusshoDeadline = calcShusshoTodokeDeadline(birthDate, location);
  const shussho = buildProcedure(
    "shussho-todoke",
    "出生届の提出",
    shusshoDeadline,
    "出生日当日を1日目として数えます（戸籍法第43条＝民法の初日不算入の例外）",
    location === "domestic"
      ? `${SHUSSHO_DOMESTIC_DAYS}日以内`
      : `${SHUSSHO_ABROAD_MONTHS}か月以内`,
    location === "domestic"
      ? "出生地・本籍地・届出人の所在地のいずれかの市区町村役場に届け出ます。"
      : "在外公館（大使館・領事館）または本籍地の市区町村役場に届け出ます。国籍留保届もあわせて必要です。",
    "戸籍法第49条・第43条",
    today,
  );

  const jidoTeateDeadline = calcJidoTeateDeadline(birthDate);
  const jidoTeateItem = buildProcedure(
    "jido-teate",
    "児童手当の認定請求（15日特例）",
    jidoTeateDeadline,
    "出生日の翌日を1日目として数えます（民法の原則どおり）",
    `${JIDO_TEATE_EXCEPTION_DAYS}日以内`,
    "現住所の市区町村（公務員は勤務先）に認定請求書を提出します。この期限内なら出生月の翌月分から支給されます。",
    "児童手当法。こども家庭庁「児童手当制度のご案内」",
    today,
  );

  const ichijikinDeadline = calcIchijikinDeadline(birthDate);
  const ichijikin = buildProcedure(
    "shussan-ichijikin",
    "出産育児一時金の請求",
    ichijikinDeadline,
    "出産日の翌日を1日目として数えます（民法の原則どおり）",
    `${ICHIJIKIN_CLAIM_YEARS}年以内`,
    "直接支払制度・受取代理制度を利用した場合は、多くのケースで自分で請求する必要はありません。差額請求や償還払いの場合は加入する健康保険に請求します。",
    "健康保険法第101条。厚生労働省「出産育児一時金等について」",
    today,
  );

  const procedures = [shussho, jidoTeateItem, ichijikin].sort((a, b) =>
    a.deadlineDate.localeCompare(b.deadlineDate),
  );

  return { expired: false, procedures };
}
