/**
 * Configure which roster dollar fields roll up into Current TCC (survey-style total cash).
 */

import type { ReactNode } from 'react';
import type { TccCalculationSettings, TccSumComponentKey } from '../../../types/tcc-calculation';
import { TCC_COMPONENT_LABELS, TCC_SUM_COMPONENT_KEYS } from '../../../types/tcc-calculation';

export interface TccCalculationTabProps {
  settings: TccCalculationSettings;
  setSettings: React.Dispatch<React.SetStateAction<TccCalculationSettings>>;
  embedded?: boolean;
}

export function TccCalculationTab({ settings, setSettings, embedded = false }: TccCalculationTabProps) {
  const toggle = (key: TccSumComponentKey) => {
    setSettings((prev) => ({
      ...prev,
      componentIncluded: {
        ...prev.componentIncluded,
        [key]: !prev.componentIncluded[key],
      },
    }));
  };

  const shell = (inner: ReactNode) =>
    embedded ? <div className="min-w-0">{inner}</div> : <div className="p-6 max-w-2xl">{inner}</div>;

  return shell(
    <>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Current TCC calculation</h2>
      <p className="text-sm text-slate-600 mb-4">
        Current TCC is not uploaded. It is computed as the sum of the roster fields you include below (base, incentives,
        stipends, and other recurring cash). Adjust the checkboxes to match how your organization defines total cash for
        benchmarking. TCC at 1.0 FTE is derived as Current TCC ÷ Total FTE when Total FTE is set.
      </p>
      <ul className="space-y-2">
        {TCC_SUM_COMPONENT_KEYS.map((key) => (
          <li key={key} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={`tcc-${key}`}
              className="mt-1 rounded border-slate-300"
              checked={settings.componentIncluded[key]}
              onChange={() => toggle(key)}
            />
            <label htmlFor={`tcc-${key}`} className="text-sm text-slate-800 cursor-pointer leading-snug">
              <span className="font-medium">{TCC_COMPONENT_LABELS[key]}</span>
              <span className="block text-xs text-slate-500 font-mono">{key}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
