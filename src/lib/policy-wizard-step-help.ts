import type { StepContextHelpContent } from '../components/step-context-help';

export const POLICY_EDIT_STEP_HELP: Record<string, StepContextHelpContent> = {
  basics: {
    title: 'Setup',
    summary: 'Name the rule and place it in the merit pipeline before you define who it applies to.',
    bullets: [
      'Use a clear name and short description so others recognize it next cycle.',
      'Stage sets when this rule runs — exclusions first, then modifiers, then caps.',
      'Priority orders rules within the same stage; Fallback runs only if nothing else matched.',
    ],
    example: '“High wRVU +0.5%” — Modifier stage, Highest priority.',
  },
  target: {
    title: 'Who',
    summary: 'Narrow which providers are eligible. Leave everything blank to include the full merit cycle.',
    bullets: [
      'Division, specialty, and provider type are optional filters.',
      'YOE and percentile ranges further limit the population.',
      'Scope is inclusive — providers must match all filters you set.',
    ],
    example: 'Pediatrics division only, or YOE 3–10.',
  },
  conditions: {
    title: 'When',
    summary: 'Add extra logic on top of scope. Empty conditions mean every in-scope provider qualifies.',
    bullets: [
      'Build rules from roster fields — productivity, evaluation score, comp plan, etc.',
      'Combine with AND or OR when you add more than one condition.',
      'The summary line shows the rule in plain English.',
    ],
    example: 'wRVU percentile > 60.',
  },
  actions: {
    title: 'What',
    summary: 'Define the merit outcome when this rule matches — increase, cap, review flag, or audit note.',
    bullets: [
      'Modifiers typically add % or a lump-sum $ on top of the base merit result.',
      'Caps and floors limit the final increase; zero out blocks an increase.',
      'Reason codes and labels are stored for audit — they do not change the math.',
    ],
    example: 'Add increase 0.5%, or Add lump-sum $5,000.',
  },
};

export const POLICY_CREATE_STEP_CAPTIONS: Record<string, string> = {
  type: 'Choose a template — stage and defaults are pre-filled',
  target: 'Optional population filters — blank means all providers',
  conditions: 'Optional match rules — blank means everyone in scope',
  action: 'Set the increase, tiers, or guardrail outcome',
  priority: 'Order relative to other policies in this stage',
  preview: 'Check scope and sample impact before saving',
  save: 'Name the policy and add it to your library',
};

export const POLICY_CREATE_STEP_HELP: Record<string, StepContextHelpContent> = {
  type: {
    title: 'Policy type',
    summary: 'Pick a starting template. You can adjust targeting and actions in the next steps.',
    bullets: [
      'Each card sets the pipeline stage and default actions for you.',
      'Guardrails and modifiers are the most common choices for merit cycles.',
      'YOE tier templates define band tables instead of a single % action.',
    ],
    example: 'Choose Modifier for a productivity-based add-on.',
  },
  target: {
    title: 'Target population',
    summary: 'Optional filters for who can receive this policy. Blank fields mean all providers.',
    bullets: [
      'Match division, specialty, or provider type from your roster.',
      'Use ranges for years of experience or market percentiles.',
    ],
    example: 'Limit to Hospital Medicine providers.',
  },
  conditions: {
    title: 'Conditions',
    summary: 'Optional extra criteria before the policy applies.',
    bullets: [
      'Leave empty to apply to everyone in scope.',
      'Use AND/OR when combining multiple criteria.',
    ],
    example: 'Evaluation score at least 4.',
  },
  action: {
    title: 'Actions',
    summary: 'What the policy does when it matches — or tier rows for YOE-based models.',
    bullets: [
      'Adjust the default actions from your template if needed.',
      'For tier models, define YOE bands and increase % or base salary per band.',
    ],
    example: 'Add increase 1% for high productivity.',
  },
  priority: {
    title: 'Priority',
    summary: 'How this policy competes with others in the same pipeline stage.',
    bullets: [
      'Higher priority runs before lower within the stage.',
      'Fallback applies only when no other policy set a result.',
    ],
    example: 'Highest priority for a hard guardrail.',
  },
  preview: {
    title: 'Preview',
    summary: 'See how many providers match and whether recommendations would change.',
    bullets: [
      'Review in-scope count before saving.',
      'Check sample changes to spot unintended impact.',
    ],
  },
  save: {
    title: 'Save',
    summary: 'Name the policy and add it to your active rule library.',
    bullets: [
      'Use a name you will recognize in Merit review and next year’s cycle.',
      'Fix any validation errors before saving.',
    ],
  },
};
