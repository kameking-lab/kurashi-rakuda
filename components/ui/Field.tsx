"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { useId } from "react";

/*
 * 入力部品。高さ48px（UI十原則5）・ラベル必須（アクセシビリティ）。
 * 入力値の送信は行わない前提（すべてクライアント内計算。docs/05 §1-4）。
 */

const fieldClass =
  "field-control min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink";

interface LabelledProps {
  label: string;
  hint?: string;
}

export function NumberField({
  label,
  hint,
  ...props
}: LabelledProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input id={id} type="number" inputMode="decimal" className={fieldClass} {...props} />
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function DateField({
  label,
  hint,
  ...props
}: LabelledProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input id={id} type="date" className={fieldClass} {...props} />
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function TimeField({
  label,
  hint,
  ...props
}: LabelledProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input id={id} type="time" className={fieldClass} {...props} />
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...props
}: LabelledProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <select id={id} className={fieldClass} {...props}>
        {children}
      </select>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
