import { useCallback, useMemo } from 'react';
import type { Cycle } from '../../../types/cycle';
import { InfoIconTip } from '../../../components/info-icon-tip';
import { CycleSettingsTab, createNewCycleRow } from './cycle-settings-tab';
import { parametersPrimaryButtonClass } from '../parameters-tab-ui';
import { useAppState } from '../../../hooks/use-app-state';
import { filterProvidersForCycle } from '../../../lib/cycle-match';
import { finalizeCycle, unlockCycle } from '../../../lib/cycle-finalize';
import { useToast } from '../../../components/ui/toast';
import { formatCurrency } from '../../../utils/format';

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

export function ReviewCyclesTab({ cycles, setCycles }: ReviewCyclesTabProps) {
  const { records } = useAppState();
  const { toast } = useToast();

  const providerCountByCycleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cycles) {
      map.set(c.id, filterProvidersForCycle(records, c.id, cycles).length);
    }
    return map;
  }, [cycles, records]);

  const handleFinalizeCycle = useCallback(
    (cycleId: string) => {
      const cycle = cycles.find((c) => c.id === cycleId);
      const label = cycle?.label ?? cycleId;
      const count = providerCountByCycleId.get(cycleId) ?? 0;
      if (count === 0) {
        toast({
          variant: 'error',
          title: 'Cannot finalize',
          description: `No providers are assigned to ${label}. Import data or assign a Cycle value first.`,
        });
        return;
      }
      const confirmed = window.confirm(
        `Finalize "${label}"?\n\nThis locks merit review for ${count} provider${count !== 1 ? 's' : ''} and saves a snapshot of approved increases. You can unlock later if needed.`
      );
      if (!confirmed) return;
      const { nextCycles, snapshot } = finalizeCycle(cycleId, cycles, records);
      setCycles(nextCycles);
      toast({
        variant: 'success',
        title: 'Cycle finalized',
        description: `${label}: ${snapshot.providerCount} providers, ${formatCurrency(snapshot.totalIncreaseDollars)} total increases saved.`,
      });
    },
    [cycles, records, providerCountByCycleId, setCycles, toast]
  );

  const handleUnlockCycle = useCallback(
    (cycleId: string) => {
      const cycle = cycles.find((c) => c.id === cycleId);
      const label = cycle?.label ?? cycleId;
      const confirmed = window.confirm(
        `Unlock "${label}" for editing?\n\nMerit review changes will be allowed again. The saved snapshot remains available until you finalize again.`
      );
      if (!confirmed) return;
      setCycles(unlockCycle(cycleId, cycles));
      toast({
        variant: 'success',
        title: 'Cycle unlocked',
        description: `${label} is open for merit review edits again.`,
      });
    },
    [cycles, setCycles, toast]
  );

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
                <span className="font-medium text-slate-700">Finalize</span> locks merit review and saves a snapshot of
                all increases. Use when the cycle is approved and ready for payroll.
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
        providerCountByCycleId={providerCountByCycleId}
        onFinalizeCycle={handleFinalizeCycle}
        onUnlockCycle={handleUnlockCycle}
      />
    </div>
  );
}
