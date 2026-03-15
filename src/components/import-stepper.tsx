/**
 * Step indicator for import wizard (1 — 2 — 3 — 4).
 * Enterprise pattern: clear progress through file → map → preview → result.
 */

export const IMPORT_STEP_LABELS = [
  'Select file',
  'Map columns',
  'Preview & validate',
  'Result',
] as const;

interface ImportStepperProps {
  step: 1 | 2 | 3 | 4;
  className?: string;
}

export function ImportStepper({ step, className = '' }: ImportStepperProps) {
  return (
    <nav aria-label="Import progress" className={className}>
      <ol className="flex items-center gap-2">
        {([1, 2, 3, 4] as const).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                s === step
                  ? 'bg-indigo-600 text-white'
                  : s < step
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
              aria-current={s === step ? 'step' : undefined}
            >
              {s}
            </span>
            <span className={`hidden text-sm sm:inline ${s === step ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
              {IMPORT_STEP_LABELS[s - 1]}
            </span>
            {s < 4 && <span className="h-px w-4 bg-slate-200" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
