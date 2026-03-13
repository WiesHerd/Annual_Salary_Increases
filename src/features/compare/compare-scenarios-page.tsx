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
import { validateScenarioConfig } from '../../lib/policy-engine/validation';
import {
  loadSavedScenarios,
  saveScenario,
  createSavedScenario,
  type SavedScenario,
} from '../../lib/scenario-storage';

/** Scenario B selection: preset id or saved scenario id (saved:xxx) */
type ScenarioBValue = ScenarioPresetId | `saved:${string}`;

function isPresetId(v: ScenarioBValue): v is ScenarioPresetId {
  return !v.startsWith('saved:');
}

export function CompareScenariosPage() {
  const { records, marketSurveys, loaded } = useAppState();
  const { meritMatrix, cycles, budgetSettings, experienceBands } = useParametersState();
  const { policies, customModels, tierTables } = usePolicyEngineState();
  const [selectedCycleId] = useSelectedCycle(cycles);
  const [scenarioB, setScenarioB] = useState<ScenarioBValue>('no-custom-models');
  const [resultA, setResultA] = useState<ScenarioRunResult | null>(null);
  const [resultB, setResultB] = useState<ScenarioRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [filters, setFilters] = useState<CompareScenariosFilters>(DEFAULT_COMPARE_SCENARIOS_FILTERS);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => loadSavedScenarios());

  const marketResolver = useMemo(
    () =>
      buildMarketResolver(marketSurveys, loadSurveySpecialtyMappingSet(), loadProviderTypeToSurveyMapping()),
    [marketSurveys]
  );

  const asOfDate = useMemo(() => {
    const cycle = cycles.find((c) => c.id === selectedCycleId);
    return cycle?.effectiveDate ?? undefined;
  }, [cycles, selectedCycleId]);

  const configA: ScenarioConfigSnapshot = useMemo(
    () => ({
      policies,
      customModels,
      tierTables,
      meritMatrixRows: meritMatrix,
      asOfDate,
    }),
    [policies, customModels, tierTables, meritMatrix, asOfDate]
  );

  const configB: ScenarioConfigSnapshot = useMemo(() => {
    if (isPresetId(scenarioB)) {
      return buildScenarioConfigFromPreset(scenarioB, configA);
    }
    const savedId = scenarioB.replace(/^saved:/, '');
    const saved = savedScenarios.find((s) => s.id === savedId);
    return saved?.config ?? configA;
  }, [scenarioB, configA, savedScenarios]);

  const scenarioBLabel = useMemo(() => {
    if (isPresetId(scenarioB)) return SCENARIO_PRESET_LABELS[scenarioB];
    const savedId = scenarioB.replace(/^saved:/, '');
    const saved = savedScenarios.find((s) => s.id === savedId);
    return saved?.label ?? 'Custom scenario';
  }, [scenarioB, savedScenarios]);

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
    if (records.length === 0) return;
    setIsRunning(true);
    try {
      const a = runScenario(
        records,
        configA,
        marketResolver,
        'scenario-a',
        'Current configuration'
      );
      const b = runScenario(
        records,
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
  }, [records, configA, configB, marketResolver, scenarioBLabel]);

  const handleExportXlsx = useCallback(() => {
    if (!resultA || !resultB) return;
    const buffer = exportCompareScenariosToXlsx(records, resultA, resultB);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compare-scenarios-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  }, [records, resultA, resultB]);

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
    return buildCompareRows(records, resultA, resultB);
  }, [records, resultA, resultB]);

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
    <div className="app-card overflow-hidden flex flex-col min-w-0">
      {/* Header + actions - matches Provider table, Data page */}
      <div className="shrink-0 border-b border-slate-200 px-5 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Compare scenarios</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Run two policy configurations on the same providers and compare results side-by-side.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {configValidation.errors.length > 0 && (
              <div className="w-full max-w-md p-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs">
                <span className="font-medium">Validation: </span>
                {configValidation.errors.slice(0, 3).join(' ')}
                {configValidation.errors.length > 3 && ` (+${configValidation.errors.length - 3} more)`}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={records.length === 0 || isRunning}
                className="app-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running...' : 'Run comparison'}
              </button>
              <div className="relative">
              <button
                type="button"
                onClick={() => setExportDropdownOpen((o) => !o)}
                disabled={!resultA || !resultB}
                className="app-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                Export
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setExportDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-20 app-card">
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
        </div>

        {/* Scenario configuration bar - matches filter bar pattern */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scenario A</span>
            <span className="text-sm text-slate-700">Current configuration</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scenario B</span>
            <select
              value={scenarioB}
              onChange={(e) => setScenarioB(e.target.value as ScenarioBValue)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-indigo-500/20 min-w-[200px]"
            >
              <optgroup label="Presets">
                {(Object.keys(SCENARIO_PRESET_LABELS) as ScenarioPresetId[]).map((id) => (
                  <option key={id} value={id}>
                    {SCENARIO_PRESET_LABELS[id]}
                  </option>
                ))}
              </optgroup>
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
            <button
              type="button"
              onClick={handleSaveAsScenario}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              title="Save current policy configuration as a named scenario for Scenario B"
            >
              Save current as scenario
            </button>
            <button
              type="button"
              onClick={handleSaveBAsScenario}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              title="Save Scenario B configuration as a new named scenario"
            >
              Save B as scenario
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Configure policies in Controls, then run a comparison. Use presets or save the current or Scenario B configuration as a named scenario.
        </p>
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
            scenarioALabel="Current configuration"
            scenarioBLabel={scenarioBLabel}
            selectedForCompare={selectedForCompare}
            onToggleCompare={setSelectedForCompare}
            hasRunComparison={!!resultA && !!resultB}
          />
          {compareModalOpen && selectedForCompare.length >= 2 && selectedForCompare.length <= 4 && (
            <ProviderCompareModal
              providerIds={selectedForCompare}
              records={records}
              marketResolver={marketResolver}
              experienceBands={experienceBands ?? []}
              onClose={() => setCompareModalOpen(false)}
              onClearSelection={() => setSelectedForCompare([])}
            />
          )}
        </div>
      )}
    </div>
  );
}
