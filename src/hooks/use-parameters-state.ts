/**
 * Parameters/configuration state: cycles, merit matrix, experience bands,
 * PCP tiers, PCP APP rules, plan assignment, budget.
 * Load from localStorage on mount; persist on change.
 */

import { useState, useEffect } from 'react';
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

export function useParametersState() {
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

  return {
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
  };
}
