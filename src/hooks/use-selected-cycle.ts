/**
 * App-level selected budget cycle. Persists to sessionStorage so both
 * Layout (sidebar dropdown) and Salary Review (budget resolution) stay in sync.
 * Syncs to the preferred cycle (newest effective date) when the stored id is invalid.
 */

import { useState, useCallback, useEffect } from 'react';
import { safeSessionStorageSetItem } from '../lib/safe-local-storage';
import { getPreferredCycleId } from '../lib/cycle-defaults';
import type { Cycle } from '../types/cycle';

const STORAGE_KEY_REVIEW_CYCLE = 'salary-review-cycle-id';

export function useSelectedCycle(cycles: Cycle[]) {
  const [selectedCycleId, setSelectedCycleIdState] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_REVIEW_CYCLE) ?? '';
    } catch {
      return '';
    }
  });

  const setSelectedCycleId = useCallback((id: string) => {
    setSelectedCycleIdState(id);
    safeSessionStorageSetItem(STORAGE_KEY_REVIEW_CYCLE, id);
  }, []);

  useEffect(() => {
    if (cycles.length === 0) return;
    const valid = cycles.some((c) => c.id === selectedCycleId);
    if (valid) return;
    const next = getPreferredCycleId(cycles) ?? '';
    if (next !== selectedCycleId) {
      setSelectedCycleIdState(next);
      safeSessionStorageSetItem(STORAGE_KEY_REVIEW_CYCLE, next);
    }
  }, [cycles, selectedCycleId]);

  return [selectedCycleId, setSelectedCycleId] as const;
}
