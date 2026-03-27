import { useState, useMemo, useEffect } from 'react';
import { useParametersState } from '../../hooks/use-parameters-state';
import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';
import { useAppState } from '../../hooks/use-app-state';
import { useSelectedCycle } from '../../hooks/use-selected-cycle';
import { buildParameterOptions } from '../../lib/parameter-options';
import { buildMarketResolver } from '../../lib/joins';
import { loadSurveySpecialtyMappingSet, loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import { collectSurveyPickerIds, sortSurveyIdsByLabel } from '../../types/market-survey-config';
import { MeritMatrixTab } from './tabs/merit-matrix-tab';
import { ExperienceBandsTab } from './tabs/experience-bands-tab';
import { ReviewCyclesTab } from './tabs/review-cycles-tab';
import { BudgetTargetsTab } from './tabs/budget-targets-tab';
import { PolicyEngineRulesTab } from './tabs/policy-engine-rules-tab';
import { ProviderTypeSurveyTab } from './tabs/provider-type-survey-tab';
import { AppCombinedGroupsTab } from './tabs/app-combined-groups-tab';
import { ConversionFactorTab } from './tabs/conversion-factor-tab';
import { TccCalculationTab } from './tabs/tcc-calculation-tab';
import { PolicyCreateWizard } from './policy-create-wizard';
import type { AnnualIncreasePolicy } from '../../types/compensation-policy';
import { CompensationPlanType } from '../../types/enums';

type ParametersTabId =
  | 'review-cycles'
  | 'budget-targets'
  | 'tcc-calculation'
  | 'merit'
  | 'experience-bands'
  | 'conversion-factor'
  | 'provider-type-survey'
  | 'app-combined-groups'
  | 'policy-engine-rules';

type TabGroupId = 'cycle-budget' | 'mappings' | 'guardrails' | 'base-increases' | 'policy-library';

const TAB_GROUPS: { id: TabGroupId; label: string; subtitle?: string; tabs: { id: ParametersTabId; label: string }[] }[] = [
  {
    id: 'cycle-budget',
    label: 'Cycle & budget',
    subtitle: 'Cycles, budget targets, and how roster dollars roll up to Current TCC',
    tabs: [
      { id: 'review-cycles', label: 'Review cycles' },
      { id: 'budget-targets', label: 'Budget targets' },
      { id: 'tcc-calculation', label: 'Current TCC' },
    ],
  },
  {
    id: 'mappings',
    label: 'Mappings',
    subtitle: 'Provider type, survey routing, and survey map buckets',
    tabs: [
      { id: 'provider-type-survey', label: 'Type → Market' },
      { id: 'app-combined-groups', label: 'Survey map buckets' },
    ],
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    subtitle: 'Experience-based target ranges and review guardrails',
    tabs: [{ id: 'experience-bands', label: 'Experience band targets (review)' }],
  },
  {
    id: 'base-increases',
    label: 'Base increases',
    subtitle: 'Merit matrix and conversion factors',
    tabs: [
      { id: 'merit', label: 'Merit matrix' },
      { id: 'conversion-factor', label: 'CF by specialty' },
    ],
  },
  {
    id: 'policy-library',
    label: 'Policy library',
    subtitle: 'Rules that drive recommendations and governance',
    tabs: [{ id: 'policy-engine-rules', label: 'Policy library' }],
  },
];

function combinedGroupNamesFromSurveyMappings(
  set: ReturnType<typeof loadSurveySpecialtyMappingSet>
): string[] {
  const names = new Set<string>();
  for (const { appCombinedGroups } of Object.values(set)) {
    for (const g of appCombinedGroups ?? []) {
      const n = (g.combinedGroupName ?? '').trim();
      if (n) names.add(n);
    }
  }
  return [...names];
}

function getInitialTabFromUrl(): ParametersTabId {
  if (typeof window === 'undefined') return 'review-cycles';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'policy-engine') {
    const sub = params.get('sub');
    if (sub === 'rules' || sub === 'models' || sub === 'dashboard' || sub === 'simulator') return 'policy-engine-rules';
    return 'policy-engine-rules';
  }
  if (tab === 'cycle') return 'review-cycles';
  if (tab === 'budget') return 'budget-targets';
  if (tab === 'cycle-budget') return 'review-cycles';
  if (tab === 'tcc-calculation') return 'tcc-calculation';
  const valid: ParametersTabId[] = [
    'review-cycles',
    'budget-targets',
    'tcc-calculation',
    'merit',
    'experience-bands',
    'conversion-factor',
    'provider-type-survey',
    'app-combined-groups',
    'policy-engine-rules',
  ];
  if (tab && valid.includes(tab as ParametersTabId)) return tab as ParametersTabId;
  return 'review-cycles';
}

export type ParametersPageProps = Record<string, never>;

export function ParametersPage(_props: ParametersPageProps = {}) {
  const [activeTab, setActiveTab] = useState<ParametersTabId>(getInitialTabFromUrl);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [createPolicyWizardOpen, setCreatePolicyWizardOpen] = useState(false);
  const params = useParametersState();
  const policyState = usePolicyEngineState();
  const { records, marketSurveys, surveyMetadata } = useAppState();
  const [selectedCycleId] = useSelectedCycle(params.cycles);
  const surveySlotIdsForParameters = useMemo(() => {
    const m = loadProviderTypeToSurveyMapping();
    return sortSurveyIdsByLabel(collectSurveyPickerIds(marketSurveys, m), surveyMetadata);
  }, [marketSurveys, surveyMetadata]);
  const parameterOptions = useMemo(
    () => buildParameterOptions(records, Object.values(marketSurveys).flat()),
    [records, marketSurveys]
  );
  const experienceBandScopeHints = useMemo(() => {
    const planTypes = new Set<string>(Object.values(CompensationPlanType));
    for (const r of records) {
      const p = r.Compensation_Plan?.trim();
      if (p) planTypes.add(p);
    }
    const combinedNames = combinedGroupNamesFromSurveyMappings(loadSurveySpecialtyMappingSet());
    const specialtyOptions = [
      ...new Set([
        ...parameterOptions.specialties,
        ...parameterOptions.marketSpecialties,
        ...parameterOptions.benchmarkGroups,
        ...combinedNames,
      ]),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return {
      providerTypes: parameterOptions.providerTypes,
      planTypes: [...planTypes].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
      specialtyOptions,
    };
  }, [
    parameterOptions.benchmarkGroups,
    parameterOptions.marketSpecialties,
    parameterOptions.specialties,
    parameterOptions.providerTypes,
    records,
    marketSurveys,
  ]);
  const marketResolver = useMemo(
    () =>
      buildMarketResolver(marketSurveys, loadSurveySpecialtyMappingSet(), loadProviderTypeToSurveyMapping()),
    [marketSurveys]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const ruleId = params.get('ruleId');
    if ((tab === 'policy-engine' || tab === 'policy-engine-rules') && ruleId) {
      setActiveTab('policy-engine-rules');
      setSelectedRuleId(ruleId);
    }
  }, []);

  const activeGroup = useMemo(
    () => TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === activeTab)),
    [activeTab]
  );

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header + horizontal nav with dropdowns */}
      <div className="shrink-0 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Controls</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Set cycles, budgets, merit matrix, guardrails, mappings, and policy rules that drive
              annual salary increase recommendations.
            </p>
          </div>
        </div>

        <nav
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-2"
          aria-label="Parameters menu"
        >
          <div className="app-segmented-track w-fit min-w-0 flex flex-wrap">
            {TAB_GROUPS.map((group) => {
              const isActiveGroup = activeGroup?.id === group.id;
              const idx = TAB_GROUPS.findIndex((g) => g.id === group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    const inGroup = group.tabs.some((t) => t.id === activeTab);
                    if (!inGroup) setActiveTab(group.tabs[0].id);
                  }}
                  className={`app-segmented-segment shrink-0 ${idx === 0 ? 'rounded-l-full' : ''} ${
                    idx === TAB_GROUPS.length - 1 ? 'rounded-r-full' : ''
                  } ${isActiveGroup ? 'app-segmented-segment-active' : ''}`}
                  aria-current={isActiveGroup ? 'page' : undefined}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
          {activeGroup && activeGroup.tabs.length > 1 && (
            <div
              className="ml-auto flex w-fit shrink-0 flex-wrap justify-end gap-0.5 rounded-full border border-sky-200/80 bg-sky-50/90 p-0.5 shadow-inner shadow-sky-900/[0.04]"
              role="tablist"
              aria-label={`${activeGroup.label} sections`}
            >
              {activeGroup.tabs.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200 ${
                      selected
                        ? 'bg-white text-sky-900 shadow-sm ring-1 ring-sky-200/90'
                        : 'text-sky-900/55 hover:bg-white/70 hover:text-sky-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Content panel — full width */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${
            activeTab === 'policy-engine-rules'
              ? 'flex-1 min-h-0 overflow-visible min-h-fit'
              : 'shrink-0 w-full overflow-hidden'
          }`}
        >
          {activeTab === 'review-cycles' && (
            <ReviewCyclesTab
              cycles={params.cycles}
              setCycles={params.setCycles}
            />
          )}
          {activeTab === 'budget-targets' && (
            <BudgetTargetsTab
              cycles={params.cycles}
              budgetSettings={params.budgetSettings}
              setBudgetSettings={params.setBudgetSettings}
            />
          )}
          {activeTab === 'tcc-calculation' && (
            <TccCalculationTab
              settings={params.tccCalculationSettings}
              setSettings={params.setTccCalculationSettings}
            />
          )}
          {activeTab === 'merit' && <MeritMatrixTab {...params} />}
          {activeTab === 'experience-bands' && (
            <ExperienceBandsTab {...params} scopeListHints={experienceBandScopeHints} />
          )}
          {activeTab === 'conversion-factor' && (
            <ConversionFactorTab
              cfBySpecialty={params.cfBySpecialty}
              setCfBySpecialty={params.setCfBySpecialty}
              options={parameterOptions}
            />
          )}
          {activeTab === 'provider-type-survey' && (
            <ProviderTypeSurveyTab
              options={parameterOptions}
              surveyIds={surveySlotIdsForParameters}
              surveyMetadata={surveyMetadata}
            />
          )}
          {activeTab === 'app-combined-groups' && (
            <AppCombinedGroupsTab records={records} marketSurveys={marketSurveys} />
          )}
          {activeTab === 'policy-engine-rules' && (
            <PolicyEngineRulesTab
              policyState={policyState}
              records={records}
              parameterOptions={parameterOptions}
              selectedRuleId={selectedRuleId}
              onSelectRuleId={setSelectedRuleId}
              onStartCreatePolicy={() => setCreatePolicyWizardOpen(true)}
            />
          )}
        </div>
      </div>

      {createPolicyWizardOpen && (
        <PolicyCreateWizard
          onClose={() => setCreatePolicyWizardOpen(false)}
          onSaved={(policy: AnnualIncreasePolicy) => {
            setActiveTab('policy-engine-rules');
            setSelectedRuleId(policy.id);
          }}
          policyState={policyState}
          records={records}
          parameterOptions={parameterOptions}
          meritMatrixRows={params.meritMatrix}
          marketResolver={marketResolver}
          asOfDate={params.cycles.find((c) => c.id === selectedCycleId)?.effectiveDate}
        />
      )}
    </div>
  );
}
