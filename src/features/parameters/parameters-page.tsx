import { useState, useMemo, useEffect, useRef } from 'react';
import { useParametersState } from '../../hooks/use-parameters-state';
import { usePolicyEngineState } from '../../hooks/use-policy-engine-state';
import { useAppState } from '../../hooks/use-app-state';
import { useSelectedCycle } from '../../hooks/use-selected-cycle';
import { buildParameterOptions } from '../../lib/parameter-options';
import { buildMarketResolver } from '../../lib/joins';
import { loadSurveySpecialtyMappingSet, loadProviderTypeToSurveyMapping } from '../../lib/parameters-storage';
import { CycleSettingsTab } from './tabs/cycle-settings-tab';
import { MeritMatrixTab } from './tabs/merit-matrix-tab';
import { ExperienceBandsTab } from './tabs/experience-bands-tab';
import { BudgetSettingsTab } from './tabs/budget-settings-tab';
import { PolicyEngineRulesTab } from './tabs/policy-engine-rules-tab';
import { PolicyEngineDashboardTab } from './tabs/policy-engine-dashboard-tab';
import { PolicyEngineSimulatorTab } from './tabs/policy-engine-simulator-tab';
import { ProviderTypeSurveyTab } from './tabs/provider-type-survey-tab';
import { ConversionFactorTab } from './tabs/conversion-factor-tab';
import { PolicyCreateWizard } from './policy-create-wizard';
import type { AnnualIncreasePolicy } from '../../types/compensation-policy';

type ParametersTabId =
  | 'cycle'
  | 'merit'
  | 'experience-bands'
  | 'conversion-factor'
  | 'provider-type-survey'
  | 'budget'
  | 'policy-engine-rules'
  | 'policy-engine-dashboard'
  | 'policy-engine-simulator';

type TabGroupId = 'cycle-budget' | 'base-increases' | 'mappings' | 'guardrails' | 'policy-engine';

const TAB_GROUPS: { id: TabGroupId; label: string; subtitle?: string; tabs: { id: ParametersTabId; label: string }[] }[] = [
  {
    id: 'cycle-budget',
    label: 'Cycle & budget',
    tabs: [
      { id: 'cycle', label: 'Cycle settings' },
      { id: 'budget', label: 'Budget settings' },
    ],
  },
  {
    id: 'base-increases',
    label: 'Base increases',
    tabs: [
      { id: 'merit', label: 'Merit matrix' },
      { id: 'conversion-factor', label: 'Conversion factor by specialty' },
    ],
  },
  {
    id: 'mappings',
    label: 'Mappings',
    tabs: [{ id: 'provider-type-survey', label: 'Provider type → Market survey' }],
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    tabs: [{ id: 'experience-bands', label: 'Experience band targets (review)' }],
  },
  {
    id: 'policy-engine',
    label: 'Compensation Policy Engine',
    subtitle: 'How salary increases are determined',
    tabs: [
      { id: 'policy-engine-dashboard', label: 'Dashboard' },
      { id: 'policy-engine-rules', label: 'Policy library' },
      { id: 'policy-engine-simulator', label: 'Simulator' },
    ],
  },
];

function getGroupForTab(tabId: ParametersTabId): TabGroupId {
  for (const g of TAB_GROUPS) {
    if (g.tabs.some((t) => t.id === tabId)) return g.id;
  }
  return 'cycle-budget';
}

function getInitialTabFromUrl(): ParametersTabId {
  if (typeof window === 'undefined') return 'cycle';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'policy-engine') {
    const sub = params.get('sub');
    if (sub === 'dashboard') return 'policy-engine-dashboard';
    if (sub === 'simulator') return 'policy-engine-simulator';
    if (sub === 'rules' || sub === 'models') return 'policy-engine-rules';
    return 'policy-engine-rules';
  }
  const valid: ParametersTabId[] = ['cycle', 'merit', 'experience-bands', 'conversion-factor', 'provider-type-survey', 'budget', 'policy-engine-rules', 'policy-engine-dashboard', 'policy-engine-simulator'];
  if (tab && valid.includes(tab as ParametersTabId)) return tab as ParametersTabId;
  return 'cycle';
}

export function ParametersPage() {
  const [activeTab, setActiveTab] = useState<ParametersTabId>(getInitialTabFromUrl);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [createPolicyWizardOpen, setCreatePolicyWizardOpen] = useState(false);
  const params = useParametersState();
  const policyState = usePolicyEngineState();
  const { records, marketSurveys, surveyMetadata } = useAppState();
  const [selectedCycleId] = useSelectedCycle(params.cycles);
  const parameterOptions = useMemo(
    () => buildParameterOptions(records, Object.values(marketSurveys).flat()),
    [records, marketSurveys]
  );
  const marketResolver = useMemo(
    () =>
      buildMarketResolver(marketSurveys, loadSurveySpecialtyMappingSet(), loadProviderTypeToSurveyMapping()),
    [marketSurveys]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const ruleId = params.get('ruleId');
    if (tab === 'policy-engine' && ruleId) {
      setActiveTab('policy-engine-rules');
      setSelectedRuleId(ruleId);
    }
  }, []);

  const [openDropdownId, setOpenDropdownId] = useState<TabGroupId | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentGroup = getGroupForTab(activeTab);
  const currentTabLabel = TAB_GROUPS.flatMap((g) => g.tabs).find((t) => t.id === activeTab)?.label ?? '';

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header + horizontal nav with dropdowns */}
      <div className="shrink-0 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Control Panel</h2>
            <p className="text-sm text-slate-600 mt-0.5">Compensation inputs and policy configuration. Manage cycles, budgets, merit matrix, and the Compensation Policy Engine.</p>
          </div>
        </div>

        <nav
          ref={dropdownRef}
          className="relative z-50 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 px-2 py-1.5"
          aria-label="Parameters menu"
        >
          {TAB_GROUPS.map((group) => {
            const isOpen = openDropdownId === group.id;
            const isActive = currentGroup === group.id;
            return (
              <div key={group.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdownId(isOpen ? null : group.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
                  }`}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  <span>{group.label}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div
                    className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                    role="menu"
                  >
                    {group.tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setOpenDropdownId(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Breadcrumb / current section */}
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <span>
            {TAB_GROUPS.find((g) => g.id === currentGroup)?.label}
            {TAB_GROUPS.find((g) => g.id === currentGroup)?.subtitle != null && (
              <span className="text-slate-400 font-normal"> — {TAB_GROUPS.find((g) => g.id === currentGroup)?.subtitle}</span>
            )}
          </span>
          <span aria-hidden>/</span>
          <span className="text-slate-700 font-medium">{currentTabLabel}</span>
        </div>
      </div>

      {/* Content panel — full width */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className={`flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${
            activeTab === 'policy-engine-rules' || activeTab === 'policy-engine-simulator' ? 'overflow-visible min-h-fit' : 'overflow-hidden'
          }`}
        >
          {activeTab === 'cycle' && <CycleSettingsTab {...params} />}
          {activeTab === 'merit' && <MeritMatrixTab {...params} />}
          {activeTab === 'experience-bands' && <ExperienceBandsTab {...params} />}
          {activeTab === 'conversion-factor' && (
            <ConversionFactorTab
              cfBySpecialty={params.cfBySpecialty}
              setCfBySpecialty={params.setCfBySpecialty}
              options={parameterOptions}
            />
          )}
          {activeTab === 'provider-type-survey' && <ProviderTypeSurveyTab options={parameterOptions} surveyIds={Object.keys(marketSurveys)} surveyMetadata={surveyMetadata} />}
          {activeTab === 'budget' && <BudgetSettingsTab {...params} cycles={params.cycles} />}
          {activeTab === 'policy-engine-dashboard' && (
            <PolicyEngineDashboardTab
              meritMatrix={params.meritMatrix}
              policyState={policyState}
              onStartCreatePolicy={() => setCreatePolicyWizardOpen(true)}
            />
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
          {activeTab === 'policy-engine-simulator' && (
            <PolicyEngineSimulatorTab
              policyState={policyState}
              params={params}
              records={records}
              marketResolver={marketResolver}
              asOfDate={params.cycles.find((c) => c.id === selectedCycleId)?.effectiveDate}
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
