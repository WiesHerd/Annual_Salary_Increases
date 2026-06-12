/**
 * Single app-wide selected merit cycle. Layout sidebar and Merit review share this state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useParametersState } from '../hooks/use-parameters-state';
import { getPreferredCycleId } from '../lib/cycle-defaults';
import { safeSessionStorageSetItem } from '../lib/safe-local-storage';

const STORAGE_KEY_REVIEW_CYCLE = 'salary-review-cycle-id';

type SelectedCycleContextValue = {
  selectedCycleId: string;
  setSelectedCycleId: (id: string) => void;
};

const SelectedCycleContext = createContext<SelectedCycleContextValue | null>(null);

export function SelectedCycleProvider({ children }: { children: ReactNode }) {
  const { cycles } = useParametersState();
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

  return (
    <SelectedCycleContext.Provider value={{ selectedCycleId, setSelectedCycleId }}>
      {children}
    </SelectedCycleContext.Provider>
  );
}

export function useSelectedCycle(): readonly [string, (id: string) => void] {
  const ctx = useContext(SelectedCycleContext);
  if (ctx == null) {
    throw new Error('useSelectedCycle must be used within SelectedCycleProvider');
  }
  return [ctx.selectedCycleId, ctx.setSelectedCycleId] as const;
}
