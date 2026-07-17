/**
 * らっくのポーズ定義（docs/09_マスコット.md §2 の10ポーズと1対1）。
 * public/mascot/ に置く画像のファイル名（拡張子除く）はこのスラッグに固定する。
 * 例: 正面立ち → public/mascot/front.png
 */
export const RAKKU_POSES = {
  front: "正面立ち（基本形）",
  bow: "お辞儀",
  guide: "案内",
  worried: "困り顔",
  happy: "喜び",
  carry: "荷物を運ぶ",
  sit: "すわり",
  calc: "電卓ぽんぽん",
  sleep: "おやすみ（深夜モード用）",
  cheer: "応援",
} as const;

export type RakkuPose = keyof typeof RAKKU_POSES;

/** 既存APIの expression とポーズの対応（後方互換のため維持） */
export const EXPRESSION_TO_POSE = {
  smile: "front",
  sorry: "worried",
} as const satisfies Record<string, RakkuPose>;
