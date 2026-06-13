/**
 * Numbered horizontal stepper — indigo UI accent (brand green reserved for logo / import CTAs).
 */

import type { ReactNode } from 'react';

export type StepperStepState = 'complete' | 'active' | 'upcoming' | 'attention';

export interface HorizontalStepperStep {
  id: string;
  label: string;
  state: StepperStepState;
  caption?: string;
  onClick?: () => void;
}

interface HorizontalStepperProps {
  steps: HorizontalStepperStep[];
  activeStepId?: string | null;
  ariaLabel: string;
  className?: string;
  /** Show short label under each step circle (recommended for wizards). */
  showStepLabels?: boolean;
  /** When false, parent renders the active-step caption (e.g. with a help popover). */
  showActiveCaption?: boolean;
}

const STEP_INNER =
  'flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors';

function innerCircleClass(state: StepperStepState): string {
  switch (state) {
    case 'active':
      return `${STEP_INNER} bg-indigo-600 text-white`;
    case 'complete':
      return `${STEP_INNER} bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200`;
    case 'attention':
      return `${STEP_INNER} bg-amber-50 text-amber-900`;
    default:
      return `${STEP_INNER} bg-slate-100 text-slate-500 group-hover:bg-slate-200`;
  }
}

function outerWrapClass(state: StepperStepState): string {
  switch (state) {
    case 'active':
      return 'rounded-full p-[3px] bg-indigo-200 shrink-0';
    case 'attention':
      return 'rounded-full p-[3px] bg-amber-200 shrink-0';
    default:
      return 'shrink-0';
  }
}

function connectorClass(leftState: StepperStepState, rightState: StepperStepState): string {
  if (leftState === 'complete' || leftState === 'active') return 'bg-indigo-200';
  if (rightState === 'complete' || rightState === 'active') return 'bg-indigo-100';
  return 'bg-slate-200';
}

function StepCircle({
  step,
  index,
  isCurrent,
  children,
}: {
  step: HorizontalStepperStep;
  index: number;
  isCurrent: boolean;
  children: ReactNode;
}) {
  const Tag = step.onClick ? 'button' : 'span';
  const needsHalo = step.state === 'active' || step.state === 'attention';

  const circle = (
    <Tag
      type={step.onClick ? 'button' : undefined}
      onClick={step.onClick}
      title={step.caption ? `${step.label} — ${step.caption}` : step.label}
      className={`group ${innerCircleClass(step.state)} ${
        step.onClick
          ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1'
          : ''
      }`}
      aria-current={isCurrent ? 'step' : undefined}
      aria-label={`Step ${index + 1}: ${step.label}`}
    >
      {children}
    </Tag>
  );

  if (needsHalo) {
    return <div className={outerWrapClass(step.state)}>{circle}</div>;
  }
  return circle;
}

export function HorizontalStepper({
  steps,
  activeStepId = null,
  ariaLabel,
  className = '',
  showStepLabels = false,
  showActiveCaption = true,
}: HorizontalStepperProps) {
  const resolvedActiveId =
    activeStepId ?? steps.find((s) => s.state === 'active')?.id ?? steps[0]?.id ?? null;
  const activeStep = steps.find((s) => s.id === resolvedActiveId);

  return (
    <div className={className}>
      <nav
        className="flex items-center gap-1 overflow-x-auto overflow-y-visible py-1"
        aria-label={ariaLabel}
      >
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const next = steps[i + 1];
          const labelClass =
            step.id === resolvedActiveId
              ? 'text-indigo-700 font-semibold'
              : step.state === 'complete'
                ? 'text-indigo-600'
                : 'text-slate-500';

          return (
            <div key={step.id} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1 min-w-[4.25rem] max-w-[6.25rem]">
                <StepCircle step={step} index={i} isCurrent={step.id === resolvedActiveId}>
                  {i + 1}
                </StepCircle>
                {showStepLabels && (
                  <span
                    className={`text-[10px] leading-tight text-center line-clamp-2 ${labelClass}`}
                    title={step.caption ? `${step.label} — ${step.caption}` : step.label}
                  >
                    {step.label}
                  </span>
                )}
              </div>
              {!isLast && next && (
                <div
                  className={`w-6 sm:w-10 h-0.5 mx-0.5 shrink-0 self-start mt-[1.125rem] ${connectorClass(step.state, next.state)}`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </nav>
      {showActiveCaption && activeStep && !showStepLabels && (
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          {activeStep.label}
          {activeStep.caption ? ` · ${activeStep.caption}` : ''}
        </p>
      )}
      {showActiveCaption && activeStep && showStepLabels && activeStep.caption && (
        <p className="mt-2 text-xs text-slate-500 leading-snug">{activeStep.caption}</p>
      )}
    </div>
  );
}

export function horizontalStepperStepsFromLabels(
  items: {
    id: string;
    label: string;
    caption?: string;
    ready: boolean;
    onClick?: () => void;
    attention?: boolean;
  }[],
  activeId?: string | null
): HorizontalStepperStep[] {
  return items.map((item) => {
    let state: StepperStepState = 'upcoming';
    if (item.attention && !item.ready) state = 'attention';
    else if (item.id === activeId) state = 'active';
    else if (item.ready) state = 'complete';
    return {
      id: item.id,
      label: item.label,
      state,
      caption: item.caption,
      onClick: item.onClick,
    };
  });
}
