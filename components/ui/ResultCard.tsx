import type { ReactNode } from "react";

/**
 * 計算結果の表示。サイト内で唯一の「強調色」使用箇所（UI十原則8）。
 * 数字は大きく、直下に根拠を添える前提で使う（UI十原則6）。
 */
export function ResultCard({
  label,
  value,
  unit,
  note,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="rounded-card bg-result-bg p-5 text-result-ink sm:p-6"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm opacity-90">{label}</p>
      <p className="mt-1">
        <span className="text-3xl font-bold tabular-nums sm:text-4xl">{value}</span>
        {unit && <span className="ml-1 text-lg">{unit}</span>}
      </p>
      {note && <p className="mt-2 text-sm opacity-90">{note}</p>}
      {children}
    </div>
  );
}
