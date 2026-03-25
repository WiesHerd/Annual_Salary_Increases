/**
 * Compare Scenarios page: run two policy configs and compare results side-by-side.
 * Workday-inspired what-if scenario comparison.
 */

import { useMemo, useState, useCallback } from 'react';
import { useAppState } from '../../hooks/use-app-state';
import { useParametersState } from '../../hooks/use-parameters-state';
import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';
import { useSelectedCycle } from '../../hooks/use-selected-cycle';
import { buildMarketResolver } from '../../lib/joins';
import { loadSurveySpecialtyMappingSet, loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import { runScenario } from '../../lib/run-scenario';
import { buildScenarioConfigFromPreset, SCENARIO_PRESET_LABELS } from '../../lib/scenario-presets';
import { resolveBudgetForCycle } from '../../lib/salary-review-summary';
import type { ScenarioConfigSnapshot, ScenarioRunResult } from '../../types/scenario';
import type { ScenarioPresetId } from '../../types/scenario';
import { CompareScenariosSummary } from './compare-scenarios-summary';
import { CompareScenariosTable } from './compare-scenarios-table';
import { CompareScenariosFilterBar } from './compare-scenarios-filter-bar';
import { ProviderCompareModal } from '../review/provider-compare-modal';
import { exportCompareScenariosToXlsx } from '../../lib/compare-scenarios-export';
import {
  buildCompareRows,
  applyCompareFilters,
  getCompareFilterOptions,
  DEFAULT_COMPARE_SCENARIOS_FILTERS,
  type CompareScenariosFilters,
} from '../../lib/compare-scenarios-filters';
import {
  applyTargetCohortFilters,
  getTargetCohortFilterOptions,
  DEFAULT_COMPARE_TARGET_COHORT_FILTERS,
  hasTargetCohortFilters,
  type CompareTargetCohortFilters,
} from '../../lib/compare-target-cohort';
import { CompareTargetCohortBar } from './compare-target-cohort-bar';
import { validateScenarioConfig } from '../../lib/policy-engine/validation';
import {
  loadSavedScenarios,
  saveScenario,
  createSavedScenario,
  type SavedScenario,
} from '../../lib/scenario-storage';

/** Scenario A: current config (from Policy Engine), a single policy, or a saved scenario. */
type ScenarioAValue = 'current' | `policy:${string}` | `saved:${string}`;

/** Scenario B: preset (derived from A), a single policy, or a saved scenario. */
type ScenarioBValue = ScenarioPresetId | `policy:${string}` | `saved:${string}`;

const PRESET_IDS: ScenarioPresetId[] = ['merit-matrix-only', 'no-custom-models', 'conservative-cap'];

function isPresetId(v: ScenarioBValue): v is ScenarioPresetId {
  return PRESET_IDS.includes(v as ScenarioPresetId);
}

function isPolicyScenarioValue(v: string): v is `policy:${string}` {
  return typeof v === 'string' && v.startsWith('policy:');
}

export function CompareScenariosPage() {
  const { records, marketSurveys, loaded } = useAppState();
  const { meritMatrix, cycles, budgetSettings, experienceBands } = useParametersState();
  const { policies, customModels, tierTables } = usePolicyEngineState();
  const [selectedCycleId] = useSelectedCycle(cycles);
  const [scenarioA, setScenarioA] = useState<ScenarioAValue>('current');
  const [scenarioB, setScenarioB] = useState<ScenarioBValue>('merit-matrix-only');
  const [resultA, setResultA] = useState<ScenarioRunResult | null>(null);
  const [resultB, setResultB] = useState<ScenarioRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [filters, setFilters] = useState<CompareScenariosFilters>(DEFAULT_COMPARE_SCENARIOS_FILTERS);
  const [targetCohortFilters, setTargetCohortFilters] = useState<CompareTargetCohortFilters>(
    DEFAULT_COMPARE_TARGET_COHORT_FILTERS
  );
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => loadSavedScenarios());

  const activePolicies = useMemo(
    () => policies.filter((p) => p.status === 'active'),
    [policies]
  );

  const targetRecords = useMemo(
    () => applyTargetCohortFilters(records, targetCohortFilters),
    [records, targetCohortFilters]
  );

  const targetCohortFilterOptions = useMemo(
    () => getTargetCohortFilterOptions(records),
    [records]
  );

  const marketResolver = useMemo(
    () =>
      buildMarketResolver(marketSurveys, loadSurveySpecialtyMappingSet(), loadProviderTypeToSurveyMapping()),
    [marketSurveys]
  );

  const asOfDate = useMemo(() => {
    const cycle = cycles.find((c) => c.id === selectedCycleId);
    return cycle?.effectiveDate ?? undefined;
  }, [cycles, selectedCycleId]);

  const currentConfig: ScenarioConfigSnapshot = useMemo(
    () => ({
      policies,
      customModels,
      tierTables,
      meritMatrixRows: meritMatrix,
      asOfDate,
    }),
    [policies, customModels, tierTables, meritMatrix, asOfDate]
  );

  const configA: ScenarioConfigSnapshot = useMemo(() => {
    if (scenarioA === 'current') return currentConfig;
    if (scenarioA.startsWith('saved:')) {
      const saved = savedScenarios.find((s) => s.id === scenarioA.slice('saved:'.length));
      return saved?.config ?? currentConfig;
    }
    if (isPolicyScenarioValue(scenarioA)) {
      const policyId = scenarioA.slice('policy:'.length);
      const policy = currentConfig.policies.find((p) => p.id === policyId);
      if (!policy) return currentConfig;
      return {
        policies: [policy],
        customModels: currentConfig.customModels,
        tierTables: currentConfig.tierTables,
        meritMatrixRows: currentConfig.meritMatrixRows,
        asOfDate: currentConfig.asOfDate,
      };
    }
    return currentConfig;
  }, [scenarioA, currentConfig, savedScenarios]);

  const configB: ScenarioConfigSnapshot = useMemo(() => {
    if (isPresetId(scenarioB)) {
      return buildScenarioConfigFromPreset(scenarioB, configA);
    }
    if (scenarioB.startsWith('saved:')) {
      const savedId = scenarioB.slice('saved:'.length);
      const saved = savedScenarios.find((s) => s.id === savedId);
      return saved?.config ?? configA;
    }
    if (isPolicyScenarioValue(scenarioB)) {
      const policyId = scenarioB.slice('policy:'.length);
      const policy = currentConfig.policies.find((p) => p.id === policyId);
      if (!policy) return configA;
      return {
        policies: [policy],
        customModels: currentConfig.customModels,
        tierTables: currentConfig.tierTables,
        meritMatrixRows: currentConfig.meritMatrixRows,
        asOfDate: currentConfig.asOfDate,
      };
    }
    return configA;
  }, [scenarioB, configA, currentConfig, savedScenarios]);

  const scenarioALabel = useMemo(() => {
    if (scenarioA === 'current') return 'Current configuration';
    if (scenarioA.startsWith('saved:')) {
      const saved = savedScenarios.find((s) => s.id === scenarioA.slice('saved:'.length));
      return saved?.label ?? 'Saved scenario';
    }
    if (isPolicyScenarioValue(scenarioA)) {
      const policy = currentConfig.policies.find((p) => p.id === scenarioA.slice('policy:'.length));
      return policy ? `Policy: ${policy.name}` : 'Single policy';
    }
    return 'Current configuration';
  }, [scenarioA, savedScenarios, currentConfig.policies]);

  const scenarioBLabel = useMemo(() => {
    if (isPresetId(scenarioB)) return SCENARIO_PRESET_LABELS[scenarioB];
    if (scenarioB.startsWith('saved:')) {
      const saved = savedScenarios.find((s) => s.id === scenarioB.slice('saved:'.length));
      return saved?.label ?? 'Custom scenario';
    }
    if (isPolicyScenarioValue(scenarioB)) {
      const policy = currentConfig.policies.find((p) => p.id === scenarioB.slice('policy:'.length));
      return policy ? `Policy: ${policy.name}` : 'Single policy';
    }
    return 'Custom scenario';
  }, [scenarioB, savedScenarios, currentConfig.policies]);

  const budgetAmount = useMemo(
    () =>
      selectedCycleId
        ? resolveBudgetForCycle(selectedCycleId, budgetSettings, cycles)
        : undefined,
    [selectedCycleId, budgetSettings, cycles]
  );

  const configValidation = useMemo(() => {
    const a = validateScenarioConfig(configA);
    const b = validateScenarioConfig(configB);
    return {
      errors: [...a.errors, ...b.errors],
      warnings: [...a.warnings, ...b.warnings],
    };
  }, [configA, configB]);

  const handleRunComparison = useCallback(() => {
    if (targetRecords.length === 0) return;
    setIsRunning(true);
    try {
      const a = runScenario(
        targetRecords,
        configA,
        marketResolver,
        'scenario-a',
        scenarioALabel
      );
      const b = runScenario(
        targetRecords,
        configB,
        marketResolver,
        'scenario-b',
        scenarioBLabel
      );
      setResultA(a);
      setResultB(b);
    } finally {
      setIsRunning(false);
    }
  }, [targetRecords, configA, configB, marketResolver, scenarioALabel, scenarioBLabel]);

  const handleExportXlsx = useCallback(() => {
    if (!resultA || !resultB) return;
    const buffer = exportCompareScenariosToXlsx(targetRecords, resultA, resultB);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-sandbox-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  }, [targetRecords, resultA, resultB]);

  const handleSaveAsScenario = useCallback(() => {
    const label = window.prompt('Name this scenario:', 'My custom scenario');
    if (!label?.trim()) return;
    const saved = createSavedScenario(label.trim(), configA);
    saveScenario(saved);
    setSavedScenarios(loadSavedScenarios());
    setScenarioB(`saved:${saved.id}` as ScenarioBValue);
  }, [configA]);

  const handleSaveBAsScenario = useCallback(() => {
    const label = window.prompt('Name Scenario B as a saved scenario:', scenarioBLabel || 'Scenario B copy');
    if (!label?.trim()) return;
    const saved = createSavedScenario(label.trim(), configB);
    saveScenario(saved);
    setSavedScenarios(loadSavedScenarios());
    setScenarioB(`saved:${saved.id}` as ScenarioBValue);
  }, [configB, scenarioBLabel]);

  const rows = useMemo(() => {
    if (!resultA || !resultB) return [];
    return buildCompareRows(targetRecords, resultA, resultB);
  }, [targetRecords, resultA, resultB]);

  const filterOptions = useMemo(() => getCompareFilterOptions(rows), [rows]);

  const filteredRows = useMemo(
    () => applyCompareFilters(rows, filters),
    [rows, filters]
  );

  if (!loaded) {
    return (
      <div className="app-card p-10 text-center text-slate-600">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className="min-w-0 flex flex-col border border-indigo-100 rounded-2xl bg-white shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)]">
        {/* Header row - same structure as Salary Review */}
        <div className="shrink-0 px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-semibold text-slate-800">Policy sandbox</h2>
            <p className="text-xs text-slate-600">
              Run two policy configurations on the same providers and compare results side-by-side. Scenario A and B use the policy set from <strong>Controls → Base increases → Policy library</strong>: choose <strong>Current configuration</strong> (all active policies), a <strong>single policy</strong> to test that policy alone, or a saved snapshot.
            </p>
            <p className="text-[11px] text-slate-500">
              {resultA && resultB ? (
                <>
                  Providers in run: <span className="font-medium text-slate-700">{targetRecords.length}</span>
                  {hasTargetCohortFilters(targetCohortFilters) && (
                    <span className="text-slate-400"> ({targetRecords.length} of {records.length} loaded)</span>
                  )}
                  {' · Delta (B − A): '}
                  <span className="font-medium text-slate-700">
                    {resultB.summary.totalIncreaseDollars - resultA.summary.totalIncreaseDollars >= 0 ? '+' : ''}
                    {((resultB.summary.totalIncreaseDollars - resultA.summary.totalIncreaseDollars) / 1).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </>
              ) : (
                <>
                  Providers in view: <span className="font-medium text-slate-700">{records.length}</span>
                  {hasTargetCohortFilters(targetCohortFilters) && (
                    <span> · Run on: <span className="font-medium text-slate-700">{targetRecords.length}</span> (of {records.length})</span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {configValidation.errors.length > 0 && (
              <span className="text-xs text-red-600 font-medium" title={configValidation.errors.join(' ')}>
                Validation errors
              </span>
            )}
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={targetRecords.length === 0 || isRunning}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? 'Running...' : 'Run comparison'}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportDropdownOpen((o) => !o)}
                disabled={!resultA || !resultB}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors"
              >
                Export
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setExportDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20">
                    <button
                      type="button"
                      onClick={handleExportXlsx}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Export to XLSX
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {records.length > 0 && (
          <CompareTargetCohortBar
            filters={targetCohortFilters}
            onFiltersChange={setTargetCohortFilters}
            filterOptions={targetCohortFilterOptions}
            targetCount={targetRecords.length}
            totalCount={records.length}
          />
        )}
        {/* Scenario bar - same pattern as Salary Review filter bar: one strip with border-b */}
        <div className="shrink-0 px-5 py-3 flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scenario A</span>
            <select
              value={scenarioA}
              onChange={(e) => setScenarioA(e.target.value as ScenarioAValue)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 min-w-[200px]"
              aria-label="Choose Scenario A"
            >
              <option value="current">Current configuration</option>
              {activePolicies.length > 0 && (
                <optgroup label="Single policy (from Parameters)">
                  {activePolicies.map((p) => (
                    <option key={p.id} value={`policy:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {savedScenarios.length > 0 && (
                <optgroup label="Saved scenarios">
                  {savedScenarios.map((s) => (
                    <option key={s.id} value={`saved:${s.id}`}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scenario B</span>
            <select
              value={scenarioB}
              onChange={(e) => setScenarioB(e.target.value as ScenarioBValue)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 min-w-[200px]"
              aria-label="Choose Scenario B"
            >
              <optgroup label="What-if presets (based on Scenario A)">
                {PRESET_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SCENARIO_PRESET_LABELS[id]}
                  </option>
                ))}
              </optgroup>
              {activePolicies.length > 0 && (
                <optgroup label="Single policy (from Parameters)">
                  {activePolicies.map((p) => (
                    <option key={p.id} value={`policy:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {savedScenarios.length > 0 && (
                <optgroup label="Saved scenarios">
                  {savedScenarios.map((s) => (
                    <option key={s.id} value={`saved:${s.id}`}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleSaveAsScenario}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2 text-sm font-medium"
              title="Save Scenario A configuration as a named scenario"
              aria-label="Save Scenario A as scenario"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save A
            </button>
            <button
              type="button"
              onClick={handleSaveBAsScenario}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2 text-sm font-medium"
              title="Save Scenario B configuration as a new named scenario"
              aria-label="Save Scenario B as scenario"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save B
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-10 text-center text-slate-600">
            <p>Load provider data from Import to run a scenario comparison.</p>
          </div>
        ) : (
          <div className="flex flex-col min-w-0 flex-1 min-h-0">
            <CompareScenariosSummary resultA={resultA} resultB={resultB} budgetAmount={budgetAmount} />
            {resultA && resultB && (
              <CompareScenariosFilterBar
                filters={filters}
                onFiltersChange={setFilters}
                filterOptions={filterOptions}
                totalCount={rows.length}
                filteredCount={filteredRows.length}
                selectedForCompare={selectedForCompare}
                onOpenCompareModal={() => setCompareModalOpen(true)}
              />
            )}
            <CompareScenariosTable
              rows={filteredRows}
              scenarioALabel={scenarioALabel}
              scenarioBLabel={scenarioBLabel}
              selectedForCompare={selectedForCompare}
              onToggleCompare={setSelectedForCompare}
              hasRunComparison={!!resultA && !!resultB}
            />
            {compareModalOpen && selectedForCompare.length >= 2 && selectedForCompare.length <= 4 && (
              <ProviderCompareModal
                providerIds={selectedForCompare}
                records={records}
                experienceBands={experienceBands ?? []}
                onClose={() => setCompareModalOpen(false)}
                onClearSelection={() => setSelectedForCompare([])}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
