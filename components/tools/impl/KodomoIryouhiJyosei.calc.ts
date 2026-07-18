/*
 * 子ども医療費助成 自治体早見（P2-T13）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/12-kodomo-iryouhi-jyosei.md
 *
 * SSOT: data/seido/kodomo-iryouhi-jyosei.json（こども家庭庁「こどもに係る医療費の
 * 助成についての調査」令和7年4月1日時点）。
 *
 * ★このツールの性質★
 *   子ども医療費助成は国の法定制度ではなく、各市区町村が実施する「地方単独事業」で、
 *   対象年齢・所得制限・一部自己負担は自治体ごとに異なる。したがって本ツールは
 *   個別自治体の助成額を算出しない。全国調査の統計値をもとに「あなたのお子さんの
 *   年齢を対象にしている自治体が全国で何割か」という早見・傾向のみを示し、
 *   実際の助成内容は必ずお住まいの市区町村で確認するよう促す（数値の捏造をしない）。
 */
import seido from "@/data/seido/kodomo-iryouhi-jyosei.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kodomoIryouhiDataset = seido as unknown as SeidoDataset;
export const KODOMO_IRYOUHI_DISCLAIMER = seido.disclaimer;

const MS = seido.data.municipalityStatistics;
export const TOTAL_MUNICIPALITIES = seido.data.nationalCoverage.totalMunicipalities.value; // 1741

export type CareType = "outpatient" | "inpatient";

/** 子どもの学齢区分。数値が大きいほど年齢が上（対象から外れやすい） */
export type ChildStage = 0 | 1 | 2 | 3 | 4;

export const STAGE_LABELS: Record<ChildStage, string> = {
  0: "未就学児（0歳〜就学前）",
  1: "小学生",
  2: "中学生",
  3: "高校生年代（18歳年度末まで）",
  4: "18歳年度末より上",
};

/**
 * 対象年齢の分布バケット。maxStage は「このバケットの自治体が対象にする上限の学齢区分」。
 * count は data から読む（散文に数値を直書きしない）。
 */
interface AgeBucket {
  key: string;
  maxStage: ChildStage;
  count: number;
}

function ageBuckets(care: CareType): AgeBucket[] {
  const node = care === "outpatient" ? MS.targetAgeOutpatient : MS.targetAgeInpatient;
  const cells = node as Record<string, { value?: number } | undefined>;
  const buckets: { key: string; maxStage: ChildStage }[] = [
    { key: "preschool", maxStage: 0 },
    { key: "age12FiscalYearEnd", maxStage: 1 },
    { key: "age15FiscalYearEnd", maxStage: 2 },
    { key: "age18FiscalYearEnd", maxStage: 3 },
    // 20歳・22歳年度末は通院のみデータがある。入院は個別の内訳が調査に無い（total差で扱う）
    { key: "age20FiscalYearEnd", maxStage: 4 },
    { key: "age22FiscalYearEnd", maxStage: 4 },
  ];
  const out: AgeBucket[] = [];
  for (const b of buckets) {
    const cell = cells[b.key];
    if (cell && typeof cell.value === "number") {
      out.push({ key: b.key, maxStage: b.maxStage, count: cell.value });
    }
  }
  return out;
}

export interface KodomoIryouhiResult {
  ok: true;
  care: CareType;
  stage: ChildStage;
  stageLabel: string;
  /** この学齢を対象にしている自治体数（total − 対象外自治体数） */
  coveredCount: number;
  /** 対象にしていない自治体数 */
  notCoveredCount: number;
  total: number;
  coveredPercent: number; // 0-100（小数1桁）
  incomeLimit: { none: number; withLimit: number };
  copayment: { noCopay: number; withCopay: number };
}

export type KodomoIryouhiCalcResult = KodomoIryouhiResult | { ok: false; error: string };

export function calcKodomoIryouhi(care: CareType, stage: ChildStage): KodomoIryouhiCalcResult {
  if (care !== "outpatient" && care !== "inpatient") {
    return { ok: false, error: "通院／入院の指定が正しくありません。" };
  }
  if (![0, 1, 2, 3, 4].includes(stage)) {
    return { ok: false, error: "学齢区分の指定が正しくありません。" };
  }

  const buckets = ageBuckets(care);
  // 対象外＝「バケットの上限学齢 < 子の学齢」の自治体。総数から引いて対象数を出す
  // （入院は高年齢バケットの内訳が調査に無いため、total差で扱うのが正確）
  const notCoveredCount = buckets
    .filter((b) => b.maxStage < stage)
    .reduce((sum, b) => sum + b.count, 0);
  const coveredCount = TOTAL_MUNICIPALITIES - notCoveredCount;
  const coveredPercent = Math.round((coveredCount / TOTAL_MUNICIPALITIES) * 1000) / 10;

  const il = MS.incomeLimit;
  const cp = MS.copayment;
  const incomeLimit =
    care === "outpatient"
      ? { none: il.outpatientNoLimit.value, withLimit: il.outpatientWithLimit.value }
      : { none: il.inpatientNoLimit.value, withLimit: il.inpatientWithLimit.value };
  const copayment =
    care === "outpatient"
      ? { noCopay: cp.outpatientNoCopay.value, withCopay: cp.outpatientWithCopay.value }
      : { noCopay: cp.inpatientNoCopay.value, withCopay: cp.inpatientWithCopay.value };

  return {
    ok: true,
    care,
    stage,
    stageLabel: STAGE_LABELS[stage],
    coveredCount,
    notCoveredCount,
    total: TOTAL_MUNICIPALITIES,
    coveredPercent,
    incomeLimit,
    copayment,
  };
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
