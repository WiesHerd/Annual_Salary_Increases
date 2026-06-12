/**
 * Guided first-run checklist: import → configure → merit review.
 */

import { useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import type { AppView } from './layout';
import type { ControlsTabId } from '../lib/controls-tab-url';
import {
  computeWorkflowSteps,
  dismissWorkflowChecklist,
  isWorkflowChecklistDismissed,
  workflowProgress,
  type WorkflowChecklistInput,
  type WorkflowStep,
} from '../lib/workflow-checklist';
import { cn } from '../lib/utils';

export interface WorkflowChecklistProps extends WorkflowChecklistInput {
  onNavigate: (view: AppView, tab?: ControlsTabId) => void;
  className?: string;
  /** Hide when all required setup steps (excluding review) are done */
  hideWhenSetupComplete?: boolean;
}

function StepButton({
  step,
  onNavigate,
}: {
  step: WorkflowStep;
  onNavigate: WorkflowChecklistProps['onNavigate'];
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(step.navigateTo.view, step.navigateTo.tab)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        step.ready
          ? 'bg-emerald-50/80 hover:bg-emerald-50'
          : 'bg-white hover:bg-slate-50 ring-1 ring-slate-200/80'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
          step.ready
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white text-slate-400'
        )}
        aria-hidden
      >
        {step.ready ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-medium',
            step.ready ? 'text-emerald-900' : 'text-slate-800'
          )}
        >
          {step.label}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{step.detail}</span>
      </span>
      {!step.ready && (
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
          aria-hidden
        />
      )}
    </button>
  );
}

export function WorkflowChecklist({
  onNavigate,
  className,
  hideWhenSetupComplete = false,
  ...input
}: WorkflowChecklistProps) {
  const [dismissed, setDismissed] = useState(isWorkflowChecklistDismissed);

  const steps = computeWorkflowSteps({
    recordsCount: input.recordsCount,
    marketRowCount: input.marketRowCount,
    cycles: input.cycles,
    meritMatrix: input.meritMatrix,
    policies: input.policies,
    mappingCount: input.mappingCount,
    budgetSettings: input.budgetSettings,
    selectedCycleId: input.selectedCycleId,
    hasReviewedProviders: input.hasReviewedProviders,
  });
  const { complete, total } = workflowProgress(steps);
  const setupSteps = steps.filter((s) => s.id !== 'review');
  const setupComplete = setupSteps.every((s) => s.ready);

  if (dismissed) return null;
  if (hideWhenSetupComplete && setupComplete) return null;
  if (complete === total) return null;

  const handleDismiss = () => {
    dismissWorkflowChecklist();
    setDismissed(true);
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-sm',
        className
      )}
      aria-label="Getting started checklist"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Getting started</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {complete} of {total} steps complete — follow the path from import to merit review.
          </p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${(complete / total) * 100}%` }}
              role="progressbar"
              aria-valuenow={complete}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="Setup progress"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/80 hover:text-slate-600"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <StepButton step={step} onNavigate={onNavigate} />
          </li>
        ))}
      </ol>
    </section>
  );
}
