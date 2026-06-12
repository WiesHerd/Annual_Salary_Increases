/**
 * First-run workflow progress: import → configure → merit review.
 */

import type { MeritMatrixRow } from '../types/merit-matrix-row';
import type { Cycle } from '../types/cycle';
import type { AnnualIncreasePolicy } from '../types/compensation-policy';
import type { BudgetSettingsRow } from '../types/budget-settings';
import type { AppView } from '../components/layout';
import type { ControlsTabId } from './controls-tab-url';

export type WorkflowStepId =
  | 'providers'
  | 'market'
  | 'cycle'
  | 'mappings'
  | 'matrix'
  | 'budget'
  | 'policies'
  | 'review';

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  detail: string;
  ready: boolean;
  /** Primary navigation target when user clicks the step */
  navigateTo: { view: AppView; tab?: ControlsTabId };
}

export interface WorkflowChecklistInput {
  recordsCount: number;
  marketRowCount: number;
  cycles: Cycle[];
  meritMatrix: MeritMatrixRow[];
  policies: AnnualIncreasePolicy[];
  mappingCount: number;
  budgetSettings: BudgetSettingsRow[];
  selectedCycleId: string | null;
  hasReviewedProviders: boolean;
}

export function computeWorkflowSteps(input: WorkflowChecklistInput): WorkflowStep[] {
  const {
    recordsCount,
    marketRowCount,
    cycles,
    meritMatrix,
    policies,
    mappingCount,
    budgetSettings,
    selectedCycleId,
    hasReviewedProviders,
  } = input;

  const activePolicies = policies.filter((p) => p.status === 'active');
  const matrixReady = meritMatrix.some(
    (row) =>
      (row.defaultIncreasePercent != null && row.defaultIncreasePercent > 0) ||
      (row.performanceLabel?.trim()?.length ?? 0) > 0
  );
  const budgetReady =
    selectedCycleId != null &&
    budgetSettings.some(
      (b) =>
        b.cycleId === selectedCycleId &&
        b.budgetTargetAmount != null &&
        Number.isFinite(b.budgetTargetAmount) &&
        b.budgetTargetAmount > 0
    );

  return [
    {
      id: 'providers',
      label: 'Import provider roster',
      detail: recordsCount > 0 ? `${recordsCount} provider${recordsCount === 1 ? '' : 's'}` : 'Upload CSV or Excel',
      ready: recordsCount > 0,
      navigateTo: { view: 'import' },
    },
    {
      id: 'market',
      label: 'Import market survey',
      detail:
        marketRowCount > 0
          ? `${marketRowCount} specialty row${marketRowCount === 1 ? '' : 's'}`
          : 'Benchmark percentiles',
      ready: marketRowCount > 0,
      navigateTo: { view: 'import' },
    },
    {
      id: 'cycle',
      label: 'Set review cycle',
      detail: cycles.length > 0 ? `${cycles.length} cycle${cycles.length === 1 ? '' : 's'}` : 'Define merit cycle',
      ready: cycles.length > 0,
      navigateTo: { view: 'parameters', tab: 'review-cycles' },
    },
    {
      id: 'mappings',
      label: 'Map provider types to surveys',
      detail: mappingCount > 0 ? `${mappingCount} route${mappingCount === 1 ? '' : 's'}` : 'Type → market survey',
      ready: mappingCount > 0,
      navigateTo: { view: 'parameters', tab: 'provider-type-survey' },
    },
    {
      id: 'matrix',
      label: 'Configure merit matrix',
      detail: matrixReady ? `${meritMatrix.length} row${meritMatrix.length === 1 ? '' : 's'}` : 'Score → increase %',
      ready: matrixReady,
      navigateTo: { view: 'parameters', tab: 'merit' },
    },
    {
      id: 'budget',
      label: 'Set cycle budget',
      detail: budgetReady ? 'Budget target set' : 'Optional but recommended',
      ready: budgetReady,
      navigateTo: { view: 'parameters', tab: 'budget-targets' },
    },
    {
      id: 'policies',
      label: 'Add policy rules',
      detail:
        activePolicies.length > 0
          ? `${activePolicies.length} active`
          : policies.length > 0
            ? `${policies.length} inactive`
            : 'Guardrails & custom models',
      ready: activePolicies.length > 0,
      navigateTo: { view: 'parameters', tab: 'policy-engine-rules' },
    },
    {
      id: 'review',
      label: 'Run merit review',
      detail: hasReviewedProviders ? 'In progress' : 'Review increases & export',
      ready: hasReviewedProviders,
      navigateTo: { view: 'salary-review' },
    },
  ];
}

export function workflowProgress(steps: WorkflowStep[]): { complete: number; total: number } {
  const complete = steps.filter((s) => s.ready).length;
  return { complete, total: steps.length };
}

export const WORKFLOW_CHECKLIST_DISMISS_KEY = 'meritly-workflow-checklist-dismissed';

export function isWorkflowChecklistDismissed(): boolean {
  try {
    return localStorage.getItem(WORKFLOW_CHECKLIST_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissWorkflowChecklist(): void {
  try {
    localStorage.setItem(WORKFLOW_CHECKLIST_DISMISS_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function resetWorkflowChecklistDismiss(): void {
  try {
    localStorage.removeItem(WORKFLOW_CHECKLIST_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
