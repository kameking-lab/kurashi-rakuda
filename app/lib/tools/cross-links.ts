import { SISTER_SITE } from "@/app/lib/site";

/**
 * 姉妹サイト kurashi-keisan.jp への相互送客リンク（docs/02 棲み分け方針・docs/05 §6）。
 * 汎用・単発のお金計算は本サイトでは作らず、kurashi-keisan の既存ツールへ案内する。
 * URL は 2026-07-17 に sitemap 実査で確認済み。
 */
export interface CrossLink {
  label: string;
  url: string;
  /** なぜこのツールから案内するか（枠が広告に見えないよう文脈を必ず添える） */
  context: string;
}

const KK = SISTER_SITE.url;

export const CROSS_LINKS: Record<string, CrossLink[]> = {
  "fuyo-kabe": [
    {
      label: "年収から手取りを計算",
      url: `${KK}/tools/nenshu-tedori`,
      context: "壁を越えて働いた場合の手取り額の詳細計算",
    },
    {
      label: "ふるさと納税の上限額を計算",
      url: `${KK}/tools/furusato-nozei-jougen`,
      context: "年収が決まったら寄附上限の確認に",
    },
  ],
  "jitan-kyuyo": [
    {
      label: "年収から手取りを計算",
      url: `${KK}/tools/nenshu-tedori`,
      context: "時短前後の年収ベースの手取り比較に",
    },
  ],
  "sankyu-ikukyu-money": [
    {
      label: "年収から手取りを計算",
      url: `${KK}/tools/nenshu-tedori`,
      context: "復職後の年収から手取りを見積もる場合に",
    },
  ],
  hoikuryo: [
    {
      label: "ふるさと納税の上限額を計算",
      url: `${KK}/tools/furusato-nozei-jougen`,
      context: "ふるさと納税は多くの自治体で保育料の階層に影響しません（本ツールの解説参照）",
    },
  ],
};

export function getCrossLinks(slug: string): CrossLink[] {
  return CROSS_LINKS[slug] ?? [];
}
