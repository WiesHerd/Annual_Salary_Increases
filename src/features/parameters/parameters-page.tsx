import { useState, useMemo, useEffect, useCallback } from 'react';

import { useParametersState } from '../../hooks/use-parameters-state';

import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';

import { useAppState } from '../../hooks/use-app-state';

import { useSelectedCycle } from '../../hooks/use-selected-cycle';

import { buildParameterOptions } from '../../lib/parameter-options';

import { buildMarketResolver } from '../../lib/joins';

import { loadSurveySpecialtyMappingSet, loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';

import { collectSurveyPickerIds, sortSurveyIdsByLabel } from '../../types/market-survey-config';

import {

  type ControlsTabId,

  getInitialControlsTab,

  parseControlsFocusFromSearchParams,

  parseControlsRuleIdFromSearchParams,

  parseControlsTabFromSearchParams,

  saveLastControlsTab,

  syncControlsTabToUrl,

} from '../../lib/controls-tab-url';

import { ControlsActionSearch } from '../../components/controls-action-search';

import type { ControlsAction } from '../../lib/controls-actions';

import { useAppNavigation } from '../../context/app-navigation-context';

import { computeControlsReadiness } from '../../lib/controls-readiness';

import { ControlsReadinessStrip } from '../../components/controls-readiness-strip';

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



type TabGroupId = 'cycle-budget' | 'mappings' | 'experience-equity' | 'base-increases' | 'policy-library';



const TAB_GROUPS: { id: TabGroupId; label: string; subtitle?: string; tabs: { id: ControlsTabId; label: string }[] }[] = [

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

    id: 'experience-equity',

    label: 'Experience & equity',

    subtitle: 'Where providers should sit vs market — band targets and Apply equity settings',

    tabs: [{ id: 'experience-bands', label: 'Experience bands & equity' }],

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

    label: 'Policies',

    subtitle: 'Rules that set default increase % (exclusions, models, merit matrix, caps)',

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



export function ParametersPage() {
  const { navigateToView } = useAppNavigation();

  const [activeTab, setActiveTabState] = useState<ControlsTabId>(getInitialControlsTab);

  const [controlsFocus, setControlsFocus] = useState<string | null>(() => {

    if (typeof window === 'undefined') return null;

    return parseControlsFocusFromSearchParams(new URLSearchParams(window.location.search));

  });

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(() => {

    if (typeof window === 'undefined') return null;

    return parseControlsRuleIdFromSearchParams(new URLSearchParams(window.location.search));

  });

  const [createPolicyWizardOpen, setCreatePolicyWizardOpen] = useState(false);

  const params = useParametersState();

  const policyState = usePolicyEngineState();

  const { records, marketSurveys, surveyMetadata } = useAppState();

  const [selectedCycleId] = useSelectedCycle();



  const setActiveTab = useCallback((tab: ControlsTabId) => {

    setActiveTabState(tab);

    saveLastControlsTab(tab);

  }, []);



  useEffect(() => {

    syncControlsTabToUrl(activeTab, selectedRuleId, controlsFocus);

  }, [activeTab, selectedRuleId, controlsFocus]);



  useEffect(() => {

    const onPopState = () => {

      const searchParams = new URLSearchParams(window.location.search);

      const tab = parseControlsTabFromSearchParams(searchParams);

      if (tab) setActiveTabState(tab);

      setSelectedRuleId(parseControlsRuleIdFromSearchParams(searchParams));

      setControlsFocus(parseControlsFocusFromSearchParams(searchParams));

    };

    window.addEventListener('popstate', onPopState);

    return () => window.removeEventListener('popstate', onPopState);

  }, []);



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



  const readinessItems = useMemo(

    () => {

      const mapping = loadProviderTypeToSurveyMapping();

      const mappingCount = Object.values(mapping).filter((v) => (v ?? '').trim().length > 0).length;

      return computeControlsReadiness({

        recordsCount: records.length,

        cycles: params.cycles,

        meritMatrix: params.meritMatrix,

        policies: policyState.policies,

        mappingCount,

      });

    },

    [records.length, params.cycles, params.meritMatrix, policyState.policies]

  );



  const asOfDate = useMemo(

    () => params.cycles.find((c) => c.id === selectedCycleId)?.effectiveDate,

    [params.cycles, selectedCycleId]

  );



  const activeGroup = useMemo(

    () => TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === activeTab)),

    [activeTab]

  );



  const handleSelectRuleId = useCallback((id: string | null) => {

    setSelectedRuleId(id);

  }, []);



  const handleControlsAction = useCallback(

    (action: ControlsAction) => {

      if (action.kind === 'navigate-view' && action.appView) {

        navigateToView(action.appView, { returnToCurrent: true });

        return;

      }

      if (action.tabId) setActiveTab(action.tabId);

      setControlsFocus(action.focus ?? null);

      if (action.kind === 'open-policy-wizard') setCreatePolicyWizardOpen(true);

    },

    [navigateToView, setActiveTab]

  );



  const clearControlsFocus = useCallback(() => setControlsFocus(null), []);



  return (

    <div className="flex flex-col min-h-0 flex-1">

      <div className="shrink-0 mb-6">

        <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">

          <div className="min-w-0 flex-1">

            <h2 className="text-xl font-semibold text-slate-800">Controls</h2>

            <p className="text-sm text-slate-600 mt-0.5 max-w-2xl">

              Manage compensation cycle settings, market positioning, increase policies, and related mappings.

            </p>

          </div>

          <ControlsActionSearch onSelectAction={handleControlsAction} className="lg:mt-0.5" />

        </div>

        {activeTab !== 'policy-engine-rules' && (
          <ControlsReadinessStrip
            items={readinessItems}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />
        )}



        <nav

          className="flex w-full flex-wrap items-center gap-x-3 gap-y-2"

          aria-label="Controls menu"

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

              className="ml-auto flex w-fit shrink-0 flex-wrap justify-end gap-0.5 rounded-full border border-slate-200 bg-slate-100/90 p-0.5 shadow-inner shadow-slate-900/[0.03]"

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

                        ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-slate-200/90'

                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'

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

            <ExperienceBandsTab

              {...params}

              scopeListHints={experienceBandScopeHints}

              initialFocus={controlsFocus === 'equity' ? 'equity' : undefined}

              onFocusConsumed={clearControlsFocus}

            />

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

              onSelectRuleId={handleSelectRuleId}

              onStartCreatePolicy={() => setCreatePolicyWizardOpen(true)}

              meritMatrixRows={params.meritMatrix}

              marketResolver={marketResolver}

              asOfDate={asOfDate}

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

          asOfDate={asOfDate}

        />

      )}

    </div>

  );

}

