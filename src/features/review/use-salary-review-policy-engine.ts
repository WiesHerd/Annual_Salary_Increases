import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { buildMarketResolver } from '../../lib/joins';
import { loadSurveySpecialtyMappingSet, loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import { evaluatePolicyForProvider } from '../../lib/policy-engine/evaluator';
import type { PolicyEvaluationContext } from '../../lib/policy-engine/evaluator';
import {
  recalculateProviderRow,
} from '../../lib/calculations/recalculate-provider-row';
import type { ProviderRecord } from '../../types/provider';
import type { AnnualIncreasePolicy, CustomCompensationModel } from '../../types/compensation-policy';
import type { TierTable } from '../../types/tier-table';
import type { MeritMatrixRow } from '../../types/merit-matrix-row';
import type { ExperienceBand } from '../../types/experience-band';
import type { CfBySpecialtyRow } from '../../types/cf-by-specialty';
import type { ExperienceBandSurveyContext, MarketSurveySet } from '../../types/market-survey-config';
import type { Cycle } from '../../types/cycle';

export function useSalaryReviewPolicyEngine(params: {
  records: ProviderRecord[];
  setRecords: Dispatch<SetStateAction<ProviderRecord[]>>;
  marketSurveys: MarketSurveySet;
  cycles: Cycle[];
  selectedCycleId: string;
  policies: AnnualIncreasePolicy[];
  customModels: CustomCompensationModel[];
  tierTables: TierTable[];
  meritMatrix: MeritMatrixRow[];
  experienceBands: ExperienceBand[];
  cfBySpecialty: CfBySpecialtyRow[];
}) {
  const {
    records,
    setRecords,
    marketSurveys,
    cycles,
    selectedCycleId,
    policies,
    customModels,
    tierTables,
    meritMatrix,
    experienceBands,
    cfBySpecialty,
  } = params;

  const surveyMappings = useMemo(() => loadSurveySpecialtyMappingSet(), [marketSurveys]);
  const providerTypeToSurvey = useMemo(() => loadProviderTypeToSurveyMapping(), [marketSurveys]);

  const marketResolver = useMemo(
    () => buildMarketResolver(marketSurveys, surveyMappings, providerTypeToSurvey),
    [marketSurveys, surveyMappings, providerTypeToSurvey]
  );

  const experienceBandSurveyContext = useMemo(
    (): ExperienceBandSurveyContext => ({
      surveyMappings,
      providerTypeToSurvey,
    }),
    [surveyMappings, providerTypeToSurvey]
  );

  const asOfDate = useMemo(() => {
    const cycle = cycles.find((c) => c.id === selectedCycleId);
    return cycle?.effectiveDate ?? undefined;
  }, [cycles, selectedCycleId]);

  const policyContext = useMemo(
    (): PolicyEvaluationContext => ({
      policies,
      customModels,
      tierTables,
      meritMatrixRows: meritMatrix,
      asOfDate,
    }),
    [policies, customModels, tierTables, meritMatrix, asOfDate]
  );

  const evaluationResults = useMemo(() => {
    const map = new Map<string, import('../../types/compensation-policy').PolicyEvaluationResult>();
    for (const r of records) {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      const result = evaluatePolicyForProvider(r, { ...policyContext, marketRow });
      map.set(r.Employee_ID, result);
    }
    return map;
  }, [records, policyContext, marketResolver]);

  useEffect(() => {
    if (records.length === 0) return;
    const ctx: PolicyEvaluationContext = {
      policies,
      customModels,
      tierTables,
      meritMatrixRows: meritMatrix,
      asOfDate: cycles.find((c) => c.id === selectedCycleId)?.effectiveDate,
    };
    let hasChange = false;
    const nextRecords = records.map((r) => {
      const matchKey = (r.Market_Specialty_Override ?? r.Specialty ?? r.Benchmark_Group ?? '').trim();
      const marketRow = matchKey ? marketResolver(r, matchKey) : undefined;
      const policyResult = evaluatePolicyForProvider(r, { ...ctx, marketRow });
      const recalculated = recalculateProviderRow({
        record: r,
        marketRow,
        experienceBands,
        experienceBandSurveyContext,
        meritMatrixRows: meritMatrix,
        policyResult,
        cfBySpecialty,
      });
      if (
        recalculated.Proposed_Base_Salary !== r.Proposed_Base_Salary ||
        recalculated.Approved_Increase_Percent !== r.Approved_Increase_Percent ||
        recalculated.Approved_Increase_Amount !== r.Approved_Increase_Amount ||
        recalculated.Policy_Tier_Assigned !== r.Policy_Tier_Assigned ||
        recalculated.Proposed_Tier !== r.Proposed_Tier
      ) {
        hasChange = true;
      }
      return recalculated;
    });
    if (hasChange) setRecords(nextRecords);
  }, [
    records,
    policies,
    customModels,
    tierTables,
    meritMatrix,
    experienceBands,
    experienceBandSurveyContext,
    cfBySpecialty,
    marketResolver,
    cycles,
    selectedCycleId,
    setRecords,
  ]);

  const policySourceByEmployeeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      const source = evaluationResults.get(r.Employee_ID)?.finalPolicySource ?? r.Policy_Source_Name ?? '—';
      map.set(r.Employee_ID, source);
    }
    return map;
  }, [records, evaluationResults]);

  return { marketResolver, policyContext, evaluationResults, policySourceByEmployeeId, experienceBandSurveyContext };
}
