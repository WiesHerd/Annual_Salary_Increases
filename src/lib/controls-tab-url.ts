/**
 * Controls (Parameters) tab routing: URL query params + last-tab persistence.
 */

export type ControlsTabId =
  | 'review-cycles'
  | 'budget-targets'
  | 'tcc-calculation'
  | 'merit'
  | 'experience-bands'
  | 'conversion-factor'
  | 'provider-type-survey'
  | 'app-combined-groups'
  | 'policy-engine-rules';

export const CONTROLS_TAB_IDS: ControlsTabId[] = [
  'review-cycles',
  'budget-targets',
  'tcc-calculation',
  'merit',
  'experience-bands',
  'conversion-factor',
  'provider-type-survey',
  'app-combined-groups',
  'policy-engine-rules',
];

export const CONTROLS_DEFAULT_TAB: ControlsTabId = 'policy-engine-rules';

const LAST_TAB_STORAGE_KEY = 'meritly-controls-last-tab';

function isControlsTabId(value: string | null | undefined): value is ControlsTabId {
  return value != null && CONTROLS_TAB_IDS.includes(value as ControlsTabId);
}

/** Map legacy ?tab= values to current tab ids. */
export function parseControlsTabFromSearchParams(params: URLSearchParams): ControlsTabId | null {
  const tab = params.get('tab');
  if (!tab) return null;
  if (tab === 'policy-engine' || tab === 'policy-engine-rules') return 'policy-engine-rules';
  if (tab === 'cycle' || tab === 'cycle-budget') return 'review-cycles';
  if (tab === 'budget') return 'budget-targets';
  if (isControlsTabId(tab)) return tab;
  const sub = params.get('sub');
  if (tab === 'policy-engine' && (sub === 'rules' || sub === 'models' || sub === 'dashboard' || sub === 'simulator')) {
    return 'policy-engine-rules';
  }
  return null;
}

export function loadLastControlsTab(): ControlsTabId | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LAST_TAB_STORAGE_KEY);
    return isControlsTabId(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveLastControlsTab(tab: ControlsTabId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_TAB_STORAGE_KEY, tab);
  } catch {
    /* ignore quota errors */
  }
}

export function getInitialControlsTab(): ControlsTabId {
  if (typeof window === 'undefined') return CONTROLS_DEFAULT_TAB;
  const params = new URLSearchParams(window.location.search);
  return parseControlsTabFromSearchParams(params) ?? loadLastControlsTab() ?? CONTROLS_DEFAULT_TAB;
}

export function parseControlsFocusFromSearchParams(params: URLSearchParams): string | null {
  return params.get('focus');
}

export function syncControlsTabToUrl(
  tab: ControlsTabId,
  ruleId?: string | null,
  focus?: string | null
): void {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  u.searchParams.set('tab', tab);
  if (tab === 'policy-engine-rules' && ruleId) {
    u.searchParams.set('ruleId', ruleId);
  } else {
    u.searchParams.delete('ruleId');
  }
  if (focus) {
    u.searchParams.set('focus', focus);
  } else {
    u.searchParams.delete('focus');
  }
  u.searchParams.delete('sub');
  window.history.replaceState(window.history.state, '', `${u.pathname}${u.search}${u.hash}`);
}

export function parseControlsRuleIdFromSearchParams(params: URLSearchParams): string | null {
  const tab = params.get('tab');
  if (tab === 'policy-engine' || tab === 'policy-engine-rules') {
    return params.get('ruleId');
  }
  return null;
}
