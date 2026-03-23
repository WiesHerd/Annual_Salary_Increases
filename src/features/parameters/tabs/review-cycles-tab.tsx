import type { Cycle } from '../../../types/cycle';
import { InfoIconTip } from '../../../components/info-icon-tip';
import { CycleSettingsTab, createNewCycleRow } from './cycle-settings-tab';
import { parametersPrimaryButtonClass } from '../parameters-tab-ui';

export interface ReviewCyclesTabProps {
  cycles: Cycle[];
  setCycles: (v: Cycle[] | ((prev: Cycle[]) => Cycle[])) => void;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function ReviewCyclesTab({
  cycles,
  setCycles,
}: ReviewCyclesTabProps) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5 w-full" role="region" aria-label="Review cycles">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight truncate">Review cycles</h2>
            <InfoIconTip aria-label="About review cycles" variant="minimal">
              <p>
                One row per merit cycle (e.g. FY 2026). <span className="font-medium text-slate-800">Effective date</span>{' '}
                drives as-of logic for policy runs.
              </p>
              <p className="text-slate-500">
                Salary review uses the budget row for the selected cycle when one exists; otherwise amounts on the
                cycle row apply. Configure budgets under <span className="font-medium text-slate-700">Budget targets</span>.
              </p>
            </InfoIconTip>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCycles((prev) => [...prev, createNewCycleRow()])}
          className={`${parametersPrimaryButtonClass} inline-flex items-center justify-center gap-1.5 self-start sm:self-center`}
        >
          <PlusIcon className="w-4 h-4 opacity-95" />
          Add cycle
        </button>
      </header>

      <CycleSettingsTab
        cycles={cycles}
        setCycles={setCycles}
        embedded
        hideAddButton
        wideLayout
      />
    </div>
  );
}
