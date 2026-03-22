/**
 * Single app-wide parameters/configuration state (cycles, matrices, bands, etc.).
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cycle } from '../types/cycle';
import type { MeritMatrixRow } from '../types/merit-matrix-row';
import type { ExperienceBand } from '../types/experience-band';
import type { PcpPhysicianTierRow } from '../types/pcp-tier';
import type { PcpAppRuleRow } from '../types/pcp-app-rules';
import type { PlanAssignmentRuleRow } from '../types/plan-assignment-row';
import type { BudgetSettingsRow } from '../types/budget-settings';
import type { CfBySpecialtyRow } from '../types/cf-by-specialty';
import {
  loadCycles,
  saveCycles,
  loadMeritMatrix,
  saveMeritMatrix,
  loadExperienceBands,
  saveExperienceBands,
  loadPcpTierSettings,
  savePcpTierSettings,
  loadPcpAppRules,
  savePcpAppRules,
  loadPlanAssignmentRules,
  savePlanAssignmentRules,
  loadBudgetSettings,
  saveBudgetSettings,
  loadCfBySpecialty,
  saveCfBySpecialty,
} from '../lib/parameters-storage';

export type ParametersStateValue = {
  cycles: Cycle[];
  setCycles: React.Dispatch<React.SetStateAction<Cycle[]>>;
  meritMatrix: MeritMatrixRow[];
  setMeritMatrix: React.Dispatch<React.SetStateAction<MeritMatrixRow[]>>;
  experienceBands: ExperienceBand[];
  setExperienceBands: React.Dispatch<React.SetStateAction<ExperienceBand[]>>;
  pcpTierSettings: PcpPhysicianTierRow[];
  setPcpTierSettings: React.Dispatch<React.SetStateAction<PcpPhysicianTierRow[]>>;
  pcpAppRules: PcpAppRuleRow[];
  setPcpAppRules: React.Dispatch<React.SetStateAction<PcpAppRuleRow[]>>;
  planAssignmentRules: PlanAssignmentRuleRow[];
  setPlanAssignmentRules: React.Dispatch<React.SetStateAction<PlanAssignmentRuleRow[]>>;
  budgetSettings: BudgetSettingsRow[];
  setBudgetSettings: React.Dispatch<React.SetStateAction<BudgetSettingsRow[]>>;
  cfBySpecialty: CfBySpecialtyRow[];
  setCfBySpecialty: React.Dispatch<React.SetStateAction<CfBySpecialtyRow[]>>;
  loaded: boolean;
};

const ParametersStateContext = createContext<ParametersStateValue | null>(null);

export function ParametersStateProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [meritMatrix, setMeritMatrix] = useState<MeritMatrixRow[]>([]);
  const [experienceBands, setExperienceBands] = useState<ExperienceBand[]>([]);
  const [pcpTierSettings, setPcpTierSettings] = useState<PcpPhysicianTierRow[]>([]);
  const [pcpAppRules, setPcpAppRules] = useState<PcpAppRuleRow[]>([]);
  const [planAssignmentRules, setPlanAssignmentRules] = useState<PlanAssignmentRuleRow[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettingsRow[]>([]);
  const [cfBySpecialty, setCfBySpecialty] = useState<CfBySpecialtyRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCycles(loadCycles());
    setMeritMatrix(loadMeritMatrix());
    setExperienceBands(loadExperienceBands());
    setPcpTierSettings(loadPcpTierSettings());
    setPcpAppRules(loadPcpAppRules());
    setPlanAssignmentRules(loadPlanAssignmentRules());
    setBudgetSettings(loadBudgetSettings());
    setCfBySpecialty(loadCfBySpecialty());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCycles(cycles);
  }, [cycles, loaded]);
  useEffect(() => {
    if (loaded) saveMeritMatrix(meritMatrix);
  }, [meritMatrix, loaded]);
  useEffect(() => {
    if (loaded) saveExperienceBands(experienceBands);
  }, [experienceBands, loaded]);
  useEffect(() => {
    if (loaded) savePcpTierSettings(pcpTierSettings);
  }, [pcpTierSettings, loaded]);
  useEffect(() => {
    if (loaded) savePcpAppRules(pcpAppRules);
  }, [pcpAppRules, loaded]);
  useEffect(() => {
    if (loaded) savePlanAssignmentRules(planAssignmentRules);
  }, [planAssignmentRules, loaded]);
  useEffect(() => {
    if (loaded) saveBudgetSettings(budgetSettings);
  }, [budgetSettings, loaded]);
  useEffect(() => {
    if (loaded) saveCfBySpecialty(cfBySpecialty);
  }, [cfBySpecialty, loaded]);

  const value = useMemo(
    () => ({
      cycles,
      setCycles,
      meritMatrix,
      setMeritMatrix,
      experienceBands,
      setExperienceBands,
      pcpTierSettings,
      setPcpTierSettings,
      pcpAppRules,
      setPcpAppRules,
      planAssignmentRules,
      setPlanAssignmentRules,
      budgetSettings,
      setBudgetSettings,
      cfBySpecialty,
      setCfBySpecialty,
      loaded,
    }),
    [
      cycles,
      meritMatrix,
      experienceBands,
      pcpTierSettings,
      pcpAppRules,
      planAssignmentRules,
      budgetSettings,
      cfBySpecialty,
      loaded,
    ]
  );

  return <ParametersStateContext.Provider value={value}>{children}</ParametersStateContext.Provider>;
}

export function useParametersState(): ParametersStateValue {
  const ctx = useContext(ParametersStateContext);
  if (!ctx) {
    throw new Error('useParametersState must be used within ParametersStateProvider');
  }
  return ctx;
}
