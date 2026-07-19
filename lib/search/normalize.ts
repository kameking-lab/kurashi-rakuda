/**
 * 検索の正規化パイプライン（specs/ai/01-fuzzy-search-client.md §1）。
 * 照合の前に、クエリと被検索テキストの両辺へ同じ変換を適用して「かな・話し言葉・全半角」の揺れを吸収する。
 * 外部送信ゼロ・純関数（AI 不使用の1段目）。
 *
 * 手順:
 *   1. NFKC 正規化（全角英数→半角・半角カナ→全角）
 *   2. 小文字化
 *   3. カタカナ→ひらがな折りたたみ
 *   4. 長音符・ダッシュ・チルダ・中点・空白・記号の除去
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    // カタカナ（ァ〜ヶ）→ ひらがな
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    // 長音符・各種ダッシュ・チルダ（NFKC 後に残るもの含む）を除去
    .replace(/[ー‐-―−－〜～~]/g, "")
    // 記号・空白・中点・句読点など「文字でも数字でもないもの」を除去（かな・漢字・英数字だけ残す）
    .replace(/[^\p{L}\p{N}]/gu, "");
}
