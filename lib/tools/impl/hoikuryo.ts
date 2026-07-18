/**
 * 保育料計算 全国版 の計算ロジック（specs/s-tools/01-hoikuryo-keisan.md）。
 *
 * すべての制度数値は data/seido/hoikuryo/<pref>-<city>.json から読む。ここに数値を書かない。
 * （唯一の例外は「0」「1」のような算術・境界判定上の定数）
 *
 * ★このツールの3つの正常系★（仕様書 §1.1）
 *   ① 階層表から金額が出る（横浜・大阪〜R8/8・札幌・福岡・川崎・名古屋）
 *   ② 無償のため0円（東京23区6区、大阪 R8/9〜）
 *   ③ データ未収集・未確認 → 金額を出さず確認先を案内
 *
 * ★設計の柱★
 *   - A/B/C階層は所得割額0円で判別不能。isWelfare/isNonTaxable と課税状況を先に見る（§4 ステップ3）
 *   - 階層表がある前提にしない（練馬は1行、東京23区は全階層0円、大阪はR8/9〜 tiers 参照禁止）
 *   - 所得割額の前処理（6/8換算等）は自治体ごとに全く違い、構造化データが無い。
 *     推測で換算せず、bracketBasis.note の原文を提示して「前処理後の額」を入力させる（§9.1）
 */

import aichiNagoya from "@/data/seido/hoikuryo/aichi-nagoya.json";
import aichiToyohashi from "@/data/seido/hoikuryo/aichi-toyohashi.json";
import aichiOkazaki from "@/data/seido/hoikuryo/aichi-okazaki.json";
import aichiIchinomiya from "@/data/seido/hoikuryo/aichi-ichinomiya.json";
import aichiToyota from "@/data/seido/hoikuryo/aichi-toyota.json";
import chibaChiba from "@/data/seido/hoikuryo/chiba-chiba.json";
import chibaFunabashi from "@/data/seido/hoikuryo/chiba-funabashi.json";
import chibaKashiwa from "@/data/seido/hoikuryo/chiba-kashiwa.json";
import ehimeMatsuyama from "@/data/seido/hoikuryo/ehime-matsuyama.json";
import fukuokaFukuoka from "@/data/seido/hoikuryo/fukuoka-fukuoka.json";
import fukuokaKitakyushu from "@/data/seido/hoikuryo/fukuoka-kitakyushu.json";
import hiroshimaHiroshima from "@/data/seido/hoikuryo/hiroshima-hiroshima.json";
import hiroshimaKure from "@/data/seido/hoikuryo/hiroshima-kure.json";
import hokkaidoSapporo from "@/data/seido/hoikuryo/hokkaido-sapporo.json";
import hyogoKobe from "@/data/seido/hoikuryo/hyogo-kobe.json";
import hyogoHimeji from "@/data/seido/hoikuryo/hyogo-himeji.json";
import hyogoAmagasaki from "@/data/seido/hoikuryo/hyogo-amagasaki.json";
import hyogoNishinomiya from "@/data/seido/hoikuryo/hyogo-nishinomiya.json";
import naraNara from "@/data/seido/hoikuryo/nara-nara.json";
import wakayamaWakayama from "@/data/seido/hoikuryo/wakayama-wakayama.json";
import ishikawaKanazawa from "@/data/seido/hoikuryo/ishikawa-kanazawa.json";
import kagoshimaKagoshima from "@/data/seido/hoikuryo/kagoshima-kagoshima.json";
import kanagawaKawasaki from "@/data/seido/hoikuryo/kanagawa-kawasaki.json";
import kanagawaSagamihara from "@/data/seido/hoikuryo/kanagawa-sagamihara.json";
import gifuGifu from "@/data/seido/hoikuryo/gifu-gifu.json";
import kochiKochi from "@/data/seido/hoikuryo/kochi-kochi.json";
import miyazakiMiyazaki from "@/data/seido/hoikuryo/miyazaki-miyazaki.json";
import nagasakiNagasaki from "@/data/seido/hoikuryo/nagasaki-nagasaki.json";
import nagasakiSasebo from "@/data/seido/hoikuryo/nagasaki-sasebo.json";
import nahaOkinawa from "@/data/seido/hoikuryo/naha-okinawa.json";
import kanagawaYokohama from "@/data/seido/hoikuryo/kanagawa-yokohama.json";
import shigaOtsu from "@/data/seido/hoikuryo/shiga-otsu.json";
import kyotoKyoto from "@/data/seido/hoikuryo/kyoto-kyoto.json";
import kumamotoKumamoto from "@/data/seido/hoikuryo/kumamoto-kumamoto.json";
import miyagiSendai from "@/data/seido/hoikuryo/miyagi-sendai.json";
import iwateMorioka from "@/data/seido/hoikuryo/iwate-morioka.json";
import yamagataYamagata from "@/data/seido/hoikuryo/yamagata-yamagata.json";
import fukushimaKoriyama from "@/data/seido/hoikuryo/fukushima-koriyama.json";
import ibarakiMito from "@/data/seido/hoikuryo/ibaraki-mito.json";
import gunmaMaebashi from "@/data/seido/hoikuryo/gunma-maebashi.json";
import yamanashiKofu from "@/data/seido/hoikuryo/yamanashi-kofu.json";
import naganoNagano from "@/data/seido/hoikuryo/nagano-nagano.json";
import niigataNiigata from "@/data/seido/hoikuryo/niigata-niigata.json";
import oitaOita from "@/data/seido/hoikuryo/oita-oita.json";
import okayamaOkayama from "@/data/seido/hoikuryo/okayama-okayama.json";
import okayamaKurashiki from "@/data/seido/hoikuryo/okayama-kurashiki.json";
import osakaOsaka from "@/data/seido/hoikuryo/osaka-osaka.json";
import osakaSakai from "@/data/seido/hoikuryo/osaka-sakai.json";
import osakaToyonaka from "@/data/seido/hoikuryo/osaka-toyonaka.json";
import osakaSuita from "@/data/seido/hoikuryo/osaka-suita.json";
import osakaTakatsuki from "@/data/seido/hoikuryo/osaka-takatsuki.json";
import osakaHirakata from "@/data/seido/hoikuryo/osaka-hirakata.json";
import osakaHigashiosaka from "@/data/seido/hoikuryo/osaka-higashiosaka.json";
import saitamaSaitama from "@/data/seido/hoikuryo/saitama-saitama.json";
import saitamaKawaguchi from "@/data/seido/hoikuryo/saitama-kawaguchi.json";
import saitamaKawagoe from "@/data/seido/hoikuryo/saitama-kawagoe.json";
import shizuokaHamamatsu from "@/data/seido/hoikuryo/shizuoka-hamamatsu.json";
import shizuokaShizuoka from "@/data/seido/hoikuryo/shizuoka-shizuoka.json";
import toyamaToyama from "@/data/seido/hoikuryo/toyama-toyama.json";
import tokyoAdachi from "@/data/seido/hoikuryo/tokyo-adachi.json";
import tokyoArakawa from "@/data/seido/hoikuryo/tokyo-arakawa.json";
import tokyoBunkyo from "@/data/seido/hoikuryo/tokyo-bunkyo.json";
import tokyoChiyoda from "@/data/seido/hoikuryo/tokyo-chiyoda.json";
import tokyoChuo from "@/data/seido/hoikuryo/tokyo-chuo.json";
import tokyoEdogawa from "@/data/seido/hoikuryo/tokyo-edogawa.json";
import tokyoHachioji from "@/data/seido/hoikuryo/tokyo-hachioji.json";
import tokyoKoto from "@/data/seido/hoikuryo/tokyo-koto.json";
import tokyoKita from "@/data/seido/hoikuryo/tokyo-kita.json";
import tokyoMeguro from "@/data/seido/hoikuryo/tokyo-meguro.json";
import tokyoMinato from "@/data/seido/hoikuryo/tokyo-minato.json";
import tokyoNakano from "@/data/seido/hoikuryo/tokyo-nakano.json";
import tokyoNerima from "@/data/seido/hoikuryo/tokyo-nerima.json";
import tokyoOta from "@/data/seido/hoikuryo/tokyo-ota.json";
import tokyoSetagaya from "@/data/seido/hoikuryo/tokyo-setagaya.json";
import tokyoShibuya from "@/data/seido/hoikuryo/tokyo-shibuya.json";
import tokyoShinagawa from "@/data/seido/hoikuryo/tokyo-shinagawa.json";
import tokyoShinjuku from "@/data/seido/hoikuryo/tokyo-shinjuku.json";
import tokyoSumida from "@/data/seido/hoikuryo/tokyo-sumida.json";
import tokyoSuginami from "@/data/seido/hoikuryo/tokyo-suginami.json";
import tokyoTaito from "@/data/seido/hoikuryo/tokyo-taito.json";
import tokyoToshima from "@/data/seido/hoikuryo/tokyo-toshima.json";
import fukuokaKurume from "@/data/seido/hoikuryo/fukuoka-kurume.json";
import hiroshimaFukuyama from "@/data/seido/hoikuryo/hiroshima-fukuyama.json";
import kagawaTakamatsu from "@/data/seido/hoikuryo/kagawa-takamatsu.json";
import yamaguchiShimonoseki from "@/data/seido/hoikuryo/yamaguchi-shimonoseki.json";
import shimaneMatsue from "@/data/seido/hoikuryo/shimane-matsue.json";
import tottoriTottori from "@/data/seido/hoikuryo/tottori-tottori.json";
import type { SeidoAmendment, SeidoDataset, SeidoSource } from "@/lib/tools/seido";

// ---------------------------------------------------------------- 型

/**
 * 年齢区分キー。既定は under3(0〜2歳児クラス)/age3plus(3〜5歳児クラス)の2区分。
 * age2(2歳児クラス) は、2歳児クラスのみ別扱いにする自治体（例: 青森市＝R8から2歳児クラス以上を
 * 独自無償化し0・1歳児クラスのみ課税）でのみ登場する。既存自治体の ageClasses に age2 は無く、
 * 従来どおり under3 が0〜2歳を一律に扱う（後方互換）。
 */
export type AgeKey = "under3" | "age2" | "age3plus";
export type CareNeed = "standard" | "short";

/**
 * 世帯の課税状況。★所得割額より先に聞く★（§4 ステップ3）
 * A/B/C階層はいずれも所得割額0円のため、金額では判別できない。
 */
export type TaxStatus = "welfare" | "nonTaxable" | "equalOnly" | "incomeTaxed";

export interface TierFees {
  standard?: number;
  short?: number;
  /**
   * 保育標準時間認定のバンド別月額（京都市など timeBands を定義した自治体のみ）。
   * キーは timeBands.bands[].key。standard には defaultBandKey の額が重複収録されている。
   */
  standardByBand?: Record<string, number>;
}

export interface TimeBand {
  key: string;
  label: string;
}

/**
 * 保育標準時間認定の保育料が「保育利用時間」でさらに分かれる自治体の時間区分（例: 京都市の6段階）。
 * 単一バンドの自治体はこのフィールド自体を持たない。整合性は scripts/verify-seido.mjs が機械検査する。
 */
export interface TimeBands {
  bands: TimeBand[];
  /** バンド未選択時に使うキー。過小表示を避けるため原則最長時間 */
  defaultBandKey: string;
  /** 時間区分の原文定義 */
  rule: string;
  sourceId?: string;
  note?: string;
}

export interface HoikuryoTier {
  /** 自治体表記の階層名（"Ａ階層" は全角、"第8(8A)" 等）。tier 名で機械分岐しない（§9.2-13） */
  tier: string;
  label?: string;
  /** 所得割額の下限（円）。この値を含む（以上） */
  incomeMin: number;
  /** 所得割額の上限（円）。この値を含まない（未満）。最上位は null */
  incomeMax: number | null;
  isNonTaxable?: boolean;
  isWelfare?: boolean;
  fees: { under3?: TierFees; age2?: TierFees; age3plus?: TierFees };
}

export interface HoikuryoValueNode {
  value?: unknown;
  unit?: string;
  label?: string;
  sourceId?: string;
  note?: string;
}

export interface HoikuryoMunicipality {
  id: string;
  name: string;
  municipalityCode: string;
  prefecture: string;
  municipalityType?: string;
  fiscalYear: number;
  asOf: string;
  sources: SeidoSource[];
  amendments?: SeidoAmendment[];
  disclaimer: string;
  scope: { includes: string[]; excludes: string[] };
  bracketBasis: {
    basis: string;
    householdScope?: string;
    taxYearRule: string;
    deductionsIgnored?: string[];
    note: string;
  };
  ageClasses?: { key: AgeKey; label: string; rule?: string }[];
  timeBands?: TimeBands;
  freeTuition?: {
    age3plusFree?: HoikuryoValueNode;
    /** 2歳児クラスが自治体独自に無償か（例: 青森市）。設定時は ageClasses に age2 を持ち under3 は0・1歳のみ */
    age2Free?: HoikuryoValueNode;
    under3NonTaxableFree?: HoikuryoValueNode;
    multiChildPolicy?: {
      countingRule?: HoikuryoValueNode;
      secondChild?: HoikuryoValueNode;
      thirdChildOnwards?: HoikuryoValueNode;
    };
    localExtension?: string;
  };
  tiers: HoikuryoTier[];
}

// ---------------------------------------------------------------- 自治体データ

/**
 * 収集済み自治体（2026-07-18時点で79件＝東京23区すべて＋政令指定都市20市すべて＋中核市38市）。
 * ★選択肢はこの配列からのみ生成する★ 未収集自治体の階層を創作しない（§7）。
 * 並び順は全国地方公共団体コード順（＝都道府県順・特別区は区番号順）。UIの選択肢の順序になる。
 * 中核市は人口順に収集している（queue/hoikuryo-backlog.md §1 P2-D01）。ソネット担当（中部・近畿）は
 * バッチ1=船橋市・川口市・八王子市・姫路市・鹿児島市、バッチ2=松山市・西宮市・東大阪市・大分市・倉敷市、
 * バッチ3=尼崎市・金沢市・豊田市・豊中市・富山市、バッチ4=吹田市・岐阜市・枚方市・岡崎市・一宮市、
 * バッチ5=豊橋市・高槻市・大津市・和歌山市・奈良市。残る東日本・西日本は他系統（wo-opus・wo-codex2）が担当。
 */
export const municipalities: HoikuryoMunicipality[] = [
  fukuokaKurume as unknown as HoikuryoMunicipality,
  hiroshimaFukuyama as unknown as HoikuryoMunicipality,
  kagawaTakamatsu as unknown as HoikuryoMunicipality,
  yamaguchiShimonoseki as unknown as HoikuryoMunicipality,
  shimaneMatsue as unknown as HoikuryoMunicipality,
  hiroshimaKure as unknown as HoikuryoMunicipality,
  nagasakiSasebo as unknown as HoikuryoMunicipality,
  tottoriTottori as unknown as HoikuryoMunicipality,
  kochiKochi,
  miyazakiMiyazaki,
  nagasakiNagasaki,
  nahaOkinawa,
  hokkaidoSapporo,
  miyagiSendai,
  yamagataYamagata,
  iwateMorioka,
  fukushimaKoriyama,
  ibarakiMito,
  gunmaMaebashi,
  saitamaSaitama,
  saitamaKawaguchi,
  saitamaKawagoe,
  chibaChiba,
  chibaFunabashi,
  chibaKashiwa,
  tokyoChiyoda,
  tokyoChuo,
  tokyoMinato,
  tokyoShinjuku,
  tokyoBunkyo,
  tokyoTaito,
  tokyoSumida,
  tokyoKoto,
  tokyoShinagawa,
  tokyoMeguro,
  tokyoOta,
  tokyoSetagaya,
  tokyoShibuya,
  tokyoNakano,
  tokyoSuginami,
  tokyoToshima,
  tokyoKita,
  tokyoArakawa,
  tokyoNerima,
  tokyoAdachi,
  tokyoEdogawa,
  tokyoHachioji,
  kanagawaYokohama,
  kanagawaKawasaki,
  kanagawaSagamihara,
  niigataNiigata,
  yamanashiKofu,
  naganoNagano,
  toyamaToyama,
  ishikawaKanazawa,
  gifuGifu,
  shizuokaShizuoka,
  shizuokaHamamatsu,
  aichiNagoya,
  aichiToyohashi,
  aichiOkazaki,
  aichiIchinomiya,
  aichiToyota,
  shigaOtsu,
  kyotoKyoto,
  osakaOsaka,
  osakaSakai,
  osakaToyonaka,
  osakaSuita,
  osakaTakatsuki,
  osakaHirakata,
  osakaHigashiosaka,
  hyogoKobe,
  hyogoHimeji,
  hyogoAmagasaki,
  hyogoNishinomiya,
  naraNara,
  wakayamaWakayama,
  okayamaOkayama,
  okayamaKurashiki,
  hiroshimaHiroshima,
  ehimeMatsuyama,
  fukuokaKitakyushu,
  fukuokaFukuoka,
  kumamotoKumamoto,
  oitaOita,
  kagoshimaKagoshima,
] as unknown as HoikuryoMunicipality[];

export function getMunicipality(id: string): HoikuryoMunicipality | undefined {
  return municipalities.find((m) => m.id === id);
}

/**
 * 自治体データを共通の制度データ層（lib/tools/seido.ts）の型に変換する。
 * SeidoNotice に渡して準拠年度・次回改定予定・免責をデータ駆動で表示させるため。
 */
export function toSeidoDataset(m: HoikuryoMunicipality): SeidoDataset {
  return {
    id: m.id,
    name: `${m.name}の保育料（認可保育所）`,
    fiscalYear: m.fiscalYear,
    asOf: m.asOf,
    sources: m.sources,
    amendments: m.amendments,
    disclaimer: m.disclaimer,
    data: m,
  };
}

// ---------------------------------------------------------------- 年度・日付

/** 年月（YYYY-MM）が属する日本の年度。4月始まり */
export function fiscalYearOf(month: string): number {
  const [y, mo] = month.split("-").map(Number);
  return mo >= 4 ? y : y - 1;
}

/**
 * データの年度が試算対象月の年度と違うか（§4 ステップ0）。
 * 名古屋市は fiscalYear:2025（令和8年度版が未公表）のため、令和8年度の試算では必ず true。
 */
export function isFiscalYearMismatch(m: HoikuryoMunicipality, month: string): boolean {
  return m.fiscalYear !== fiscalYearOf(month);
}

/** 施行日未定・確定版でない等、ユーザーに伝えるべき「未確定」の改正（§7） */
export function underReviewAmendments(m: HoikuryoMunicipality): SeidoAmendment[] {
  return (m.amendments ?? []).filter((a) => a.status === "under-review");
}

/**
 * 試算対象月の時点で「階層表を参照せず一律0円」になる改正を返す（§4 ステップ1）。
 *
 * ★大阪市★ amendments[0] は effectiveFrom:"2026-09-01"、impact に
 * 「ツールで令和8年9月以降の月を試算する場合は tiers を参照せず一律0円を返すこと」と明記。
 * 判定はこの impact の記述（一律0円）に依拠する。データ側にこの意味を持つ構造化フィールドが
 * 無いため、原文の指示を読む形をとっている（データが変わったらここも見直す）。
 */
export function fullFreeAmendment(
  m: HoikuryoMunicipality,
  month: string,
): SeidoAmendment | null {
  for (const a of m.amendments ?? []) {
    if (a.status !== "scheduled" || !a.effectiveFrom) continue;
    if (!(a.impact ?? "").includes("一律0円")) continue;
    // 対象月の初日が施行日以降なら適用
    if (`${month}-01` >= a.effectiveFrom) return a;
  }
  return null;
}

/** 対象月より後に控えている「一律0円」の改正（まだ効いていないが予告する） */
export function upcomingFullFreeAmendment(
  m: HoikuryoMunicipality,
  month: string,
): SeidoAmendment | null {
  for (const a of m.amendments ?? []) {
    if (a.status !== "scheduled" || !a.effectiveFrom) continue;
    if (!(a.impact ?? "").includes("一律0円")) continue;
    if (`${month}-01` < a.effectiveFrom) return a;
  }
  return null;
}

// ---------------------------------------------------------------- 階層の解決

/** A・B（生活保護・非課税）のフラグが立っていない階層 */
function generalTiers(m: HoikuryoMunicipality): HoikuryoTier[] {
  return m.tiers.filter((t) => !t.isWelfare && !t.isNonTaxable);
}

/**
 * 「均等割のみ課税（所得割額0円）」に対応する階層（§4 ステップ3）。
 *
 * ★incomeMax の表現が自治体間で不統一★（横浜=1／札幌=48600／川崎=1 …）なので、
 * 上限値では判別しない。A・B のフラグが立っていない階層のうち、
 * 所得割額0円を含む（incomeMin === 0）最初のものを採る。tiers は原典の階層順。
 *
 * これで札幌の例外（「所得割が非課税で均等割のみ課税の世帯はＣ階層」＝ C1 11,000円）も
 * 特別扱いなしに解決できる。世田谷のように該当階層が無い自治体では null を返す。
 */
export function resolveEqualOnlyTier(m: HoikuryoMunicipality): HoikuryoTier | null {
  return generalTiers(m).find((t) => t.incomeMin === 0) ?? null;
}

/**
 * 所得割額で分かれる階層の候補。
 * 「均等割のみ」専用の目印（0以上1未満＝所得割0円ちょうど）は除く。
 */
function incomeTierCandidates(m: HoikuryoMunicipality): HoikuryoTier[] {
  return generalTiers(m).filter((t) => !(t.incomeMin === 0 && t.incomeMax === 1));
}

/**
 * 所得割額の入力に意味があるか。
 * 候補が1つしかない自治体（練馬＝全階層1行／足立＝D階層の境界が未公表）では、
 * 所得割額を聞いても階層は動かない。→ 上級者モード（所得割額の直接入力）を開かない（§7）。
 */
export function isIncomeInputUseful(m: HoikuryoMunicipality): boolean {
  return incomeTierCandidates(m).length >= 2;
}

export type TierResolution =
  | { tier: HoikuryoTier; reason: null }
  | { tier: null; reason: "needIncome" | "noMatch" | "noTierForStatus" };

/**
 * 課税状況（と必要なら前処理後の所得割額）から階層を決める。
 * ★所得割額より先に課税状況を見る★（§4 ステップ3、§9.2-2）
 *
 * income は「前処理後」の市町村民税所得割額。前処理（6/8換算等）は自治体ごとに違い、
 * 構造化データが無いためツールでは行わない（§9.1、UI が bracketBasis.note を提示する）。
 */
export function resolveTier(
  m: HoikuryoMunicipality,
  taxStatus: TaxStatus,
  income: number | null,
): TierResolution {
  if (taxStatus === "welfare") {
    const t = m.tiers.find((x) => x.isWelfare === true);
    return t ? { tier: t, reason: null } : { tier: null, reason: "noTierForStatus" };
  }
  if (taxStatus === "nonTaxable") {
    const t = m.tiers.find((x) => x.isNonTaxable === true);
    return t ? { tier: t, reason: null } : { tier: null, reason: "noTierForStatus" };
  }
  if (taxStatus === "equalOnly") {
    const t = resolveEqualOnlyTier(m);
    return t ? { tier: t, reason: null } : { tier: null, reason: "noTierForStatus" };
  }

  // incomeTaxed
  const candidates = incomeTierCandidates(m);
  if (income === null) {
    // 階層が1つしかないなら所得割額を聞かなくても決まる（練馬・足立）
    if (candidates.length === 1) return { tier: candidates[0], reason: null };
    return { tier: null, reason: "needIncome" };
  }
  // 所得割が課税されている世帯の所得割額は1円以上。0円なら「均等割のみ」を選ぶべき
  if (income < 1) return { tier: null, reason: "noMatch" };

  const t = generalTiers(m).find(
    (x) => income >= x.incomeMin && (x.incomeMax === null || income < x.incomeMax),
  );
  return t ? { tier: t, reason: null } : { tier: null, reason: "noMatch" };
}

// ---------------------------------------------------------------- 金額

/**
 * 保育利用時間の選択が意味を持つか（timeBands を定義した自治体 × 保育標準時間認定のみ）。
 * 保育短時間認定は全自治体で1区分のためバンド選択を出さない。
 */
export function isTimeBandApplicable(m: HoikuryoMunicipality, need: CareNeed): boolean {
  return need === "standard" && !!m.timeBands;
}

/**
 * 使用するバンドキーを決める。
 * - timeBands の無い自治体・保育短時間認定 → null（バンドの概念なし）
 * - 指定があり bands に実在する → その値
 * - 未指定・不正値 → defaultBandKey（＝最長時間。過小表示を避ける安全側）
 */
export function resolveTimeBandKey(
  m: HoikuryoMunicipality,
  need: CareNeed,
  requested: string | null | undefined,
): string | null {
  if (!isTimeBandApplicable(m, need)) return null;
  const tb = m.timeBands!;
  if (requested && tb.bands.some((b) => b.key === requested)) return requested;
  return tb.defaultBandKey;
}

/** バンドキーからバンド定義（label 表示用）を引く */
export function timeBandOf(m: HoikuryoMunicipality, key: string | null): TimeBand | null {
  if (!key || !m.timeBands) return null;
  return m.timeBands.bands.find((b) => b.key === key) ?? null;
}

/**
 * 階層・年齢区分・保育必要量（＋保育利用時間バンド）から月額を取る。fees は optional（§9.2-11）。
 * standardByBand を持つ階層（京都市③〜㉒）では、保育標準時間認定の額をバンドで解決する。
 * standardByBand の無い階層・自治体は従来どおり standard/short を返す＝他自治体への影響なし。
 */
export function feeOf(
  tier: HoikuryoTier,
  age: AgeKey,
  need: CareNeed,
  timeBandKey?: string | null,
): number | null {
  if (need === "standard" && timeBandKey) {
    const byBand = tier.fees[age]?.standardByBand;
    if (byBand && byBand[timeBandKey] !== undefined) return byBand[timeBandKey];
  }
  return tier.fees[age]?.[need] ?? null;
}

/**
 * その年齢区分・保育必要量では全階層が0円か。
 * 全額無償の自治体（東京23区6区）は階層を特定できなくても0円と答えられる。
 * 「階層は分からないが金額は0円」を正しく切り分けるための判定（足立・世田谷）。
 */
export function isAllZero(m: HoikuryoMunicipality, age: AgeKey, need: CareNeed): boolean {
  const fees = m.tiers.map((t) => feeOf(t, age, need));
  return fees.length > 0 && fees.every((f) => f === 0);
}

/** 3歳以上児が無償か（§4 ステップ2）。ハードコードせず必ず値を読む */
export function isAge3plusFree(m: HoikuryoMunicipality): boolean {
  return m.freeTuition?.age3plusFree?.value === true;
}

/**
 * 2歳児クラスが自治体独自に無償か（例: 青森市はR8から2歳児クラス以上を無償化）。
 * age3plusFree と同じ流儀。設定していない既存自治体では常に false（＝under3が0〜2歳を一律に扱う）。
 */
export function isAge2Free(m: HoikuryoMunicipality): boolean {
  return m.freeTuition?.age2Free?.value === true;
}

// ---------------------------------------------------------------- 多子・ひとり親

export type MultiChildKind = "free" | "described" | "none";

export interface MultiChildInfo {
  kind: MultiChildKind;
  /** 「第2子以降0円」と明示されている自治体のみ true */
  isFree: boolean;
  /** 原典の記述（value が数値でない自治体は文章、川崎は 0.5 rate） */
  secondChild?: HoikuryoValueNode;
  countingRule?: HoikuryoValueNode;
}

/**
 * 第2子以降の扱い（§4 ステップ7）。
 * ★金額を自動計算しない★ 数え方も軽減方式も自治体ごとに違う（§2.2）。
 * secondChild.value の型が混在する（number 0／number 0.5＋unit:"rate"／長文 string）ため
 * typeof で分岐する（§9.2-12）。
 */
export function multiChildInfo(m: HoikuryoMunicipality, birthOrder: number): MultiChildInfo {
  const policy = m.freeTuition?.multiChildPolicy;
  if (birthOrder < 2 || !policy) return { kind: "none", isFree: false };

  const second = policy.secondChild;
  const isFree = typeof second?.value === "number" && second.value === 0;
  return {
    kind: isFree ? "free" : "described",
    isFree,
    secondChild: second,
    countingRule: policy.countingRule,
  };
}

// ---------------------------------------------------------------- 総合結果

export interface HoikuryoInput {
  municipalityId: string;
  /** 試算対象月（YYYY-MM） */
  month: string;
  age: AgeKey;
  need: CareNeed;
  taxStatus: TaxStatus;
  /** 前処理後の市町村民税所得割額（上級者モード）。未入力は null */
  income: number | null;
  /**
   * 保育利用時間バンドのキー（timeBands を定義した自治体 × 保育標準時間認定のみ意味を持つ）。
   * 未指定・不正値は defaultBandKey（最長時間）に解決される。
   */
  timeBand?: string | null;
  /** この子は上から何番目か */
  birthOrder: number;
  /** ひとり親世帯・在宅障害者等に該当するか */
  isSingleParentOrDisability: boolean;
}

export type FeeBasis =
  | "amendmentFullFree" // 施行日以降の全員無償化（大阪 R8/9〜）
  | "age3plusFree" // 3歳以上児の無償化
  | "age2Free" // 2歳児クラスの自治体独自無償化（青森市など）
  | "tier" // 階層表から取得
  | "allZeroFallback" // 階層は特定できないが全階層0円
  | "unknown"; // 金額を出さない

export interface HoikuryoResult {
  municipality: HoikuryoMunicipality;
  /** 月額（円）。null は「答えを出さない」（§7） */
  fee: number | null;
  basis: FeeBasis;
  tier: HoikuryoTier | null;
  /** 階層を特定できなかった理由 */
  tierIssue: TierResolution["reason"];
  /** 施行済みの全員無償化（大阪 R8/9〜） */
  fullFree: SeidoAmendment | null;
  /** これから来る全員無償化（予告） */
  upcomingFullFree: SeidoAmendment | null;
  /** データの年度が試算対象月の年度と違う（名古屋） */
  fiscalYearMismatch: boolean;
  underReview: SeidoAmendment[];
  multiChild: MultiChildInfo;
  /** 所得割額の直接入力を提供してよいか（練馬・足立は false） */
  incomeInputUseful: boolean;
  /** 金額の解決に使った保育利用時間バンド（timeBands の無い自治体・保育短時間は null） */
  timeBand: TimeBand | null;
}

/**
 * 保育料の試算。仕様書 §4 のステップ0〜7 の順序をそのまま実装している。
 * 金額を出せないときは fee=null を返す。最寄りの階層に丸めない（§7）。
 */
export function calc(input: HoikuryoInput): HoikuryoResult | null {
  const m = getMunicipality(input.municipalityId);
  if (!m) return null;

  const bandKey = resolveTimeBandKey(m, input.need, input.timeBand ?? null);
  const base = {
    municipality: m,
    fiscalYearMismatch: isFiscalYearMismatch(m, input.month),
    underReview: underReviewAmendments(m),
    multiChild: multiChildInfo(m, input.birthOrder),
    incomeInputUseful: isIncomeInputUseful(m),
    upcomingFullFree: upcomingFullFreeAmendment(m, input.month),
    timeBand: timeBandOf(m, bandKey),
  };

  // ステップ1: 施行日による分岐（大阪 R8/9〜は tiers を参照しない）
  const fullFree = fullFreeAmendment(m, input.month);
  if (fullFree) {
    return {
      ...base,
      fee: 0,
      basis: "amendmentFullFree",
      tier: null,
      tierIssue: null,
      fullFree,
    };
  }

  // ステップ2: 年齢区分による分岐
  if (input.age === "age3plus" && isAge3plusFree(m)) {
    return { ...base, fee: 0, basis: "age3plusFree", tier: null, tierIssue: null, fullFree: null };
  }
  // 2歳児クラスの自治体独自無償化（青森市など）。0・1歳児クラス（under3）は下の階層判定へ進む
  if (input.age === "age2" && isAge2Free(m)) {
    return { ...base, fee: 0, basis: "age2Free", tier: null, tierIssue: null, fullFree: null };
  }

  // ステップ3〜6: 課税状況 → 階層 → 金額
  const res = resolveTier(m, input.taxStatus, input.income);
  if (res.tier) {
    const fee = feeOf(res.tier, input.age, input.need, bandKey);
    if (fee !== null) {
      return { ...base, fee, basis: "tier", tier: res.tier, tierIssue: null, fullFree: null };
    }
    return { ...base, fee: null, basis: "unknown", tier: res.tier, tierIssue: null, fullFree: null };
  }

  // 階層は特定できないが、その区分は全階層0円 → 0円と答えてよい（東京23区）
  if (isAllZero(m, input.age, input.need)) {
    return {
      ...base,
      fee: 0,
      basis: "allZeroFallback",
      tier: null,
      tierIssue: res.reason,
      fullFree: null,
    };
  }

  return { ...base, fee: null, basis: "unknown", tier: null, tierIssue: res.reason, fullFree: null };
}
