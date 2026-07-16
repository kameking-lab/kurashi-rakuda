import type { ReactNode } from "react";

/** 汎用カード。広告枠に見える装飾（バッジ・影の強調）は付けない */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-paper p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
