/**
 * 介護施設タイプ別 費用早見（紹介送客なし）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t39-kaigo-shisetsu-hiyou-hayami.md
 *
 * すべての制度数値は data/seido/kaigo-shisetsu-hiyou-souba.json（2026年7月31日までの値）と
 * data/seido/kaigo-hoken.json（2026年8月1日以降の値。重複回避のためこちらにのみ収録）から読む。
 * ここに金額を直書きしない。
 *
 * ★このツールが行わないこと★
 *   施設サービス費の自己負担（1〜3割）・高額介護サービス費・日常生活費・各種加算の計算。
 *   これらは要介護度・利用単位数・所得区分の入力が必要であり「介護保険 自己負担シミュレーター」
 *   （kaigo-jikofutan）の役割。本ツールは食費・居住費（補足給付）の早見に専念する。
 *
 * ★紹介送客なし★（docs/06_紹介ポリシー.md）
 *   特定の施設・事業者への誘導リンクは一切扱わない。民間施設（有料老人ホーム等）の費用は
 *   公的な一次情報がないため null のまま表示し、個々の施設を確認できる公的な仕組み
 *   （介護サービス情報公表システム）は制度名のみをテキストで案内する（UI側でリンク化しない）。
 */
import kaigoShisetsuHiyouSouba from "@/data/seido/kaigo-shisetsu-hiyou-souba.json";
import kaigoHoken from "@/data/seido/kaigo-hoken.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kaigoShisetsuHiyouSoubaDataset = kaigoShisetsuHiyouSouba as unknown as SeidoDataset;
export const kaigoHokenDataset = kaigoHoken as unknown as SeidoDataset;

const D = kaigoShisetsuHiyouSouba.data;
const H_BEFORE = D.hojokyufu.beforeAug2026;
const H_AFTER = kaigoHoken.data.hojokyufu.fromAug2026;

// ---------------------------------------------------------------- 基準日による切替日の導出

/**
 * 食費・居住費の負担限度額が変わる施行日。data/seido の amendments から導出する
 * （コードに "2026-08-01" を直書きしない）。該当するamendmentが見つからない場合のみ
 * フォールバックとして "2026-08-01" を使う。
 */
function deriveSwitchDate(): string {
  const amendment = kaigoShisetsuHiyouSouba.amendments.find(
    (a) =>
      a.sourceId === "mhlw-kaigokensaku" &&
      a.status === "scheduled" &&
      a.summary.includes("食費の基準費用額"),
  );
  return amendment?.effectiveFrom ?? "2026-08-01";
}

export const AUG_2026_SWITCH_DATE = deriveSwitchDate();

export type Period = "beforeAug2026" | "fromAug2026";

export function resolvePeriod(today: string): Period {
  return today >= AUG_2026_SWITCH_DATE ? "fromAug2026" : "beforeAug2026";
}

// ---------------------------------------------------------------- 施設タイプ

export type ShisetsuKey = "tokuyo" | "roken" | "iryoin" | "tokutei-shisetsu";

export const SHISETSU_KEYS: ShisetsuKey[] = ["tokuyo", "roken", "iryoin", "tokutei-shisetsu"];

export interface ShisetsuTypeInfo {
  key: string;
  label: string;
  serviceName: string;
  lawRef: string;
  definition: string;
  character: string;
  note?: string;
}

/** data.shisetsuTypes.types をそのまま公開（散文への直書きを避けるため） */
export const SHISETSU_TYPES: ShisetsuTypeInfo[] = D.shisetsuTypes.types;

export function shisetsuTypeInfo(key: ShisetsuKey): ShisetsuTypeInfo | undefined {
  return SHISETSU_TYPES.find((t) => t.key === key);
}

function isShisetsuKey(value: string): value is ShisetsuKey {
  return (SHISETSU_KEYS as string[]).includes(value);
}

/** tokuyo は単独の部屋タイプ表、roken/iryoin は kyojuhiRoken を共有する */
function roomGroupOf(key: ShisetsuKey): "tokuyo" | "roken" | null {
  if (key === "tokuyo") return "tokuyo";
  if (key === "roken" || key === "iryoin") return "roken";
  return null;
}

// ---------------------------------------------------------------- 部屋タイプ

export const ROOM_TYPES_TOKUYO = ["ユニット型個室", "ユニット型個室的多床室", "従来型個室", "多床室"];
export const ROOM_TYPES_ROKEN = [
  "ユニット型個室",
  "ユニット型個室的多床室",
  "従来型個室",
  "多床室（室料を徴収する場合）",
  "多床室（室料を徴収しない場合）",
];

export function roomOptionsFor(key: ShisetsuKey): string[] {
  const group = roomGroupOf(key);
  if (group === "tokuyo") return ROOM_TYPES_TOKUYO;
  if (group === "roken") return ROOM_TYPES_ROKEN;
  return [];
}

/**
 * 部屋タイプ共通ラベル → kaigo-hoken.json の fromAug2026.kyojuhi[] の type 文字列。
 * ユニット型個室・ユニット型個室的多床室は特養・老健・医療院で共通のため変換不要。
 */
function afterAugTypeLabel(group: "tokuyo" | "roken", roomType: string): string {
  if (roomType === "ユニット型個室" || roomType === "ユニット型個室的多床室") return roomType;
  if (roomType === "従来型個室") {
    return group === "tokuyo" ? "従来型個室（特養等）" : "従来型個室（老健・医療院等）";
  }
  if (roomType === "多床室") return "多床室（特養等）";
  if (roomType === "多床室（室料を徴収する場合）") return "多床室（老健・医療院／室料を徴収する場合）";
  if (roomType === "多床室（室料を徴収しない場合）") {
    return "多床室（老健・医療院等／室料を徴収しない場合）";
  }
  return roomType;
}

interface CostRow {
  type: string;
  kijunHiyou: number;
  stage1: number;
  stage2: number;
  stage3a: number;
  stage3b: number;
}

function roomRow(group: "tokuyo" | "roken", roomType: string, period: Period): CostRow | undefined {
  if (period === "beforeAug2026") {
    const rooms = group === "tokuyo" ? H_BEFORE.kyojuhiTokuyo.rooms : H_BEFORE.kyojuhiRoken.rooms;
    return rooms.find((r) => r.type === roomType);
  }
  const label = afterAugTypeLabel(group, roomType);
  return H_AFTER.kyojuhi.find((r) => r.type === label);
}

function shokuhiRow(period: Period): {
  kijunHiyou: number;
  stage1: number;
  stage2: number;
  stage3a: number;
  stage3b: number;
  shortStay: { stage1: number; stage2: number; stage3a: number; stage3b: number };
} {
  return period === "beforeAug2026" ? H_BEFORE.shokuhi : H_AFTER.shokuhi;
}

// ---------------------------------------------------------------- 段階ごとの金額

export type Stage = "stage1" | "stage2" | "stage3a" | "stage3b" | "stage4";
export const STAGE_ORDER: Stage[] = ["stage1", "stage2", "stage3a", "stage3b", "stage4"];

const STAGE_LABEL_SOURCE = new Map(
  D.hojokyufu.userStages.stages.map((s) => [s.key, s.label] as const),
);

export function stageLabel(stage: Stage): string {
  return STAGE_LABEL_SOURCE.get(stage) ?? "第4段階";
}

interface StagedAmounts {
  kijunHiyou: number;
  stage1: number;
  stage2: number;
  stage3a: number;
  stage3b: number;
}

/** 第4段階は補足給付の対象外＝基準費用額（kijunHiyou）を全額負担する */
function stageAmount(row: StagedAmounts, stage: Stage): number {
  if (stage === "stage4") return row.kijunHiyou;
  return row[stage];
}

export interface StageLine {
  stageKey: Stage;
  stageLabel: string;
  shokuhiPerDay: number;
  kyojuhiPerDay: number;
  totalPerDay: number;
  monthlyTotal30Days: number;
}

// ---------------------------------------------------------------- 入力・結果

export interface HayamiInput {
  shisetsuKey?: string;
  roomType?: string;
  isShortStay?: boolean;
  today: string;
}

export interface AdmissionRequirement {
  requiredLevelLabel: string;
  requiredLevelValue: string;
  requiredLevelMin: number;
  tokureiNyushoLabel: string;
  tokureiNyushoValue: string;
}

export interface MinkanInfo {
  costNote: string;
  hojokyufuNotApplicable: boolean;
  publicInfoSourceText: string;
}

export type HayamiResult =
  | { ok: false; error: string }
  | {
      ok: true;
      shisetsuKey: ShisetsuKey;
      shisetsu: ShisetsuTypeInfo;
      hasCostData: boolean;
      period: Period;
      periodLabel: string;
      roomOptions: string[];
      selectedRoomType: string | null;
      isShortStay: boolean;
      lines: StageLine[];
      admissionRequirement?: AdmissionRequirement;
      minkan?: MinkanInfo;
      monthlyExamples?: { multiBed: string; unit: string };
    };

export function calcKaigoShisetsuHiyou(input: HayamiInput): HayamiResult {
  const rawKey = input.shisetsuKey ?? "tokuyo";
  if (!isShisetsuKey(rawKey)) {
    return { ok: false, error: "施設タイプの指定が正しくありません。" };
  }
  const shisetsuKey = rawKey;
  const shisetsu = shisetsuTypeInfo(shisetsuKey);
  if (!shisetsu) {
    return { ok: false, error: "施設タイプのデータが見つかりません。" };
  }

  const period = resolvePeriod(input.today);
  const periodLabel =
    period === "beforeAug2026" ? "〜2026年7月31日の基準" : "2026年8月1日〜の基準";
  const isShortStay = input.isShortStay ?? false;

  const admissionRequirement: AdmissionRequirement | undefined =
    shisetsuKey === "tokuyo"
      ? {
          requiredLevelLabel: D.tokuyoAdmissionRequirement.requiredLevel.label,
          requiredLevelValue: D.tokuyoAdmissionRequirement.requiredLevel.value,
          requiredLevelMin: D.tokuyoAdmissionRequirement.requiredLevelMin.value,
          tokureiNyushoLabel: D.tokuyoAdmissionRequirement.tokureiNyusho.label,
          tokureiNyushoValue: D.tokuyoAdmissionRequirement.tokureiNyusho.value,
        }
      : undefined;

  const group = roomGroupOf(shisetsuKey);

  if (group === null) {
    // tokutei-shisetsu（有料老人ホーム等）: 公的な費用データが存在しない
    const minkan: MinkanInfo = {
      costNote: D.minkanShisetsu.cost.note,
      hojokyufuNotApplicable: D.minkanShisetsu.hojokyufuNotApplicable.value === false,
      publicInfoSourceText: D.minkanShisetsu.publicInfoSource.value,
    };
    return {
      ok: true,
      shisetsuKey,
      shisetsu,
      hasCostData: false,
      period,
      periodLabel,
      roomOptions: [],
      selectedRoomType: null,
      isShortStay,
      lines: [],
      admissionRequirement,
      minkan,
    };
  }

  const options = roomOptionsFor(shisetsuKey);
  const selectedRoomType = options.includes(input.roomType ?? "") ? (input.roomType as string) : options[0];

  const room = roomRow(group, selectedRoomType, period);
  const shokuhi = shokuhiRow(period);

  const lines: StageLine[] = STAGE_ORDER.map((stageKey) => {
    const shokuhiPerDay =
      isShortStay && stageKey !== "stage4"
        ? shokuhi.shortStay[stageKey]
        : stageAmount(shokuhi, stageKey);
    const kyojuhiPerDay = room ? stageAmount(room, stageKey) : 0;
    const totalPerDay = shokuhiPerDay + kyojuhiPerDay;
    return {
      stageKey,
      stageLabel: stageLabel(stageKey),
      shokuhiPerDay,
      kyojuhiPerDay,
      totalPerDay,
      monthlyTotal30Days: totalPerDay * 30,
    };
  });

  const monthlyExamples =
    shisetsuKey === "tokuyo"
      ? {
          multiBed: D.costComponents.monthlyExampleTokuyo.value,
          unit: D.costComponents.monthlyExampleUnit.value,
        }
      : undefined;

  return {
    ok: true,
    shisetsuKey,
    shisetsu,
    hasCostData: true,
    period,
    periodLabel,
    roomOptions: options,
    selectedRoomType,
    isShortStay,
    lines,
    admissionRequirement,
    monthlyExamples,
  };
}

// ---------------------------------------------------------------- 共通の説明文（散文への直書き回避）

export const COST_COMPONENTS_LIST: string[] = D.costComponents.list.value;
export const APPLICATION_REQUIRED_TEXT: string = D.hojokyufu.applicationRequired.value;
export const TOP_LEVEL_DISCLAIMER: string = kaigoShisetsuHiyouSouba.disclaimer;

export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
