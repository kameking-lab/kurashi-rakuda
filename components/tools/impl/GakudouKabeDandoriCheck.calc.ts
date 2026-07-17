/**
 * 学童・小1の壁 段取りチェック の計算ロジック（specs/b-tools/p2-t20-gakudou-kabe-dandori-check.md）。
 *
 * すべての制度事実は data/seido/gakudou-hoiku-kijun.json から読む。ここに数値を書かない
 * （例外は年度・時期区分を求めるための日付演算・比較のような算術上の定数）。
 *
 * ★このファイルが守っている鉄則★（仕様書の「★データの限界★」節）
 *   1. 令和2年4月1日以降、放課後児童健全育成事業の基準は全て「参酌すべき基準」であり、
 *      国が直接強制する全国一律の最低基準ではない（市町村が条例で定める）。
 *   2. 開所時間・お迎え締切時刻・申込締切日という「具体的な時刻・日付」は、
 *      本データセットに一次情報が存在しない（開所時間は「当該事業所ごとに定める」、
 *      申込締切日はそもそも省令に規定がない）。よって本ツールはこれらを一切生成しない。
 *   3. 日付演算の対象は「入学（予定）年度」という粒度の粗い時期区分のみ
 *      （入学前年の秋頃／入学直前／入学後）であり、複雑な日付逆算はしない。
 *   4. 待機児童は小学4年生が最多（5,589人＝「小4の壁」）という実態を隠さず示しつつ、
 *      年度途中に空きが出る実態（5月16,330人→10月速報値7,363人）も併せて示す。
 */

import gakudouHoikuKijun from "@/data/seido/gakudou-hoiku-kijun.json";
import { isDataExpired, type SeidoDataset } from "@/lib/tools/seido";

export const gakudouHoikuDataset = gakudouHoikuKijun as unknown as SeidoDataset;

const D = gakudouHoikuKijun.data;

// ---------------------------------------------------------------- 制度上の事実（データ取得のみ。数値のハードコード禁止）

/** 対象学年（小学1年生から小学6年生まで） */
export const GRADE_RANGE_LABEL = D.eligibility.gradeRange.value;
/** 支援の単位の定員（おおむね40人以下。参酌基準） */
export const SUPPORT_UNIT_MAX_CHILDREN = D.standards.supportUnit.maxChildren.value;
/** 国の基準の法的性質（参酌すべき基準）とその意味の注記 */
export const STANDARDS_NATURE_VALUE = D.overview.standardsNature.value;
export const STANDARDS_NATURE_NOTE = D.overview.standardsNature.note;

/** 開所時間の参酌基準（具体的な時刻ではなく、時間数・日数の目安） */
export const OPENING_HOURS_STANDARD = {
  schoolHolidayMinHours: D.standards.openingHours.schoolHolidayMinHours.value,
  schoolDayMinHours: D.standards.openingHours.schoolDayMinHours.value,
  minDaysPerYear: D.standards.openingHours.minDaysPerYear.value,
};

/** 待機児童数（全国・令和7年5月1日現在） */
export const WAITING_CHILDREN_TOTAL = D.statistics.waitingChildren.total.value;
export const WAITING_CHILDREN_BY_GRADE: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: D.statistics.waitingChildren.grade1.value,
  2: D.statistics.waitingChildren.grade2.value,
  3: D.statistics.waitingChildren.grade3.value,
  4: D.statistics.waitingChildren.grade4.value,
  5: D.statistics.waitingChildren.grade5.value,
  6: D.statistics.waitingChildren.grade6.value,
};
/** 待機児童が最も多い学年（小学4年生＝「小4の壁」の実態） */
export const WAITING_CHILDREN_PEAK_GRADE = 4 as const;
export const SURVEY_DATE = D.statistics.surveyDate.value;
/** 年度途中（10月時点）の速報値。確定値ではない旨は画面側で必ず注記する */
export const WAITING_CHILDREN_OCT_PROVISIONAL = D.statistics.provisional.waitingChildrenOct.value;

// ---------------------------------------------------------------- 年度・学年の判定

/** 4月始まりの年度。3月は前年度扱い */
export function fiscalYearOf(dateIso: string): number {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateIso);
  if (!m) throw new Error(`不正な日付形式です: ${dateIso}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 4 ? year : year - 1;
}

export interface EntryYearValidation {
  ok: boolean;
  error?: string;
}

const MIN_ENTRY_YEAR = 1990;
const MAX_ENTRY_YEAR = 2100;

/** 入学（予定）年度の入力バリデーション（範囲・整数チェックのみ） */
export function validateEntryYear(entryFiscalYear: number): EntryYearValidation {
  if (!Number.isInteger(entryFiscalYear)) {
    return { ok: false, error: "入学（予定）年度は整数で入力してください。" };
  }
  if (entryFiscalYear < MIN_ENTRY_YEAR || entryFiscalYear > MAX_ENTRY_YEAR) {
    return {
      ok: false,
      error: `入学（予定）年度は${MIN_ENTRY_YEAR}〜${MAX_ENTRY_YEAR}の範囲で入力してください。`,
    };
  }
  return { ok: true };
}

/** 入学予定年度が今日から10年以上先か（入力ミスの可能性のソフト警告） */
export function isEntryYearFarFuture(entryFiscalYear: number, today: string): boolean {
  return fiscalYearOf(today) - entryFiscalYear < -10;
}

export type StageKey = "tooEarly" | "prepAutumn" | "justBefore" | "afterEntry" | "outOfRange";

export const STAGE_LABELS: Record<StageKey, string> = {
  tooEarly: "入学まで時間があります（情報収集期）",
  prepAutumn: "入学前年の秋頃（本格的な準備期）",
  justBefore: "入学直前（年明け〜3月）",
  afterEntry: "入学後（在学中）",
  outOfRange: "対象学年の範囲外（学童保育の対象は小学生です）",
};

/**
 * 時期区分の判定。
 * ISO日付文字列（YYYY-MM-DD）は辞書式比較がそのまま日付の前後判定になるため、
 * Dateオブジェクトへの変換は行わず文字列比較のみで行う（うるう年の補正は不要）。
 */
export function classifyStage(entryFiscalYear: number, today: string): StageKey {
  const gradeOffset = fiscalYearOf(today) - entryFiscalYear;

  if (gradeOffset >= 6) return "outOfRange";
  if (gradeOffset >= 0) return "afterEntry";

  const prepAutumnStart = `${entryFiscalYear - 1}-09-01`;
  const justBeforeStart = `${entryFiscalYear}-01-01`;

  if (today < prepAutumnStart) return "tooEarly";
  if (today < justBeforeStart) return "prepAutumn";
  return "justBefore";
}

/** 学年（小1〜小6）。就学前・対象範囲外は null */
export function gradeOf(entryFiscalYear: number, today: string): number | null {
  const gradeOffset = fiscalYearOf(today) - entryFiscalYear;
  if (gradeOffset < 0 || gradeOffset > 5) return null;
  return gradeOffset + 1;
}

// ---------------------------------------------------------------- チェックリスト

export type ChecklistCategoryId = "prepAutumn" | "justBefore" | "afterEntry";

export interface ChecklistCategory {
  id: ChecklistCategoryId;
  label: string;
  items: string[];
  /** 今の時期区分に対応する区分か（UIでの強調表示に使う） */
  isCurrent: boolean;
}

/**
 * 区分ごとの固定チェックリスト項目。
 * ★一次情報（統計・法令）に基づく数値ではなく、一般的に知られている段取りをまとめた
 * 自作リストである★（ShussanJunbiChecklist.calc.ts と同様の扱い。UI側で必ず明記する）。
 */
const CHECKLIST_ITEMS: Record<ChecklistCategoryId, { label: string; items: string[] }> = {
  prepAutumn: {
    label: "入学前年の秋頃までに",
    items: [
      "お住まいの市区町村の学童保育（放課後児童クラブ）の申込み時期・必要書類をウェブサイトや窓口で確認する",
      "通う予定の小学校区の学童保育の定員・待機状況を確認する（支援の単位はおおむね40人が参酌基準ですが、実際の定員はクラブごとに異なります）",
      "学童保育の対象学年の範囲（自治体・クラブにより低学年優先・高学年も可などの差がある）を確認する",
      "学校の学童保育以外の選択肢（民間学童、放課後子供教室、ファミリー・サポート・センター等）も情報収集しておく",
      "延長利用の可否・追加料金の有無を確認する",
    ],
  },
  justBefore: {
    label: "入学直前（年明け〜3月）に",
    items: [
      "申込み結果を確認する。利用できない場合の代替手段（民間学童、祖父母、ファミリー・サポート・センター等）を検討する",
      "開所時間・お迎えの締切時刻・延長利用の条件を、通う予定のクラブに直接確認する（全国一律の時刻はありません）",
      "持ち物・利用ルール（おやつ代、保護者会や当番の有無など）を確認する",
      "職場に学童保育の利用開始や、慣らし期間の勤務調整について相談する",
      "子どもと一緒に、学校・学童保育までの道のりを実際に歩いて確認する",
    ],
  },
  afterEntry: {
    label: "入学後に",
    items: [
      "実際の開所時間・お迎えの締切・長期休み（夏休み等）の運用を確認し、勤務時間や送迎の調整を見直す",
      "申込みが通らなかった場合は、年度途中の空き状況をお住まいの市区町村に定期的に確認する（5月時点で利用できなかった児童数は全国で16,330人ですが、10月時点の速報値では7,363人まで減少しており、年度途中に空きが出ることがあります）",
      "学年が上がるにつれて利用継続の可否が変わる場合があるため、毎年度、継続利用の手続き・締切を確認する（待機児童は小学4年生が最も多く、高学年になるほど利用できないケースが増える傾向があります）",
      "苦情・相談窓口（クラブの運営規程に定めがあります）や、安全計画・送迎時の安全確認の実施状況も確認しておくと安心です",
    ],
  },
};

/** phase から対応するチェックリストの ChecklistCategoryId を返す（tooEarly/outOfRangeは対応なし） */
function currentCategoryOf(phase: StageKey): ChecklistCategoryId | null {
  switch (phase) {
    case "prepAutumn":
      return "prepAutumn";
    case "justBefore":
      return "justBefore";
    case "afterEntry":
      return "afterEntry";
    default:
      return null;
  }
}

export function buildChecklist(phase: StageKey): ChecklistCategory[] {
  const current = currentCategoryOf(phase);
  return (Object.keys(CHECKLIST_ITEMS) as ChecklistCategoryId[]).map((id) => {
    const { label, items } = CHECKLIST_ITEMS[id];
    return { id, label, items, isCurrent: id === current };
  });
}

// ---------------------------------------------------------------- 総合

export interface GakudouKabeResult {
  ok: true;
  expired: boolean;
  entryFiscalYear: number;
  todayFiscalYear: number;
  gradeOffset: number;
  grade: number | null;
  phase: StageKey;
  stageLabel: string;
  isFarFuture: boolean;
  categories: ChecklistCategory[];
}

export interface GakudouKabeError {
  ok: false;
  error: string;
}

export function calcGakudouKabeDandori(
  entryFiscalYear: number,
  today: string,
): GakudouKabeResult | GakudouKabeError {
  const validation = validateEntryYear(entryFiscalYear);
  if (!validation.ok) {
    return { ok: false, error: validation.error! };
  }

  const todayFiscalYear = fiscalYearOf(today);
  const gradeOffset = todayFiscalYear - entryFiscalYear;
  const phase = classifyStage(entryFiscalYear, today);
  const grade = gradeOf(entryFiscalYear, today);
  const isFarFuture = isEntryYearFarFuture(entryFiscalYear, today);
  const categories = buildChecklist(phase);
  const expired = isDataExpired(gakudouHoikuDataset, today);

  return {
    ok: true,
    expired,
    entryFiscalYear,
    todayFiscalYear,
    gradeOffset,
    grade,
    phase,
    stageLabel: STAGE_LABELS[phase],
    isFarFuture,
    categories,
  };
}
