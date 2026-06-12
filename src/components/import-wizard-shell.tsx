/**
 * Three-zone import wizard: stepper · scrollable body · pinned footer.
 */

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const IMPORT_WIZARD_TITLES = [
  'Select file',
  'Map columns',
  'Preview',
  'Done',
] as const;

interface ImportWizardShellProps {
  step: 1 | 2 | 3 | 4;
  description?: string;
  /** Renders on the title row (e.g. cycle picker on step 1). */
  headerTrailing?: ReactNode;
  footerLeft?: ReactNode;
  footerRight: ReactNode;
  children: ReactNode;
  layout?: 'modal' | 'page';
}

function WizardStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="import-wizard-steps" aria-label="Import progress">
      {IMPORT_WIZARD_TITLES.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3 | 4;
        const isActive = step === n;
        const isDone = step > n;
        return (
          <div key={label} className="import-wizard-step">
            {index > 0 && <span className="import-wizard-step-sep" aria-hidden />}
            <span
              className={cn(
                'import-wizard-step-dot',
                isDone && 'import-wizard-step-dot--done',
                isActive && 'import-wizard-step-dot--active',
                !isDone && !isActive && 'import-wizard-step-dot--pending',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              {isDone ? <Check className="size-3.5 stroke-[2.5]" aria-hidden /> : n}
            </span>
            <span
              className={cn(
                'import-wizard-step-label',
                isActive || isDone ? 'import-wizard-step-label--active' : 'import-wizard-step-label--inactive',
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ImportWizardShell({
  step,
  description,
  headerTrailing,
  footerLeft,
  footerRight,
  children,
  layout = 'page',
}: ImportWizardShellProps) {
  const isPage = layout === 'page';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isPage && <WizardStepper step={step} />}

      <header
        className={cn(
          'shrink-0 border-b border-border px-6 py-3.5',
          !isPage && 'pr-12',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
            {IMPORT_WIZARD_TITLES[step - 1]}
          </h2>
          {headerTrailing && <div className="shrink-0">{headerTrailing}</div>}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto py-4',
          isPage ? 'px-8' : 'px-6',
        )}
      >
        {children}
      </div>

      <footer
        className={cn(
          'flex shrink-0 items-center justify-between gap-4 border-t border-border px-6 py-3',
          'bg-muted/30',
        )}
      >
        <div className="flex min-h-9 items-center">{footerLeft}</div>
        <div className="flex items-center gap-2">{footerRight}</div>
      </footer>
    </div>
  );
}
