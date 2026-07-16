import type { ReactNode } from "react";
import { Rakku } from "@/components/mascot/Rakku";

/**
 * らっくのひとこと。補足・注意書きを柔らかく伝える（docs/09_マスコット.md）。
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
