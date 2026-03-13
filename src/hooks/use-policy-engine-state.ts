/**
 * Policy engine state: policies, custom models, tier tables, active matrix id.
 * Load/save from localStorage; used by Parameters policy tabs and salary review.
 */

import { useState, useEffect } from 'react';
import type { AnnualIncreasePolicy } from '../types/compensation-policy';
import type { CustomCompensationModel } from '../types/compensation-policy';
import type { TierTable } from '../types/tier-table';
import { useCallback } from 'react';
import {
  loadPolicies,
  savePolicies,
  loadCustomModels,
  saveCustomModels,
  loadTierTables,
  saveTierTables,
  loadActiveMatrixId,
  saveActiveMatrixId,
  migrateCustomModelsToPolicies,
} from '../lib/policy-engine-storage';

export function usePolicyEngineState() {
  const [policies, setPolicies] = useState<AnnualIncreasePolicy[]>([]);
  const [customModels, setCustomModels] = useState<CustomCompensationModel[]>([]);
  const [tierTables, setTierTables] = useState<TierTable[]>([]);
  const [activeMatrixId, setActiveMatrixId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let policies = loadPolicies();
    let customModels = loadCustomModels();
    const migrated = migrateCustomModelsToPolicies(policies, customModels);
    policies = migrated.policies;
    customModels = migrated.customModels;
    setPolicies(policies);
    setCustomModels(customModels);
    setTierTables(loadTierTables());
    setActiveMatrixId(loadActiveMatrixId());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) savePolicies(policies);
  }, [policies, loaded]);
  useEffect(() => {
    if (loaded) saveCustomModels(customModels);
  }, [customModels, loaded]);
  useEffect(() => {
    if (loaded) saveTierTables(tierTables);
  }, [tierTables, loaded]);
  useEffect(() => {
    if (loaded) saveActiveMatrixId(activeMatrixId);
  }, [activeMatrixId, loaded]);

  /** Force immediate save to localStorage. Call after critical edits to ensure persistence. */
  const persistNow = useCallback(() => {
    if (loaded) savePolicies(policies);
  }, [policies, loaded]);

  return {
    policies,
    setPolicies,
    customModels,
    setCustomModels,
    tierTables,
    setTierTables,
    activeMatrixId,
    setActiveMatrixId,
    loaded,
    persistNow,
  };
}
