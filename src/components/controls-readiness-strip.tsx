import { useMemo } from 'react';
import type { ControlsReadinessItem } from '../lib/controls-readiness';
import type { ControlsTabId } from '../lib/controls-tab-url';
import { HorizontalStepper, horizontalStepperStepsFromLabels } from './horizontal-stepper';
import { useAppNavigation } from '../context/app-navigation-context';

interface ControlsReadinessStripProps {
  items: ControlsReadinessItem[];
  activeTab: ControlsTabId;
  onSelectTab: (tabId: ControlsTabId) => void;
}

function readinessIdForTab(tab: ControlsTabId): ControlsReadinessItem['id'] | null {
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

  const steps = useMemo(
    () =>
      horizontalStepperStepsFromLabels(
        items.map((item) => {
          const isClickable = item.id === 'data' || item.tabId != null;
          return {
            id: item.id,
            label: item.label,
            caption: item.detail,
            ready: item.ready,
            attention: !item.ready,
            onClick: isClickable
              ? () => {
                  if (item.id === 'data') navigateToView('import', { returnToCurrent: true });
                  else if (item.tabId) onSelectTab(item.tabId);
                }
              : undefined,
          };
        }),
        activeReadinessId
      ),
    [items, activeReadinessId, navigateToView, onSelectTab]
  );

  return (
    <HorizontalStepper
      steps={steps}
      activeStepId={activeReadinessId}
      ariaLabel="Configuration progress"
      className="mb-4 px-1"
    />
  );
}
