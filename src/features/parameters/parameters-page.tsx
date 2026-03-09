import { useState } from 'react';
import { useParametersState } from '../../hooks/use-parameters-state';
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

const TABS: { id: ParametersTabId; label: string }[] = [
  { id: 'cycle', label: 'Cycle Settings' },
  { id: 'merit', label: 'Merit Matrix / PEVL Scores' },
  { id: 'experience-bands', label: 'Experience Band Target Ranges' },
  { id: 'pcp-tier', label: 'PCP Physician Tier Settings' },
  { id: 'pcp-app', label: 'PCP APP Fixed Target / CF Settings' },
  { id: 'plan-assignment', label: 'Plan Assignment Rules' },
  { id: 'app-benchmark', label: 'APP Benchmark Mapping' },
  { id: 'budget', label: 'Budget Settings' },
];

export function ParametersPage() {
  const [activeTab, setActiveTab] = useState<ParametersTabId>('cycle');
  const params = useParametersState();

  return (
    <div className="flex flex-col min-h-0">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Parameters</h2>
        <p className="text-sm text-slate-600 mt-1">Manage annual rules and settings without code changes.</p>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        {/* Vertical sidebar: all sections visible, no horizontal scroll */}
        <nav
          className="w-56 shrink-0 flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5"
          aria-label="Parameter sections"
        >
          {TABS.map((tab) => (
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
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-indigo-100 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.07)] overflow-hidden">
          {activeTab === 'cycle' && <CycleSettingsTab {...params} />}
          {activeTab === 'merit' && <MeritMatrixTab {...params} />}
          {activeTab === 'experience-bands' && <ExperienceBandsTab {...params} />}
          {activeTab === 'pcp-tier' && <PcpTierTab {...params} />}
          {activeTab === 'pcp-app' && <PcpAppRulesTab {...params} />}
          {activeTab === 'plan-assignment' && <PlanAssignmentTab {...params} />}
          {activeTab === 'app-benchmark' && <AppBenchmarkTab {...params} />}
          {activeTab === 'budget' && <BudgetSettingsTab {...params} />}
        </div>
      </div>
    </div>
  );
}
