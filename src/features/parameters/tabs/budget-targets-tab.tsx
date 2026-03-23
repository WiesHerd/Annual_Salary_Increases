import type { Cycle } from '../../../types/cycle';
import type { BudgetSettingsRow } from '../../../types/budget-settings';
import { InfoIconTip } from '../../../components/info-icon-tip';
import { BudgetSettingsTab, createNewBudgetRow } from './budget-settings-tab';
import { parametersPrimaryButtonClass } from '../parameters-tab-ui';

export interface BudgetTargetsTabProps {
  cycles: Cycle[];
  budgetSettings: BudgetSettingsRow[];
  setBudgetSettings: (v: BudgetSettingsRow[] | ((prev: BudgetSettingsRow[]) => BudgetSettingsRow[])) => void;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function BudgetTargetsTab({
  cycles,
  budgetSettings,
  setBudgetSettings,
}: BudgetTargetsTabProps) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5 w-full" role="region" aria-label="Budget targets and thresholds">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight truncate">Budget targets</h2>
            <InfoIconTip aria-label="About budget targets" variant="minimal">
              <p>
                Link each cycle to pool targets and optional <span className="font-medium text-slate-800">warning</span>{' '}
                / <span className="font-medium text-slate-800">hard-stop</span> thresholds (share of budget).
              </p>
              <p className="text-slate-500">
                Salary review prefers the budget row for the selected merit cycle; if none exists, it uses amounts on
                the cycle row.
              </p>
            </InfoIconTip>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBudgetSettings((prev) => [...prev, createNewBudgetRow(cycles)])}
          className={`${parametersPrimaryButtonClass} inline-flex items-center justify-center gap-1.5 self-start sm:self-center`}
        >
          <PlusIcon className="w-4 h-4 opacity-95" />
          Add row
        </button>
      </header>

      <BudgetSettingsTab
        budgetSettings={budgetSettings}
        setBudgetSettings={setBudgetSettings}
        cycles={cycles}
        embedded
        hideAddButton
        wideLayout
      />
    </div>
  );
}
