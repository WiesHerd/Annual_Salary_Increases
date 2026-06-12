/**
 * Searchable Controls actions — Workday-style “what do you want to do?” index.
 */

import { token_set_ratio } from 'fuzzball';
import type { ControlsTabId } from './controls-tab-url';
import type { AppView } from '../components/layout';

export type ControlsActionGroup =
  | 'Pay & equity'
  | 'Policies'
  | 'Cycle & budget'
  | 'Data & mappings'
  | 'Go to';

export type ControlsActionKind = 'tab' | 'open-policy-wizard' | 'navigate-view';

export interface ControlsAction {
  id: string;
  title: string;
  subtitle: string;
  /** Breadcrumb shown in search results, e.g. "Experience & equity" */
  breadcrumb: string;
  group: ControlsActionGroup;
  keywords: string[];
  kind: ControlsActionKind;
  tabId?: ControlsTabId;
  /** URL focus segment (e.g. equity panel on experience bands) */
  focus?: string;
  appView?: AppView;
}

export const CONTROLS_ACTIONS: ControlsAction[] = [
  {
    id: 'experience-bands',
    title: 'Set up experience bands',
    subtitle: 'Define YOE ranges and target TCC percentile or dollar ranges for merit review.',
    breadcrumb: 'Experience & equity',
    group: 'Pay & equity',
    keywords: ['experience', 'band', 'yoe', 'tenure', 'target', 'percentile', 'guardrail', 'positioning', 'market'],
    kind: 'tab',
    tabId: 'experience-bands',
  },
  {
    id: 'equity-suggestions',
    title: 'Configure equity suggestions (Apply equity)',
    subtitle: 'Choose target point, gap %, caps, and how base is back-solved when below band.',
    breadcrumb: 'Experience & equity → Equity settings',
    group: 'Pay & equity',
    keywords: ['equity', 'apply equity', 'internal equity', 'below target', 'suggestion', 'increase', 'band alignment'],
    kind: 'tab',
    tabId: 'experience-bands',
    focus: 'equity',
  },
  {
    id: 'merit-matrix',
    title: 'Set up merit matrix',
    subtitle: 'Default increase % by evaluation score and performance category.',
    breadcrumb: 'Base increases',
    group: 'Pay & equity',
    keywords: ['merit', 'matrix', 'evaluation', 'score', 'performance', 'default increase', 'percent'],
    kind: 'tab',
    tabId: 'merit',
  },
  {
    id: 'conversion-factor',
    title: 'Set conversion factors by specialty',
    subtitle: 'CF values used in productivity and TCC calculations.',
    breadcrumb: 'Base increases',
    group: 'Pay & equity',
    keywords: ['cf', 'conversion', 'factor', 'wrvu', 'productivity', 'specialty'],
    kind: 'tab',
    tabId: 'conversion-factor',
  },
  {
    id: 'create-policy',
    title: 'Create a new policy',
    subtitle: 'Open the policy wizard to add exclusions, custom models, modifiers, or caps.',
    breadcrumb: 'Policy library',
    group: 'Policies',
    keywords: ['create', 'new', 'policy', 'rule', 'wizard', 'set up policy', 'add policy'],
    kind: 'open-policy-wizard',
    tabId: 'policy-engine-rules',
  },
  {
    id: 'policy-library',
    title: 'Manage policy library',
    subtitle: 'View, edit, and order rules that drive default increase recommendations.',
    breadcrumb: 'Policy library',
    group: 'Policies',
    keywords: ['policy', 'library', 'rules', 'engine', 'pipeline', 'fmv', 'exclusion', 'modifier', 'cap', 'floor'],
    kind: 'tab',
    tabId: 'policy-engine-rules',
  },
  {
    id: 'fmv-exclusion',
    title: 'Add FMV / high-TCC exclusion',
    subtitle: 'Zero out or flag increases when TCC is above market threshold (policy stage: Exclusions).',
    breadcrumb: 'Policy library → Exclusions',
    group: 'Policies',
    keywords: ['fmv', 'fair market', '75th', '90th', 'high tcc', 'exclusion', 'guardrail', 'zero', 'cap percentile'],
    kind: 'open-policy-wizard',
    tabId: 'policy-engine-rules',
  },
  {
    id: 'review-cycles',
    title: 'Configure review cycles',
    subtitle: 'Merit cycle dates, labels, and effective dates.',
    breadcrumb: 'Cycle & budget',
    group: 'Cycle & budget',
    keywords: ['cycle', 'fiscal', 'fy', 'review cycle', 'year'],
    kind: 'tab',
    tabId: 'review-cycles',
  },
  {
    id: 'budget-targets',
    title: 'Set budget targets',
    subtitle: 'Cycle budget amount and warning / hard-stop thresholds.',
    breadcrumb: 'Cycle & budget',
    group: 'Cycle & budget',
    keywords: ['budget', 'pool', 'dollars', 'hard stop', 'warning', 'threshold'],
    kind: 'tab',
    tabId: 'budget-targets',
  },
  {
    id: 'tcc-calculation',
    title: 'Configure how Current TCC is calculated',
    subtitle: 'Which pay components roll into total cash compensation on the roster.',
    breadcrumb: 'Cycle & budget',
    group: 'Cycle & budget',
    keywords: ['tcc', 'total cash', 'calculation', 'components', 'supplemental'],
    kind: 'tab',
    tabId: 'tcc-calculation',
  },
  {
    id: 'provider-type-survey',
    title: 'Map provider types to market surveys',
    subtitle: 'Route each provider type to the right market benchmark file.',
    breadcrumb: 'Mappings',
    group: 'Data & mappings',
    keywords: ['provider type', 'survey', 'market', 'mapping', 'benchmark'],
    kind: 'tab',
    tabId: 'provider-type-survey',
  },
  {
    id: 'survey-buckets',
    title: 'Configure survey map buckets',
    subtitle: 'Combined groups for specialty market mapping.',
    breadcrumb: 'Mappings',
    group: 'Data & mappings',
    keywords: ['survey map', 'bucket', 'combined', 'specialty map', 'group'],
    kind: 'tab',
    tabId: 'app-combined-groups',
  },
  {
    id: 'go-merit-review',
    title: 'Open merit review',
    subtitle: 'Review providers, apply equity, and approve increases.',
    breadcrumb: 'Merit review',
    group: 'Go to',
    keywords: ['merit', 'review', 'salary', 'approve', 'table', 'providers'],
    kind: 'navigate-view',
    appView: 'salary-review',
  },
  {
    id: 'go-import',
    title: 'Import provider data',
    subtitle: 'Upload roster, market, and evaluation files.',
    breadcrumb: 'Import data',
    group: 'Go to',
    keywords: ['import', 'upload', 'csv', 'xlsx', 'data', 'roster'],
    kind: 'navigate-view',
    appView: 'import',
  },
  {
    id: 'go-policy-help',
    title: 'Read policy guide',
    subtitle: 'How the policy pipeline works and when to use each stage.',
    breadcrumb: 'Policy guide',
    group: 'Go to',
    keywords: ['help', 'guide', 'how', 'pipeline', 'documentation'],
    kind: 'navigate-view',
    appView: 'help',
  },
];

const MIN_SCORE = 42;

function actionSearchBlob(action: ControlsAction): string {
  return [action.title, action.subtitle, action.breadcrumb, action.group, ...action.keywords].join(' ');
}

/** Rank actions by fuzzy match against user query. Empty query returns curated defaults. */
export function searchControlsActions(query: string, limit = 8): ControlsAction[] {
  const q = query.trim();
  if (!q) {
    return CONTROLS_ACTIONS.filter((a) =>
      ['equity-suggestions', 'create-policy', 'experience-bands', 'merit-matrix', 'policy-library', 'go-merit-review'].includes(
        a.id
      )
    );
  }

  const scored = CONTROLS_ACTIONS.map((action) => ({
    action,
    score: token_set_ratio(q, actionSearchBlob(action)),
  }))
    .filter((x) => x.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.action);
}

export const CONTROLS_ACTION_GROUP_ORDER: ControlsActionGroup[] = [
  'Pay & equity',
  'Policies',
  'Cycle & budget',
  'Data & mappings',
  'Go to',
];
