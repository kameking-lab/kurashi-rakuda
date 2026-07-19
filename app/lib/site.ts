/**
 * サイト共通の定数。公開準備（OGP・JSON-LD・sitemap）で参照する単一ソース。
 * - SITE_URL: 統合版を当面 kurashi-rakuda.vercel.app で公開・SEO育成する方針（2026-07-18 社長決裁）。
 *   canonical・sitemap・OGを実際にindexされるドメインへ一致させるため、暫定でこの値を使う。
 *   独自ドメイン（第一候補 kurashi-rakuda.jp・BACKLOG Q0-2）確定時にここ1箇所を書き換え、
 *   旧vercel.app URLからの301リダイレクトを設定する。
 * - SITE_EMAIL: お問い合わせ窓口。外部フォームサービス・環境変数は使わない方針のため
 *   定数で保持する（公開用アドレスへの変更は社長決裁）。
 */
export const SITE_NAME = "くらしのラクダ";

export const SITE_TAGLINE = "主婦・女性の毎日を楽にする無料ツール";

export const SITE_DESCRIPTION =
  "妊娠・出産から子育て、家事、お金、仕事、介護まで。女性の毎日の「調べもの・計算・段取り」を、広告に邪魔されず登録なしで解決する完全無料サイトです。";

export const SITE_URL = "https://kurashi-rakuda.vercel.app";

export const SITE_EMAIL = "kenshi.ycc@gmail.com";

/** 姉妹サイト（相互送客。docs/02 棲み分け方針・docs/05 §6） */
export const SISTER_SITE = {
  name: "くらしの計算",
  url: "https://kurashi-keisan.jp",
} as const;

/** 絶対URLを組み立てる（sitemap・JSON-LD・OGP用） */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * GSC（Google Search Console）の所有権確認コード（meta name="google-site-verification"）。
 * 環境変数 GSC_VERIFICATION 未設定時は undefined を返し、layout.tsx 側で meta 自体を出力しない
 * （社長がプロパティ作成・コード発行するまでは何も出さない受け口。docs/13 A-2/N-9）。
 */
export const GSC_VERIFICATION = process.env.GSC_VERIFICATION || undefined;
