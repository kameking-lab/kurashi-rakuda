import type { DandoriStep } from "@/app/lib/articles/types";

/** 段取り型記事の手順リスト。「次に何をすればいいか」を番号と時期で示す */
export function DandoriSteps({ steps }: { steps: DandoriStep[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-paper dark:text-ink"
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <h3 className="font-bold">
              {step.title}
              {step.when && (
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  {step.when}
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm sm:text-base">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
