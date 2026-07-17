/*
 * 名もなき家事 分担チェッカー（P2-T25）の計算ロジック（純関数）。
 * 仕様: specs/b-tools/p2-t25-namonaki-kaji-checker.md
 * NamonakiKajiChecker.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他ツールと同じ構成。ShokuhiMeyasu.calc.ts参考）。
 *
 * 項目リスト（CHORE_ITEMS）は制度データ・自治体データに依存しない自前のチェックリストで、
 * ハードコードで問題ない（BACKLOG.md P2-T25「依存データ: なし（自前リスト）」）。
 * 送信・保存は一切行わない。集計はすべてその場（クライアント内）で行う純関数。
 *
 * 参考情報として総務省統計局の家事関連時間の男女差データ（REFERENCE_STAT）を併記するが、
 * これは本ツールの診断結果（calcChoreSummary）とは完全に独立した「公的統計の紹介」であり、
 * 集計ロジックには一切使わない（意図的に分離している）。
 */
import kajiJikanStat from "@/data/tables/kaji-jikan-toukei-danjyosa.json";

export type ChoreCategoryKey = "kaji" | "kosodate" | "kaigo" | "sonota";

export const CHORE_CATEGORY_LABELS: Record<ChoreCategoryKey, string> = {
  kaji: "家事全般",
  kosodate: "子育て",
  kaigo: "介護",
  sonota: "その他",
};

export const CHORE_CATEGORY_ORDER: ChoreCategoryKey[] = ["kaji", "kosodate", "kaigo", "sonota"];

export interface ChoreItem {
  id: string;
  category: ChoreCategoryKey;
  label: string;
}

/**
 * 「名もなき家事」の項目リスト（自前作成、4カテゴリ・合計30項目）。
 * 出典を持たない自前リストのため、項目文言そのものへの出典表示はしない
 * （出典が必要な参考統計は REFERENCE_STAT を参照。集計ロジックとは独立）。
 */
export const CHORE_ITEMS: ChoreItem[] = [
  // 家事全般（12項目）
  { id: "kaji-01", category: "kaji", label: "ゴミの分別ルールを把握し、収集日に合わせて出す" },
  {
    id: "kaji-02",
    category: "kaji",
    label: "トイレットペーパー・洗剤など日用品の在庫を把握し、切れる前に買い足す",
  },
  { id: "kaji-03", category: "kaji", label: "冷蔵庫の中身と賞味期限を把握し、使い切る算段をする" },
  { id: "kaji-04", category: "kaji", label: "献立を考える" },
  { id: "kaji-05", category: "kaji", label: "食料品の買い出しリスト（何がどれだけ必要か）を作る" },
  {
    id: "kaji-06",
    category: "kaji",
    label: "天気予報に合わせて洗濯物を干すか乾燥機にかけるか判断する",
  },
  { id: "kaji-07", category: "kaji", label: "衣替えの計画を立てて実行する" },
  { id: "kaji-08", category: "kaji", label: "郵便物・書類に目を通し、必要な手続きを判断する" },
  { id: "kaji-09", category: "kaji", label: "公共料金や各種請求書の支払い期限を把握し、支払う" },
  { id: "kaji-10", category: "kaji", label: "電球・消耗品など細かい交換時期を把握し、買い替える" },
  { id: "kaji-11", category: "kaji", label: "来客の予定に合わせて部屋を片付ける" },
  {
    id: "kaji-12",
    category: "kaji",
    label: "季節家電（扇風機・暖房器具など）の入れ替えを判断し実行する",
  },
  // 子育て（8項目）
  { id: "kosodate-01", category: "kosodate", label: "子どもの体調を見て保育園・学校に連絡する" },
  {
    id: "kosodate-02",
    category: "kosodate",
    label: "保育園・学校からのお便り・プリントを確認し、必要な準備をする",
  },
  { id: "kosodate-03", category: "kosodate", label: "持ち物・提出物の準備状況を把握し揃える" },
  { id: "kosodate-04", category: "kosodate", label: "予防接種や健診のスケジュールを管理する" },
  {
    id: "kosodate-05",
    category: "kosodate",
    label: "成長に合わせて服・靴のサイズを把握し、買い替える",
  },
  { id: "kosodate-06", category: "kosodate", label: "習い事の送迎スケジュールを調整する" },
  { id: "kosodate-07", category: "kosodate", label: "子ども同士の遊ぶ約束などの調整をする" },
  { id: "kosodate-08", category: "kosodate", label: "保護者会・行事の日程を把握し、予定を調整する" },
  // 介護（5項目）
  { id: "kaigo-01", category: "kaigo", label: "親族の通院に付き添う・スケジュールを調整する" },
  { id: "kaigo-02", category: "kaigo", label: "介護保険の手続き・書類を管理する" },
  { id: "kaigo-03", category: "kaigo", label: "服薬の管理・確認をする" },
  { id: "kaigo-04", category: "kaigo", label: "介護用品（おむつ等）の在庫を把握し買い足す" },
  { id: "kaigo-05", category: "kaigo", label: "ケアマネジャーなど関係者との連絡窓口になる" },
  // その他（5項目）
  { id: "sonota-01", category: "sonota", label: "家族の予定をカレンダーにまとめて共有する" },
  { id: "sonota-02", category: "sonota", label: "冠婚葬祭のマナーや持ち物を確認し準備する" },
  { id: "sonota-03", category: "sonota", label: "年賀状・季節の挨拶状の作成・管理をする" },
  { id: "sonota-04", category: "sonota", label: "家計簿をつけ、お金の流れを把握する" },
  {
    id: "sonota-05",
    category: "sonota",
    label: "家庭内のIT機器（Wi-Fi・スマホ設定など）のトラブル対応をする",
  },
];

export type ChoreStatus = "self" | "partner" | "both" | "none";

export const CHORE_STATUS_LABELS: Record<ChoreStatus, string> = {
  self: "自分がやっている",
  partner: "パートナーがやっている",
  both: "ふたりでやっている",
  none: "やっていない・対象外",
};

export const CHORE_STATUSES: ChoreStatus[] = ["self", "partner", "both", "none"];

/**
 * itemId → 選んだステータス。未回答（まだ選んでいない）の項目はキーを持たないか
 * 値が undefined になる（4択とは独立した第5の状態）。
 */
export type ChoreStatusMap = Record<string, ChoreStatus | undefined>;

function emptyCounts(): Record<ChoreStatus, number> {
  return { self: 0, partner: 0, both: 0, none: 0 };
}

export interface ChoreCategorySummary {
  category: ChoreCategoryKey;
  label: string;
  totalItems: number;
  answeredItems: number;
  counts: Record<ChoreStatus, number>;
}

export interface ChoreSummary {
  totalItems: number;
  answeredItems: number;
  unansweredItems: number;
  counts: Record<ChoreStatus, number>;
  /** 回答済み件数を分母にした割合（%、四捨五入）。回答が0件のときはすべて0 */
  percentages: Record<ChoreStatus, number>;
  /**
   * 「自分」と「パートナー」だけを比べた相対比率（%）。「ふたり」「やっていない・対象外」
   * 「未回答」は分母に含めない。self+partner が0件のときは比較材料がないため null。
   * partnerShare は 100 - selfShare で算出し、合計が必ず100になるようにしている。
   */
  selfPartnerBalance: { selfShare: number; partnerShare: number } | null;
  byCategory: ChoreCategorySummary[];
}

/**
 * チェック状態（itemId → ステータス）から集計結果を計算する純関数。
 * 項目リストは既定で CHORE_ITEMS を使うが、テスト・将来の拡張のために差し替え可能にしている。
 */
export function calcChoreSummary(
  statuses: ChoreStatusMap,
  items: ChoreItem[] = CHORE_ITEMS,
): ChoreSummary {
  const counts = emptyCounts();
  let answeredItems = 0;

  const byCategoryCounts: Record<
    ChoreCategoryKey,
    { total: number; answered: number; counts: Record<ChoreStatus, number> }
  > = {
    kaji: { total: 0, answered: 0, counts: emptyCounts() },
    kosodate: { total: 0, answered: 0, counts: emptyCounts() },
    kaigo: { total: 0, answered: 0, counts: emptyCounts() },
    sonota: { total: 0, answered: 0, counts: emptyCounts() },
  };

  for (const item of items) {
    const entry = byCategoryCounts[item.category];
    entry.total += 1;

    const status = statuses[item.id];
    if (status === undefined) continue;

    answeredItems += 1;
    counts[status] += 1;
    entry.answered += 1;
    entry.counts[status] += 1;
  }

  const totalItems = items.length;
  const unansweredItems = totalItems - answeredItems;

  const percentages = emptyCounts();
  if (answeredItems > 0) {
    for (const status of CHORE_STATUSES) {
      percentages[status] = Math.round((counts[status] / answeredItems) * 100);
    }
  }

  const selfPlusPartner = counts.self + counts.partner;
  let selfPartnerBalance: ChoreSummary["selfPartnerBalance"] = null;
  if (selfPlusPartner > 0) {
    const selfShare = Math.round((counts.self / selfPlusPartner) * 100);
    selfPartnerBalance = { selfShare, partnerShare: 100 - selfShare };
  }

  const byCategory: ChoreCategorySummary[] = CHORE_CATEGORY_ORDER.map((key) => {
    const c = byCategoryCounts[key];
    return {
      category: key,
      label: CHORE_CATEGORY_LABELS[key],
      totalItems: c.total,
      answeredItems: c.answered,
      counts: c.counts,
    };
  }).filter((c) => c.totalItems > 0);

  return {
    totalItems,
    answeredItems,
    unansweredItems,
    counts,
    percentages,
    selfPartnerBalance,
    byCategory,
  };
}

/**
 * 参考情報（総務省統計局の公的統計）。ツールの診断結果（calcChoreSummary）とは
 * 完全に独立した紹介情報として画面に併記する。
 * 出典: data/tables/kaji-jikan-toukei-danjyosa.json
 *（総務省統計局「令和3年社会生活基本調査」・統計Today No.190）
 */
export const REFERENCE_STAT = {
  sourceOrg: kajiJikanStat.org,
  sourceUrl: kajiJikanStat.source_url,
  chousaMeisho: kajiJikanStat.chousa_meisho,
  zenkokuDanseiFun: kajiJikanStat.zenkoku_10sai_ijo_danjyobetsu_kaji_kanren_jikan_fun.dansei_2021,
  zenkokuJoseiFun: kajiJikanStat.zenkoku_10sai_ijo_danjyobetsu_kaji_kanren_jikan_fun.josei_2021,
  muma6saiMiman: {
    ottoFun: kajiJikanStat.muma_kodomo_setai_fuufu_kaji_kanren_jikan_fun.otto_2021,
    tsumaFun: kajiJikanStat.muma_kodomo_setai_fuufu_kaji_kanren_jikan_fun.tsuma_2021,
  },
};
