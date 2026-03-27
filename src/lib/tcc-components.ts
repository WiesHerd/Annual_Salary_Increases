/**
 * Total cash compensation (TCC) building blocks aligned with typical physician survey definitions
 * (e.g. Sullivan Cotter): base + productivity incentives + value/quality + stipends + other recurring.
 * Current_TCC is always derived from the sum of enabled components (see Parameters → Current TCC).
 * Does not include CF×wRVU imputation — that path is modeled separately in recalculateProviderRow.
 */

import type { ProviderRecord } from '../types/provider';
import type { TccCalculationSettings, TccSumComponentKey } from '../types/tcc-calculation';
import { TCC_SUM_COMPONENT_KEYS, defaultTccCalculationSettings } from '../types/tcc-calculation';

function getComponentValue(p: ProviderRecord, key: TccSumComponentKey): number {
  const v = p[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Sum of selected cash components (annual, at current FTE as stored on the row). */
export function sumExplicitTccComponents(
  p: ProviderRecord,
  settings: TccCalculationSettings = defaultTccCalculationSettings()
): number {
  let sum = 0;
  for (const key of TCC_SUM_COMPONENT_KEYS) {
    if (settings.componentIncluded[key]) {
      sum += getComponentValue(p, key);
    }
  }
  return sum;
}

/**
 * Always set Current_TCC and Current_TCC_at_1FTE from the configured component sum.
 * Uploaded or legacy Current_TCC values are not used; roster drives the calculation only.
 */
export function applyDerivedCurrentTcc(
  p: ProviderRecord,
  settings: TccCalculationSettings = defaultTccCalculationSettings()
): ProviderRecord {
  const sum = sumExplicitTccComponents(p, settings);
  const fte = p.Current_FTE ?? 1;
  const at1 = fte > 0 ? sum / fte : sum;
  return {
    ...p,
    Current_TCC: sum,
    Current_TCC_at_1FTE: at1,
  };
}

export function mapProvidersWithDerivedTcc(
  rows: ProviderRecord[],
  settings?: TccCalculationSettings
): ProviderRecord[] {
  const s = settings ?? defaultTccCalculationSettings();
  return rows.map((r) => applyDerivedCurrentTcc(r, s));
}
