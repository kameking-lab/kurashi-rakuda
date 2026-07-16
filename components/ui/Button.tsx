import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-brand text-paper hover:bg-brand-strong dark:text-ink dark:hover:bg-brand-strong",
  secondary:
    "border border-brand text-brand hover:bg-brand-soft bg-transparent",
  ghost: "text-brand hover:bg-brand-soft bg-transparent",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * ボタン。最小タップ領域 48px（UI十原則5）。
 * CTA 最適化（色の派手化・点滅・カウントダウン）は禁止（docs/00 §3.3）。
 */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-card px-5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
