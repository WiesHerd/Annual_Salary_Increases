import { Check } from 'lucide-react';
import type { ControlsReadinessItem, ControlsReadinessId } from '../lib/controls-readiness';
import { controlsReadinessProgress } from '../lib/controls-readiness';
import type { ControlsTabId } from '../lib/controls-tab-url';
import { useAppNavigation } from '../context/app-navigation-context';

interface ControlsReadinessStripProps {
  items: ControlsReadinessItem[];
  activeTab: ControlsTabId;
  onSelectTab: (tabId: ControlsTabId) => void;
}

const SHORT_LABELS: Record<ControlsReadinessId, string> = {
  data: 'Import',
  cycle: 'Cycle',
  matrix: 'Matrix',
  mappings: 'Mappings',
  policies: 'Policies',
};

function readinessIdForTab(tab: ControlsTabId): ControlsReadinessId | null {
  switch (tab) {
    case 'review-cycles':
    case 'budget-targets':
    case 'tcc-calculation':
      return 'cycle';
    case 'merit':
    case 'conversion-factor':
      return 'matrix';
    case 'provider-type-survey':
    case 'app-combined-groups':
      return 'mappings';
    case 'policy-engine-rules':
      return 'policies';
    default:
      return null;
  }
}

export function ControlsReadinessStrip({
  items,
  activeTab,
  onSelectTab,
}: ControlsReadinessStripProps) {
  const { navigateToView } = useAppNavigation();
  const activeReadinessId = readinessIdForTab(activeTab);
  const { complete, total } = controlsReadinessProgress(items);

  function handleClick(item: ControlsReadinessItem) {
    if (item.id === 'data') {
      navigateToView('import', { returnToCurrent: true });
      return;
    }
    if (item.tabId) onSelectTab(item.tabId);
  }

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 pt-3 text-xs"
      role="status"
      aria-label={`Merit setup progress: ${complete} of ${total} complete`}
    >
      <span className="shrink-0 font-medium text-slate-500">Merit setup</span>
      <span className="shrink-0 tabular-nums text-slate-400">
        {complete}/{total}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isActive = activeReadinessId === item.id;
          const isClickable = item.id === 'data' || item.tabId != null;
          const title = `${item.label} — ${item.detail}`;

          const inner = (
            <>
              {item.ready ? (
                <Check className="h-3 w-3 shrink-0 text-indigo-600" strokeWidth={2.5} aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden />
              )}
              <span>{SHORT_LABELS[item.id]}</span>
            </>
          );

          const className = [
            'inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
            isActive ? 'font-semibold text-indigo-800' : item.ready ? 'text-slate-600' : 'text-slate-500',
            isClickable
              ? 'cursor-pointer hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1'
              : '',
          ].join(' ');

          return (
            <span key={item.id} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <span className="select-none text-slate-300" aria-hidden>
                  ·
                </span>
              )}
              {isClickable ? (
                <button type="button" className={className} title={title} onClick={() => handleClick(item)}>
                  {inner}
                </button>
              ) : (
                <span className={className} title={title}>
                  {inner}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
