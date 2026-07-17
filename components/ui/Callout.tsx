import type { ReactNode } from "react";
import { Rakku } from "@/components/mascot/Rakku";

/**
 * らっくのひとこと。補足・注意書きを柔らかく伝える（docs/09_マスコット.md）。
 * role="status" により、入力に応じて動的に現れるエラー・注意が
 * スクリーンリーダーに読み上げられる（初期表示分は読み上げられない）。
 */
export function Callout({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "caution";
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-card p-4 text-sm sm:text-base ${
        tone === "caution"
          ? "border border-caution/40 text-ink"
          : "bg-sand-soft text-ink"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        <Rakku size={26} />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
