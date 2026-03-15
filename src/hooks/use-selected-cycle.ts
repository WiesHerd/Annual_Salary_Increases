/**
 * App-level selected budget cycle. Persists to sessionStorage so both
 * Layout (sidebar dropdown) and Salary Review (budget resolution) stay in sync.
 * Syncs to first cycle when the stored id is no longer in the cycles list.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_REVIEW_CYCLE = 'salary-review-cycle-id';

export function useSelectedCycle(cycles: { id: string }[]) {
  const [selectedCycleId, setSelectedCycleIdState] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_REVIEW_CYCLE) ?? '';
    } catch {
      return '';
    }
  });

  const setSelectedCycleId = useCallback((id: string) => {
    setSelectedCycleIdState(id);
    try {
      sessionStorage.setItem(STORAGE_KEY_REVIEW_CYCLE, id);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (cycles.length === 0) return;
    const valid = cycles.some((c) => c.id === selectedCycleId);
    if (valid) return;
    const next = cycles[0]?.id ?? '';
    if (next !== selectedCycleId) {
      setSelectedCycleIdState(next);
      try {
        sessionStorage.setItem(STORAGE_KEY_REVIEW_CYCLE, next);
      } catch {
        // ignore
      }
    }
  }, [cycles, selectedCycleId]);

  return [selectedCycleId, setSelectedCycleId] as const;
}
