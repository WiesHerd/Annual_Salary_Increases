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
  | 'policy-engine-rules';

type TabGroupId = 'cycle-budget' | 'base-increases' | 'mappings' | 'guardrails';

const TAB_GROUPS: { id: TabGroupId; label: string; subtitle?: string; tabs: { id: ParametersTabId; label: string }[] }[] = [
  {
    id: 'cycle-budget',
    label: 'Cycle & budget',
    subtitle: 'Cycles and budget targets used in Salary review',
    tabs: [
      { id: 'cycle', label: 'Cycle settings' },
      { id: 'budget', label: 'Budget settings' },
    ],
  },
  {
    id: 'base-increases',
    label: 'Base increases',
    subtitle: 'Merit matrix, conversion factors, and policy rules',
    tabs: [
      { id: 'merit', label: 'Merit matrix' },
      { id: 'conversion-factor', label: 'Conversion factor by specialty' },
      { id: 'policy-engine-rules', label: 'Policy library' },
    ],
  },
  {
    id: 'mappings',
    label: 'Mappings',
    subtitle: 'Provider type and survey mappings',
    tabs: [{ id: 'provider-type-survey', label: 'Provider type → Market survey' }],
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    subtitle: 'Experience-based target ranges and review guardrails',
    tabs: [{ id: 'experience-bands', label: 'Experience band targets (review)' }],
  },
];

function getInitialTabFromUrl(): ParametersTabId {
  if (typeof window === 'undefined') return 'cycle';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'policy-engine') {
    const sub = params.get('sub');
    if (sub === 'rules' || sub === 'models' || sub === 'dashboard' || sub === 'simulator') return 'policy-engine-rules';
    return 'policy-engine-rules';
  }
  const valid: ParametersTabId[] = ['cycle', 'merit', 'experience-bands', 'conversion-factor', 'provider-type-survey', 'budget', 'policy-engine-rules'];
  if (tab && valid.includes(tab as ParametersTabId)) return tab as ParametersTabId;
  return 'cycle';
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
    if ((tab === 'policy-engine' || tab === 'policy-engine-rules') && ruleId) {
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
          ref={dropdownRef}
          className="relative z-50 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5"
          aria-label="Parameters menu"
        >
          {TAB_GROUPS.map((group) => {
            const isOpen = openDropdownId === group.id;
            return (
              <div key={group.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdownId(isOpen ? null : group.id)}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 transition-colors"
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
                            ? 'bg-slate-100 text-slate-900 font-medium'
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
      </div>

      {/* Content panel — full width */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className={`flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${
            activeTab === 'policy-engine-rules' ? 'overflow-visible min-h-fit' : 'overflow-hidden'
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
