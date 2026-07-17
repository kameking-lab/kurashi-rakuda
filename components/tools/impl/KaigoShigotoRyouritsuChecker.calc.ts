/**
 * 介護と仕事の両立制度チェッカー（P2-T38）の計算ロジック本体。
 * 仕様: specs/b-tools/p2-t38-kaigo-shigoto-ryouritsu-checker.md
 *
 * 制度データは data/seido/kaigo-shigoto-ryouritsu-seido.json を単一の情報源(SSOT)とする。
 * 日数・回数・時間・年数・対象家族の範囲・除外要件の原文は、すべて同JSONを import して
 * 参照し、本ファイルに数値やプロースをハードコードしない（変わったらJSONだけ差し替える）。
 *
 * ★このファイルが守っている「罠」★（仕様書 §0〜§7）
 *   1. 「対象家族」の範囲外（おじ・おば等）・「要介護状態」の要件を満たさない場合は
 *      6制度すべて対象外（baseEligible=false で即座に notTarget）
 *   2. 労使協定により除外「できる」制度（介護休業・介護休暇・所定外労働の制限・
 *      所定労働時間の短縮等の措置）と、法律が直接除外を定める制度（時間外労働の制限・
 *      深夜業の制限）を混同しない。前者は該当しても "conditional"（要確認）、
 *      後者は該当すれば "notTarget"（確定）とする
 *   3. 介護休暇の労使協定除外は2025年4月改正後「週の所定労働日数が2日以下」のみで、
 *      勤続1年未満・6か月未満は除外理由にならない（他制度と異なる）
 *   4. 深夜業の制限固有の除外要件（深夜に代わって介護できる同居家族の有無）を
 *      他の5制度の判定に流用しない
 *   5. 所定労働時間の短縮等の措置は「介護休業をしていない」方が対象という前提を
 *      常時注記する（入力では判定しない）
 */
import kaigoShigotoRyouritsu from "@/data/seido/kaigo-shigoto-ryouritsu-seido.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kaigoShigotoRyouritsuDataset = kaigoShigotoRyouritsu as unknown as SeidoDataset;

const D = kaigoShigotoRyouritsu.data;

export const DISCLAIMER = kaigoShigotoRyouritsu.disclaimer;

// ---------------------------------------------------------------- 定義（対象家族・要介護状態）

/** 対象家族の範囲（7分類）。data.definitions.taishoKazoku.value をそのまま使う */
export const TAISHO_KAZOKU_LIST: string[] = D.definitions.taishoKazoku.value;
export const YOKAIGO_JOTAI_DEFINITION = D.definitions.yoKaigoJotai.value;
export const YOKAIGO_PERIOD_WEEKS = D.definitions.yoKaigoPeriodWeeks.value;

export type RelationOption =
  | "haigusha"
  | "fubo"
  | "ko"
  | "haigushaFubo"
  | "sofubo"
  | "kyodaishimai"
  | "mago"
  | "other";

const RELATION_KEYS: Exclude<RelationOption, "other">[] = [
  "haigusha",
  "fubo",
  "ko",
  "haigushaFubo",
  "sofubo",
  "kyodaishimai",
  "mago",
];

/** 「対象外の親族（対象外）」を末尾に加えた選択肢一覧。ラベルはJSONの原文をそのまま使う */
export const RELATION_OPTIONS: { value: RelationOption; label: string; isTaishoKazoku: boolean }[] =
  [
    ...TAISHO_KAZOKU_LIST.map((label, i) => ({
      value: RELATION_KEYS[i],
      label,
      isTaishoKazoku: true,
    })),
    {
      value: "other" as const,
      label: "上記以外の親族（例: おじ・おば、配偶者の祖父母・配偶者の兄弟姉妹など）",
      isTaishoKazoku: false,
    },
  ];

export type YesNoUnsure = "yes" | "no" | "unsure";

// ---------------------------------------------------------------- 制度ごとの数値・原文

// 1. 介護休業
export const KAIGO_KYUGYO_MAX_DAYS = D.kaigoKyugyo.maxDays.value;
export const KAIGO_KYUGYO_MAX_COUNT = D.kaigoKyugyo.maxCount.value;
export const KAIGO_KYUGYO_DEADLINE_NOTE = D.kaigoKyugyo.requestMethod.note;
export const KAIGO_KYUGYO_FIXED_TERM_NOTE = D.kaigoKyugyo.fixedTermWorker.value;
export const KAIGO_KYUGYO_EXCLUSION_TEXT = D.kaigoKyugyo.laborAgreementExclusion.value;

// 2. 介護休暇
export const KAIGO_KYUKA_DAYS_PER_YEAR = D.kaigoKyuka.daysPerYear.value;
export const KAIGO_KYUKA_DAYS_PER_YEAR_MULTIPLE = D.kaigoKyuka.daysPerYearMultiple.value;
export const KAIGO_KYUKA_HOURLY_UNIT = D.kaigoKyuka.hourlyUnit.value;
export const KAIGO_KYUKA_EXCLUSION_TEXT = D.kaigoKyuka.laborAgreementExclusion.value;
export const KAIGO_KYUKA_EMPLOYER_CANNOT_REFUSE = D.kaigoKyuka.employerCannotRefuse.value;

// 3. 所定外労働の制限
export const SHOTEIGAI_PERIOD_TEXT = D.shoteigaiRodoSeigen.periodRange.value;
export const SHOTEIGAI_DEADLINE_NOTE = D.shoteigaiRodoSeigen.periodRange.note;
export const SHOTEIGAI_EXCLUSION_TEXT = D.shoteigaiRodoSeigen.laborAgreementExclusion.value;

// 4. 時間外労働の制限
export const JIKANGAI_MONTHLY_LIMIT = D.jikangaiRodoSeigen.monthlyLimit.value;
export const JIKANGAI_YEARLY_LIMIT = D.jikangaiRodoSeigen.yearlyLimit.value;
export const JIKANGAI_PERIOD_TEXT = D.jikangaiRodoSeigen.periodRange.value;
export const JIKANGAI_DEADLINE_NOTE = D.jikangaiRodoSeigen.periodRange.note;
export const JIKANGAI_EXCLUSION_TEXT = D.jikangaiRodoSeigen.exclusion.value;

// 5. 深夜業の制限
export const SHINYA_PERIOD_TEXT = D.shinyaGyoSeigen.periodRange.value;
export const SHINYA_DEADLINE_NOTE = D.shinyaGyoSeigen.periodRange.note;
export const SHINYA_EXCLUSION_TEXT = D.shinyaGyoSeigen.exclusion.value;

// 6. 所定労働時間の短縮等の措置
export const TANSHUKU_PERIOD_YEARS = D.shoteiRodoJikanTanshuku.periodYears.value;
export const TANSHUKU_MIN_COUNT = D.shoteiRodoJikanTanshuku.minCount.value;
export const TANSHUKU_METHODS: string[] = D.shoteiRodoJikanTanshuku.methods.value;
export const TANSHUKU_EXCLUSION_TEXT = D.shoteiRodoJikanTanshuku.laborAgreementExclusion.value;
export const TANSHUKU_EMPLOYER_OBLIGATION = D.shoteiRodoJikanTanshuku.employerObligation.value;

// 7. 令和7年（2025年）4月改正・事業主の義務（入力に依存しない静的情報）
export const KOBETSU_SHUCHI_TEXT = D.kaisei2025.kobetsuShuchi.value;
export const JOHO_TEIKYO_40_TEXT = D.kaisei2025.johoTeikyo40.value;
export const JOHO_TEIKYO_AGE = D.kaisei2025.johoTeikyoAge.value;
export const KOYO_KANKYO_SEIBI_LIST: string[] = D.kaisei2025.koyoKankyoSeibi.value;
export const TELEWORK_TEXT = D.kaisei2025.telework.value;

// ---------------------------------------------------------------- 入力

export interface KaigoShigotoRyouritsuInput {
  relation: RelationOption;
  /** 要介護状態（2週間以上常時介護を必要とする状態）に該当する見込みか */
  careNeedLikely: YesNoUnsure;
  /** 当該事業主に引き続き雇用された期間が1年未満か */
  lessThanOneYear: boolean;
  /** 週の所定労働日数が2日以下か */
  twoOrFewerDaysPerWeek: boolean;
  /** 期間を定めて雇用されているか（有期契約労働者か） */
  fixedTermContract: boolean;
  /** 深夜（午後10時〜午前5時）に代わって対象家族を介護できる同居の家族がいるか（深夜業の制限のみに影響） */
  nightCareSubstitute: YesNoUnsure;
}

// ---------------------------------------------------------------- 結果

export type SystemStatus = "target" | "conditional" | "notTarget";

export const STATUS_LABEL: Record<SystemStatus, string> = {
  target: "対象",
  conditional: "条件付き（要確認）",
  notTarget: "対象外",
};

export type SystemKey =
  | "kaigoKyugyo"
  | "kaigoKyuka"
  | "shoteigaiRodoSeigen"
  | "jikangaiRodoSeigen"
  | "shinyaGyoSeigen"
  | "shoteiRodoJikanTanshuku";

export const SYSTEM_LABELS: Record<SystemKey, string> = {
  kaigoKyugyo: "介護休業",
  kaigoKyuka: "介護休暇",
  shoteigaiRodoSeigen: "所定外労働の制限（残業免除）",
  jikangaiRodoSeigen: "時間外労働の制限",
  shinyaGyoSeigen: "深夜業の制限",
  shoteiRodoJikanTanshuku: "所定労働時間の短縮等の措置",
};

export interface SystemResult {
  key: SystemKey;
  label: string;
  status: SystemStatus;
  statusLabel: string;
  /** 表示する数値・期間の説明文（すべてJSONの value フィールド由来） */
  numbers: string[];
  /** 申出期限の説明（JSONの note フィールドの原文。ない制度は undefined） */
  deadline?: string;
  /** 判定理由・注記（除外要件の原文・労使協定の要確認案内など） */
  notes: string[];
}

const CARE_NEED_UNSURE_NOTE = `育児・介護休業法の「要介護状態」は「${YOKAIGO_JOTAI_DEFINITION}」を指し、介護保険の要介護認定（要介護1〜5等）とは別の基準です。要介護認定を受けていなくても、また要支援・非該当の判定でも、この基準に当てはまれば対象になり得ます。`;
const RELATION_NOT_TARGET_NOTE =
  "介護休業・介護休暇などの対象になる「対象家族」は、配偶者・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫の7分類に限られます（同居・扶養の要件はありません）。おじ・おば、配偶者の祖父母・配偶者の兄弟姉妹はこの範囲に含まれないため、いずれの制度も対象外です。";
const CARE_NEED_NOT_TARGET_NOTE = `要介護状態（${YOKAIGO_JOTAI_DEFINITION}）に該当しない場合は、いずれの制度も対象になりません。`;
const LABOR_AGREEMENT_FOLLOWUP =
  "この条件に該当しても、勤務先が労使協定でその労働者を対象から除外する定めをしていなければ対象になります。労使協定の有無は就業規則や人事担当にご確認ください。";
const JIKANGAI_SHINYA_LAW_NOTE =
  "この制度は、労使協定の有無にかかわらず法律により直接除外が定められています（他の制度のように労使協定の有無で結果が変わるものではありません）。";

/**
 * 6制度すべての判定結果を返す。仕様書 §0〜§6 のロジックをそのまま実装する。
 */
export function evaluateSystems(input: KaigoShigotoRyouritsuInput): SystemResult[] {
  const relationOk = input.relation !== "other";
  const careNeedOk = input.careNeedLikely !== "no";
  const baseEligible = relationOk && careNeedOk;

  const globalNotes: string[] = [];
  if (!relationOk) globalNotes.push(RELATION_NOT_TARGET_NOTE);
  if (input.careNeedLikely === "no") globalNotes.push(CARE_NEED_NOT_TARGET_NOTE);
  if (input.careNeedLikely === "unsure") globalNotes.push(CARE_NEED_UNSURE_NOTE);

  const results: SystemResult[] = [];

  // 1. 介護休業
  {
    const notes = [...globalNotes];
    let status: SystemStatus;
    if (!baseEligible) {
      status = "notTarget";
    } else {
      const excludable = input.lessThanOneYear || input.twoOrFewerDaysPerWeek;
      status = excludable ? "conditional" : "target";
      if (excludable) {
        notes.push(KAIGO_KYUGYO_EXCLUSION_TEXT, LABOR_AGREEMENT_FOLLOWUP);
      }
      if (input.fixedTermContract) {
        status = "conditional";
        notes.push(KAIGO_KYUGYO_FIXED_TERM_NOTE);
      }
    }
    results.push({
      key: "kaigoKyugyo",
      label: SYSTEM_LABELS.kaigoKyugyo,
      status,
      statusLabel: STATUS_LABEL[status],
      numbers: [
        `対象家族1人につき通算${KAIGO_KYUGYO_MAX_DAYS}日まで`,
        `${KAIGO_KYUGYO_MAX_COUNT}回まで分割可能`,
      ],
      deadline: KAIGO_KYUGYO_DEADLINE_NOTE,
      notes,
    });
  }

  // 2. 介護休暇
  {
    const notes = [...globalNotes];
    let status: SystemStatus;
    if (!baseEligible) {
      status = "notTarget";
    } else if (input.twoOrFewerDaysPerWeek) {
      status = "conditional";
      notes.push(KAIGO_KYUKA_EXCLUSION_TEXT, LABOR_AGREEMENT_FOLLOWUP);
    } else {
      status = "target";
    }
    results.push({
      key: "kaigoKyuka",
      label: SYSTEM_LABELS.kaigoKyuka,
      status,
      statusLabel: STATUS_LABEL[status],
      numbers: [
        `1年度に${KAIGO_KYUKA_DAYS_PER_YEAR}日（対象家族が2人以上の場合は${KAIGO_KYUKA_DAYS_PER_YEAR_MULTIPLE}日）まで`,
        KAIGO_KYUKA_HOURLY_UNIT ? "時間単位での取得も可能" : "1日単位のみ",
      ],
      notes: baseEligible ? [...notes, KAIGO_KYUKA_EMPLOYER_CANNOT_REFUSE] : notes,
    });
  }

  // 3. 所定外労働の制限
  {
    const notes = [...globalNotes];
    let status: SystemStatus;
    if (!baseEligible) {
      status = "notTarget";
    } else {
      const excludable = input.lessThanOneYear || input.twoOrFewerDaysPerWeek;
      status = excludable ? "conditional" : "target";
      if (excludable) notes.push(SHOTEIGAI_EXCLUSION_TEXT, LABOR_AGREEMENT_FOLLOWUP);
    }
    results.push({
      key: "shoteigaiRodoSeigen",
      label: SYSTEM_LABELS.shoteigaiRodoSeigen,
      status,
      statusLabel: STATUS_LABEL[status],
      numbers: [SHOTEIGAI_PERIOD_TEXT],
      deadline: SHOTEIGAI_DEADLINE_NOTE,
      notes,
    });
  }

  // 4. 時間外労働の制限（法律による直接除外）
  {
    const notes = [...globalNotes];
    let status: SystemStatus;
    if (!baseEligible) {
      status = "notTarget";
    } else {
      const excluded = input.lessThanOneYear || input.twoOrFewerDaysPerWeek;
      status = excluded ? "notTarget" : "target";
      if (excluded) notes.push(JIKANGAI_EXCLUSION_TEXT, JIKANGAI_SHINYA_LAW_NOTE);
    }
    results.push({
      key: "jikangaiRodoSeigen",
      label: SYSTEM_LABELS.jikangaiRodoSeigen,
      status,
      statusLabel: STATUS_LABEL[status],
      numbers: [
        `1か月${JIKANGAI_MONTHLY_LIMIT}時間・1年${JIKANGAI_YEARLY_LIMIT}時間まで`,
        JIKANGAI_PERIOD_TEXT,
      ],
      deadline: JIKANGAI_DEADLINE_NOTE,
      notes,
    });
  }

  // 5. 深夜業の制限（法律による直接除外＋固有の除外要件）
  {
    const notes = [...globalNotes];
    let status: SystemStatus;
    if (!baseEligible) {
      status = "notTarget";
    } else if (input.lessThanOneYear) {
      status = "notTarget";
      notes.push(SHINYA_EXCLUSION_TEXT, JIKANGAI_SHINYA_LAW_NOTE);
    } else if (input.nightCareSubstitute === "yes") {
      status = "notTarget";
      notes.push(
        "深夜（午後10時〜午前5時）に常態として対象家族を介護できる同居の家族がいるため、法律上、深夜業の制限は請求できません。",
      );
    } else if (input.nightCareSubstitute === "unsure") {
      status = "conditional";
      notes.push(
        "深夜に代わって対象家族を介護できる同居の家族がいるかどうかで対象可否が変わります。この点は本ツールでは判定できないため、詳しい要件を勤務先にご確認ください。",
      );
    } else {
      status = "target";
    }
    results.push({
      key: "shinyaGyoSeigen",
      label: SYSTEM_LABELS.shinyaGyoSeigen,
      status,
      statusLabel: STATUS_LABEL[status],
      numbers: [SHINYA_PERIOD_TEXT],
      deadline: SHINYA_DEADLINE_NOTE,
      notes,
    });
  }

  // 6. 所定労働時間の短縮等の措置
  {
    const notes = [...globalNotes];
    let status: SystemStatus;
    if (!baseEligible) {
      status = "notTarget";
    } else {
      const excludable = input.lessThanOneYear || input.twoOrFewerDaysPerWeek;
      status = excludable ? "conditional" : "target";
      if (excludable) notes.push(TANSHUKU_EXCLUSION_TEXT, LABOR_AGREEMENT_FOLLOWUP);
    }
    if (baseEligible) {
      notes.push(
        "この措置は、介護休業をしていない方が対象です（介護休業を取得している期間は対象になりません）。",
      );
    }
    results.push({
      key: "shoteiRodoJikanTanshuku",
      label: SYSTEM_LABELS.shoteiRodoJikanTanshuku,
      status,
      statusLabel: STATUS_LABEL[status],
      numbers: [
        `利用開始日から連続${TANSHUKU_PERIOD_YEARS}年以上の期間で、${TANSHUKU_MIN_COUNT}回以上利用できる措置（介護費用の助成による場合を除く）`,
      ],
      notes,
    });
  }

  return results;
}

// ---------------------------------------------------------------- バリデーション付きエントリポイント

export type KaigoShigotoRyouritsuCalcResult =
  | { ok: true; result: SystemResult[] }
  | { ok: false; error: string };

export function calculateKaigoShigotoRyouritsu(
  input: Partial<KaigoShigotoRyouritsuInput>,
): KaigoShigotoRyouritsuCalcResult {
  if (!input.relation) {
    return { ok: false, error: "対象家族との続柄を選択してください" };
  }
  if (!input.careNeedLikely) {
    return { ok: false, error: "要介護状態の見込みを選択してください" };
  }

  const normalized: KaigoShigotoRyouritsuInput = {
    relation: input.relation,
    careNeedLikely: input.careNeedLikely,
    lessThanOneYear: input.lessThanOneYear ?? false,
    twoOrFewerDaysPerWeek: input.twoOrFewerDaysPerWeek ?? false,
    fixedTermContract: input.fixedTermContract ?? false,
    nightCareSubstitute: input.nightCareSubstitute ?? "no",
  };

  return { ok: true, result: evaluateSystems(normalized) };
}
