/**
 * 介護サービス種類 かんたん逆引き（困りごと→サービス名） の計算ロジック。
 * specs/b-tools/p2-t40-kaigo-service-gyaku-hiki.md 参照。
 *
 * ★このファイルが正直に扱っている「データの限界」★（仕様書 §データ表・出典 を必ず参照）
 *   data/seido/kaigo-hoken.json は futanWariai・kubunShikyuGendo・tanka・kougakuKaigoServiceHi・
 *   hojokyufu・yokaigoNintei・gassan という「費用計算」系のキー構成であり、
 *   「訪問介護」「通所介護」等のサービス種類名を体系立てて一覧化したカタログを持たない
 *   （2026-07-18 時点で tanka.serviceTypeRule・kubunShikyuGendo.description 等を確認したが、
 *   個別サービス名の定義や概要は含まれていない）。
 *
 *   そのため本ファイルの SERVICE_CATALOG（サービス名・分類・概要）と WORRIES（困りごと→
 *   サービスの対応表）は、data/seido/kaigo-hoken.json からの引用ではなく、
 *   介護保険法（平成九年法律第百二十三号）第8条・第8条の2・第45条が定める
 *   サービス類型の一般的な整理である。e-Gov法令検索（法令API `?response_format=xml`）で
 *   第8条第2項〜第13項・第24項・第26項〜第29項の条文を機械照合済み（2026-07-18）。
 *   住宅改修（第45条）は項目名の存在を確認したが、具体的な支給限度額等の数値は
 *   本セッションでは条文全文を取得できず未照合のため、金額を書かず「限度額がある」という
 *   定性的な説明にとどめている（捏造回避）。
 *
 *   data/seido/kaigo-hoken.json から実際に引用しているのは、
 *   ①要介護度の区分そのもの（yokaigoNintei.levels）と
 *   ②区分支給限度基準額（kubunShikyuGendo.levels）の2点のみで、
 *   「サービス名の一覧」としてではなく「サービスを使うには認定区分が必要」という
 *   参考情報として併記している。
 */

import kaigoHoken from "@/data/seido/kaigo-hoken.json";
import { type SeidoDataset } from "@/lib/tools/seido";

export const kaigoHokenDataset = kaigoHoken as unknown as SeidoDataset;

// ---------------------------------------------------------------- サービスの分類

export type ServiceCategory =
  | "houmon" // 訪問系
  | "tsusho" // 通所系
  | "tanki" // 短期入所系
  | "fukushi" // 福祉用具・住宅改修系
  | "tokutei" // 特定施設
  | "keikaku" // 居宅介護支援（ケアマネジメント）
  | "shisetsu"; // 施設サービス

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  houmon: "訪問系サービス",
  tsusho: "通所系サービス",
  tanki: "短期入所系サービス",
  fukushi: "福祉用具・住宅改修",
  tokutei: "特定施設",
  keikaku: "ケアプラン作成",
  shisetsu: "施設サービス（長期入所）",
};

export const SERVICE_CATEGORY_ORDER: ServiceCategory[] = [
  "houmon",
  "tsusho",
  "tanki",
  "fukushi",
  "tokutei",
  "keikaku",
  "shisetsu",
];

export interface ServiceDef {
  key: string;
  name: string;
  category: ServiceCategory;
  overview: string;
  /** 介護保険法上の根拠条項（一般的な制度分類の出典。kaigo-hoken.jsonの引用ではない） */
  legalBasis: string;
}

/**
 * サービス種類のカタログ。介護保険法第8条・第8条の2・第45条が定める類型の一般的な整理。
 * ★data/seido/kaigo-hoken.json の数値データではない★（ファイル冒頭のコメント参照）
 */
export const SERVICE_CATALOG: ServiceDef[] = [
  {
    key: "houmon_kaigo",
    name: "訪問介護（ホームヘルプ）",
    category: "houmon",
    overview:
      "訪問介護員（ホームヘルパー）が自宅を訪問し、入浴・排せつ・食事などの身体介護や、掃除・洗濯・調理などの生活援助を行います。",
    legalBasis: "介護保険法第8条第2項",
  },
  {
    key: "houmon_nyuyoku",
    name: "訪問入浴介護",
    category: "houmon",
    overview:
      "浴槽を積んだ入浴専用の車などで自宅を訪問し、入浴の介助を行います。自宅の浴室での入浴が難しい方向けのサービスです。",
    legalBasis: "介護保険法第8条第3項",
  },
  {
    key: "houmon_kango",
    name: "訪問看護",
    category: "houmon",
    overview:
      "看護師などが自宅を訪問し、療養上の世話（健康チェック、褥瘡の処置など）や、医師の指示に基づく診療の補助を行います。",
    legalBasis: "介護保険法第8条第4項",
  },
  {
    key: "houmon_rehabiri",
    name: "訪問リハビリテーション",
    category: "houmon",
    overview:
      "理学療法士・作業療法士などが自宅を訪問し、心身の機能の維持・回復を目的としたリハビリを行います。",
    legalBasis: "介護保険法第8条第5項",
  },
  {
    key: "kyotaku_ryouyou_kanri",
    name: "居宅療養管理指導",
    category: "houmon",
    overview:
      "医師・歯科医師・薬剤師・管理栄養士などが自宅を訪問し、療養上の管理や指導（薬の飲み方、栄養面の助言など）を行います。",
    legalBasis: "介護保険法第8条第6項",
  },
  {
    key: "tsusho_kaigo",
    name: "通所介護（デイサービス）",
    category: "tsusho",
    overview:
      "日帰りで施設に通い、入浴・食事などの介護や、機能訓練・レクリエーションなどを日中受けます。家族の介護負担の軽減にもつながります。",
    legalBasis: "介護保険法第8条第7項",
  },
  {
    key: "tsusho_rehabiri",
    name: "通所リハビリテーション（デイケア）",
    category: "tsusho",
    overview:
      "介護老人保健施設や病院・診療所などに日帰りで通い、心身の機能の維持・回復のためのリハビリを受けます。",
    legalBasis: "介護保険法第8条第8項",
  },
  {
    key: "tanki_seikatsu",
    name: "短期入所生活介護（ショートステイ）",
    category: "tanki",
    overview:
      "施設に短期間（数日〜1週間程度など）入所し、日常生活上の介護や機能訓練を受けます。家族の休息（レスパイトケア）や冠婚葬祭・出張などの際にも利用されます。",
    legalBasis: "介護保険法第8条第9項",
  },
  {
    key: "tanki_ryouyou",
    name: "短期入所療養介護（医療型ショートステイ）",
    category: "tanki",
    overview:
      "介護老人保健施設・介護医療院・病院などに短期間入所し、医療的なケアを含む看護・介護・機能訓練を受けます。",
    legalBasis: "介護保険法第8条第10項",
  },
  {
    key: "tokutei_shisetsu",
    name: "特定施設入居者生活介護",
    category: "tokutei",
    overview:
      "都道府県などの指定を受けた有料老人ホームや軽費老人ホームなど（「特定施設」）に入居し、その施設の計画に基づく介護を受けます。",
    legalBasis: "介護保険法第8条第11項",
  },
  {
    key: "fukushi_taiyo",
    name: "福祉用具貸与",
    category: "fukushi",
    overview:
      "車いす・介護用ベッド・手すり・歩行器など、心身の状況に応じた福祉用具をレンタルできます。",
    legalBasis: "介護保険法第8条第12項",
  },
  {
    key: "fukushi_hanbai",
    name: "特定福祉用具販売",
    category: "fukushi",
    overview:
      "入浴用いす・腰掛便座・ポータブルトイレなど、レンタルになじまない性質の福祉用具を購入できます（購入費の一部が支給されます）。",
    legalBasis: "介護保険法第8条第13項",
  },
  {
    key: "juutaku_kaishuu",
    name: "住宅改修（介護保険の住宅改修費支給）",
    category: "fukushi",
    overview:
      "手すりの取付け・段差の解消・床材の変更・扉の取替え・便器の取替えなど、対象となる工事を行った場合に、費用の一部が支給されます。支給には限度額があり、原則として1人につき1回（またはそれに準じる回数）とされています。",
    legalBasis: "介護保険法第45条ほか（居宅介護住宅改修費）",
  },
  {
    key: "keikaku_kyotaku",
    name: "居宅介護支援（ケアマネジメント）",
    category: "keikaku",
    overview:
      "ケアマネジャー（介護支援専門員）が心身の状況やご本人・ご家族の希望を踏まえてケアプラン（居宅サービス計画）を作成し、サービス事業者との連絡調整を行います。利用者の自己負担はありません。",
    legalBasis: "介護保険法第8条第24項",
  },
  {
    key: "shisetsu_tokuyou",
    name: "介護老人福祉施設（特別養護老人ホーム・特養）",
    category: "shisetsu",
    overview:
      "原則として要介護3以上の方が対象の施設です。入所定員30人以上の施設で、日常生活上の世話や機能訓練などを長期的に受けます。",
    legalBasis: "介護保険法第8条第27項",
  },
  {
    key: "shisetsu_roken",
    name: "介護老人保健施設（老健）",
    category: "shisetsu",
    overview:
      "病状が安定期にある方が、在宅復帰を目指してリハビリなどを中心とした医学的管理の下でケアを受ける施設です。",
    legalBasis: "介護保険法第8条第28項",
  },
  {
    key: "shisetsu_iryouin",
    name: "介護医療院",
    category: "shisetsu",
    overview:
      "長期にわたる医療的なケアと日常生活上の世話をあわせて必要とする方のための施設です。",
    legalBasis: "介護保険法第8条第29項",
  },
];

export const SERVICE_MAP: Map<string, ServiceDef> = new Map(
  SERVICE_CATALOG.map((s) => [s.key, s]),
);

// ---------------------------------------------------------------- 困りごと

export interface WorryDef {
  id: string;
  label: string;
  /** 該当するサービスのkey。SERVICE_CATALOGに存在する優先順（画面表示順）で並べる */
  serviceKeys: string[];
}

export const WORRIES: WorryDef[] = [
  {
    id: "nyuyoku",
    label: "一人で入浴するのが不安",
    serviceKeys: ["houmon_kaigo", "houmon_nyuyoku", "tsusho_kaigo"],
  },
  {
    id: "minaoshi_hitori",
    label: "日中一人にするのが心配（見守り・気分転換をしたい）",
    serviceKeys: ["tsusho_kaigo", "tsusho_rehabiri", "keikaku_kyotaku"],
  },
  {
    id: "azukari_tanki",
    label: "少しの間だけ（数日〜1週間程度）預けたい",
    serviceKeys: ["tanki_seikatsu", "tanki_ryouyou"],
  },
  {
    id: "jitaku_kaishuu",
    label: "自宅を暮らしやすく改修したい（手すり・段差解消など）",
    serviceKeys: ["juutaku_kaishuu", "fukushi_taiyo"],
  },
  {
    id: "kaji_shien",
    label: "食事の準備や掃除・洗濯などの家事が難しくなってきた",
    serviceKeys: ["houmon_kaigo"],
  },
  {
    id: "fukushiyougu",
    label: "車いすや介護用ベッドなど福祉用具を使いたい",
    serviceKeys: ["fukushi_taiyo", "fukushi_hanbai"],
  },
  {
    id: "iryouteki_care",
    label: "自宅で医療的な処置や療養上の世話を受けたい（点滴・カテーテル管理など）",
    serviceKeys: ["houmon_kango", "kyotaku_ryouyou_kanri", "tanki_ryouyou"],
  },
  {
    id: "rehabiri",
    label: "リハビリ（機能訓練）を受けたい",
    serviceKeys: ["houmon_rehabiri", "tsusho_rehabiri", "tanki_ryouyou"],
  },
  {
    id: "nyuusho",
    label: "施設に入所して介護を受けたい（長期）",
    serviceKeys: ["shisetsu_tokuyou", "shisetsu_roken", "shisetsu_iryouin", "tokutei_shisetsu"],
  },
  {
    id: "sodan",
    label: "どのサービスを使えばいいか、まず相談したい",
    serviceKeys: ["keikaku_kyotaku"],
  },
];

export const WORRY_MAP: Map<string, WorryDef> = new Map(WORRIES.map((w) => [w.id, w]));

// ---------------------------------------------------------------- 逆引きロジック

export interface MatchedService extends ServiceDef {
  /** この結果に含まれる理由になった困りごとのラベル（表示順） */
  matchedWorryLabels: string[];
}

/**
 * 選択された困りごとのID配列から、該当するサービス一覧を返す。
 * - 未選択（空配列）は空配列を返す。
 * - 未知のID（WORRIESに存在しないid）は無視する（例外を投げない）。
 * - 同じサービスが複数の困りごとに該当する場合は1件にまとめ、
 *   matchedWorryLabels にすべての該当理由をまとめる（重複排除）。
 * - 表示順は SERVICE_CATALOG の定義順（＝サービス分類順）を維持する。
 */
export function getServicesForWorries(worryIds: string[]): MatchedService[] {
  const matchedKeys = new Map<string, Set<string>>();

  for (const worryId of worryIds) {
    const worry = WORRY_MAP.get(worryId);
    if (!worry) continue; // 未知のIDは無視
    for (const key of worry.serviceKeys) {
      if (!SERVICE_MAP.has(key)) continue; // カタログ不整合の防御
      const set = matchedKeys.get(key) ?? new Set<string>();
      set.add(worry.label);
      matchedKeys.set(key, set);
    }
  }

  const result: MatchedService[] = [];
  for (const service of SERVICE_CATALOG) {
    const labels = matchedKeys.get(service.key);
    if (!labels) continue;
    result.push({ ...service, matchedWorryLabels: Array.from(labels) });
  }
  return result;
}

/** カテゴリごとにグループ化する（表示用） */
export function groupServicesByCategory(
  services: MatchedService[],
): Record<ServiceCategory, MatchedService[]> {
  const map: Record<ServiceCategory, MatchedService[]> = {
    houmon: [],
    tsusho: [],
    tanki: [],
    fukushi: [],
    tokutei: [],
    keikaku: [],
    shisetsu: [],
  };
  for (const s of services) map[s.category].push(s);
  return map;
}

// ---------------------------------------------------------------- 参考情報（kaigo-hoken.json からの引用）

/**
 * 要介護度の区分（要支援1・2、要介護1〜5）。data/seido/kaigo-hoken.json の
 * yokaigoNintei.levels からそのまま引用する（数値の書き直しをしない）。
 * ★状態像による定義はしない（kaigo-hoken.json の noStateDefinition を継承）★
 */
export const YOKAIGO_LEVELS = kaigoHoken.data.yokaigoNintei.levels;
export const NO_STATE_DEFINITION = kaigoHoken.data.yokaigoNintei.noStateDefinition.value;

/**
 * 区分支給限度基準額（1か月あたり、要介護度別）。data/seido/kaigo-hoken.json の
 * kubunShikyuGendo.levels からそのまま引用する。
 * ★本ツールはこの限度額そのものを計算しない★（自己負担額の試算は「介護保険 自己負担シミュレーター」の役割）。
 * ここでは「使えるサービスの量は要介護度ごとに上限が決まっている」という参考情報としてのみ表示する。
 */
export const KUBUN_SHIKYU_GENDO_LEVELS = kaigoHoken.data.kubunShikyuGendo.levels;
