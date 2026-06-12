/**
 * Compensation cycle picker for provider import — uses configured review cycles from Parameters.
 */

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useParametersState } from '../hooks/use-parameters-state';
import { sortCyclesNewestFirst, getPreferredCycleId } from '../lib/cycle-defaults';
import { DEFAULT_CYCLE_ID } from '../lib/parse-file';
import { AppSelect } from './app-select';

interface CycleSelectProps {
  id?: string;
  value: string;
  onChange: (cycleId: string) => void;
  /** Inline label + select on one row (for modal header). */
  layout?: 'field' | 'inline';
}

export function CycleSelect({ id = 'upload-cycle', value, onChange, layout = 'field' }: CycleSelectProps) {
  const { cycles } = useParametersState();

  const options = useMemo(() => {
    const sorted = sortCyclesNewestFirst(cycles);
    if (sorted.length === 0) {
      return [{ value: value || DEFAULT_CYCLE_ID, label: value || DEFAULT_CYCLE_ID }];
    }
    const ids = new Set(sorted.map((c) => c.id));
    const list = sorted.map((c) => ({ value: c.id, label: c.label || c.id }));
    if (value && !ids.has(value)) {
      list.unshift({ value, label: value });
    }
    return list;
  }, [cycles, value]);

  const selectValue = value || getPreferredCycleId(cycles) || options[0]?.value || DEFAULT_CYCLE_ID;

  if (layout === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          Cycle
        </Label>
        <AppSelect id={id} size="header" value={selectValue} onChange={onChange} options={options} />
      </div>
    );
  }

  return (
    <AppSelect
      id={id}
      label="Cycle"
      size="compact"
      value={selectValue}
      onChange={onChange}
      options={options}
    />
  );
}
