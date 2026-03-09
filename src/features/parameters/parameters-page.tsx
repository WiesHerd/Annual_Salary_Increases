import { useState, useMemo } from 'react';
import { useParametersState } from '../../hooks/use-parameters-state';
import { useAppState } from '../../hooks/use-app-state';
import { buildParameterOptions } from '../../lib/parameter-options';
import { CycleSettingsTab } from './tabs/cycle-settings-tab';
import { MeritMatrixTab } from './tabs/merit-matrix-tab';
import { ExperienceBandsTab } from './tabs/experience-bands-tab';
import { PcpTierTab } from './tabs/pcp-tier-tab';
import { PcpAppRulesTab } from './tabs/pcp-app-rules-tab';
import { PlanAssignmentTab } from './tabs/plan-assignment-tab';
import { AppBenchmarkTab } from './tabs/app-benchmark-tab';
import { BudgetSettingsTab } from './tabs/budget-settings-tab';

type ParametersTabId =
  | 'cycle'
  | 'merit'
  | 'experience-bands'
  | 'pcp-tier'
  | 'pcp-app'
  | 'plan-assignment'
  | 'app-benchmark'
  | 'budget';

type TabGroupId = 'cycle-budget' | 'merit-experience' | 'plans-rules';

const TAB_GROUPS: { id: TabGroupId; label: string; tabs: { id: ParametersTabId; label: string }[] }[] = [
  {
    id: 'cycle-budget',
    label: 'Cycle & budget',
    tabs: [
      { id: 'cycle', label: 'Cycle Settings' },
      { id: 'budget', label: 'Budget Settings' },
    ],
  },
  {
    id: 'merit-experience',
    label: 'Merit & experience',
    tabs: [
      { id: 'merit', label: 'Merit Matrix / PEVL Scores' },
      { id: 'experience-bands', label: 'Experience Band Target Ranges' },
    ],
  },
  {
    id: 'plans-rules',
    label: 'Plans & rules',
    tabs: [
      { id: 'pcp-tier', label: 'PCP Physician Tier Settings' },
      { id: 'pcp-app', label: 'PCP APP Fixed Target / CF Settings' },
      { id: 'plan-assignment', label: 'Plan Assignment Rules' },
      { id: 'app-benchmark', label: 'APP Benchmark Mapping' },
    ],
  },
];

export function ParametersPage() {
  const [activeTab, setActiveTab] = useState<ParametersTabId>('cycle');
  const params = useParametersState();
  const { records, marketData } = useAppState();
  const parameterOptions = useMemo(
    () => buildParameterOptions(records, marketData),
    [records, marketData]
  );

  return (
    <div className="flex flex-col min-h-0">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Control Panel</h2>
        <p className="text-sm text-slate-600 mt-1">Compensation inputs and control mechanisms. Manage cycles, budgets, merit rules, and plan settings without code changes.</p>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        {/* Grouped sidebar: Cycle & budget, Merit & experience, Plans & rules */}
        <nav
          className="w-60 shrink-0 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
          aria-label="Control Panel sections"
        >
          {TAB_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-indigo-100 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)] overflow-hidden">
          {activeTab === 'cycle' && <CycleSettingsTab {...params} />}
          {activeTab === 'merit' && <MeritMatrixTab {...params} />}
          {activeTab === 'experience-bands' && <ExperienceBandsTab {...params} />}
          {activeTab === 'pcp-tier' && <PcpTierTab {...params} options={parameterOptions} />}
          {activeTab === 'pcp-app' && <PcpAppRulesTab {...params} options={parameterOptions} />}
          {activeTab === 'plan-assignment' && <PlanAssignmentTab {...params} options={parameterOptions} />}
          {activeTab === 'app-benchmark' && <AppBenchmarkTab {...params} options={parameterOptions} />}
          {activeTab === 'budget' && <BudgetSettingsTab {...params} cycles={params.cycles} />}
        </div>
      </div>
    </div>
  );
}
