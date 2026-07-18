/**
 * らっく — くらしのラクダのマスコット。
 *
 * 表示の優先順位（docs/09_マスコット.md §5 の受け入れフロー）:
 *   1. public/mascot/<pose>.png|webp が受け入れ済み（components/mascot/manifest.json に登録済み）
 *      → next/image で表示（Vercel が WebP/AVIF へ自動最適化）
 *   2. 未配置のポーズ → 下記の簡易SVGでフォールバック描画
 *      （SVGは smile / sorry の2表情のみ。他ポーズも表情いずれかに寄せて破綻しない）
 *
 * 社長が画像を public/mascot/ に置き `npm run mascot:manifest` を通せば、
 * このファイルを編集せずに全使用箇所が画像へ切り替わる。
 * manifest.json は手で編集しない（scripts/mascot-manifest.mjs が規約検査つきで生成）。
 */

import Image from "next/image";
import manifest from "./manifest.json";
import { EXPRESSION_TO_POSE, type RakkuPose } from "./poses";

const FILES: Partial<Record<RakkuPose, string>> = manifest.files;

const C = {
  body: "#C7AF88",
  hump: "#B29368",
  cream: "#F4EEE3",
  line: "#7A5F3E",
  green: "#2E5039",
  cheek: "#E8B4A0",
  eye: "#33302B",
} as const;

export type RakkuExpression = "smile" | "sorry";

export function Rakku({
  size = 48,
  expression = "smile",
  pose,
  label,
}: {
  size?: number;
  /** smile=基本形 / sorry=困り顔（404・検索0件用。docs/09 §1.6 により泣き顔・汗は描かない） */
  expression?: RakkuExpression;
  /** 10ポーズ（docs/09 §2）を直接指定する場合。省略時は expression から導出（smile→front / sorry→worried） */
  pose?: RakkuPose;
  /** 意味を持つ場合のみ指定。省略時は装飾扱い（aria-hidden） */
  label?: string;
}) {
  const resolvedPose: RakkuPose = pose ?? EXPRESSION_TO_POSE[expression];
  const file = FILES[resolvedPose];
  if (file) {
    return (
      <Image
        src={`/mascot/${file}`}
        width={size}
        height={size}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        priority={resolvedPose === "front" && size >= 200}
        sizes={`${size}px`}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* コブと風呂敷（生活の荷物を代わりに運ぶ） */}
      <ellipse cx="60" cy="34" rx="15" ry="11" fill={C.hump} stroke={C.line} strokeWidth="2.5" />
      <circle cx="60" cy="19" r="8" fill={C.green} stroke={C.line} strokeWidth="2" />
      <path d="M55 12 l-4 -5 M65 12 l4 -5" stroke={C.line} strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* 耳 */}
      <ellipse cx="31" cy="42" rx="6" ry="9" fill={C.body} stroke={C.line} strokeWidth="2.5" transform="rotate(-20 31 42)" />
      <ellipse cx="89" cy="42" rx="6" ry="9" fill={C.body} stroke={C.line} strokeWidth="2.5" transform="rotate(20 89 42)" />

      {/* 胴体（2頭身の下半分）と脚 */}
      <rect x="36" y="80" width="48" height="26" rx="13" fill={C.body} stroke={C.line} strokeWidth="2.5" />
      <ellipse cx="60" cy="94" rx="14" ry="9" fill={C.cream} />
      <path d="M44 106 v6 M56 106 v6 M64 106 v6 M76 106 v6" stroke={C.line} strokeWidth="4" strokeLinecap="round" />

      {/* 頭 */}
      <circle cx="60" cy="58" r="30" fill={C.body} stroke={C.line} strokeWidth="2.5" />
      {/* 口元 */}
      <ellipse cx="60" cy="69" rx="16" ry="12" fill={C.cream} />
      <circle cx="54.5" cy="67" r="1.6" fill={C.line} />
      <circle cx="65.5" cy="67" r="1.6" fill={C.line} />
      {expression === "smile" ? (
        <path d="M55 74 q5 4 10 0" stroke={C.line} strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M56 75 q4 -3 8 0" stroke={C.line} strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
      {/* 目（たれ目） */}
      {expression === "smile" ? (
        <>
          <circle cx="45" cy="54" r="3.4" fill={C.eye} />
          <circle cx="75" cy="54" r="3.4" fill={C.eye} />
          <path d="M40.5 49.5 q4 -2.5 8 -0.5 M71.5 49 q4 -2 8 0.5" stroke={C.line} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          {/* 困り顔: 目を閉じてやや下がり眉。落ち着いたトーンを保つ */}
          <path d="M41 55 q4 3 8 0 M71 55 q4 3 8 0" stroke={C.eye} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M40 47 q4 -1 8 1 M72 48 q4 -2 8 -1" stroke={C.line} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* 頬 */}
      <circle cx="36" cy="63" r="4.2" fill={C.cheek} />
      <circle cx="84" cy="63" r="4.2" fill={C.cheek} />

      {/* スカーフ */}
      <path d="M40 82 q20 10 40 0 l-2 8 q-18 8 -36 0 z" fill={C.green} stroke={C.line} strokeWidth="2" strokeLinejoin="round" />
      <path d="M64 89 l6 12 l8 -6" fill={C.green} stroke={C.line} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
