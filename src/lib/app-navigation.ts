/**
 * Central app navigation: URL parsing, history (push/replace), and return labels.
 */

import type { AppView } from '../components/layout';
import type { ControlsTabId } from './controls-tab-url';
import {
  parseControlsFocusFromSearchParams,
  parseControlsRuleIdFromSearchParams,
  parseControlsTabFromSearchParams,
} from './controls-tab-url';

export type DataBrowserTab = 'provider' | 'market' | 'evaluation' | 'specialty-map' | 'custom' | 'audit';

export const APP_VIEWS: AppView[] = [
  'import',
  'data-browser',
  'specialty-map',
  'salary-review',
  'compare',
  'parameters',
  'help',
];

const DATA_BROWSER_TABS: DataBrowserTab[] = [
  'provider',
  'market',
  'evaluation',
  'specialty-map',
  'custom',
  'audit',
];

export interface AppLocation {
  view: AppView;
  dataTab?: DataBrowserTab;
  controlsTab?: ControlsTabId;
  focus?: string;
  ruleId?: string;
}

export interface NavHistoryState {
  returnLabel?: string;
}

export interface NavigateOptions {
  /** Replace current history entry instead of pushing (default: false). */
  replace?: boolean;
  /** Show a contextual back link to the current screen before navigating. */
  returnToCurrent?: boolean;
  /** Explicit back label (overrides auto label from current view). */
  returnLabel?: string;
}

const VIEW_LABELS: Record<AppView, string> = {
  import: 'Import data',
  'data-browser': 'Data browser',
  'specialty-map': 'Specialty map',
  'salary-review': 'Merit review',
  compare: 'Policy sandbox',
  parameters: 'Controls',
  help: 'Policy guide',
};

function isAppView(value: string): value is AppView {
  return APP_VIEWS.includes(value as AppView);
}

function isDataBrowserTab(value: string): value is DataBrowserTab {
  return DATA_BROWSER_TABS.includes(value as DataBrowserTab);
}

export function getViewLabel(view: AppView, location?: Partial<AppLocation>): string {
  const base = VIEW_LABELS[view];
  if (view === 'data-browser' && location?.dataTab) {
    const tabLabels: Record<DataBrowserTab, string> = {
      provider: 'Provider data',
      market: 'Market survey',
      evaluation: 'Evaluations',
      'specialty-map': 'Specialty map',
      custom: 'Custom data',
      audit: 'Audit log',
    };
    return `${base} · ${tabLabels[location.dataTab]}`;
  }
  return base;
}

export function parseAppLocation(href = typeof window !== 'undefined' ? window.location.href : 'http://local/#'): AppLocation {
  const u = new URL(href);
  const hashView = u.hash.slice(1).split('?')[0];
  const view = hashView && isAppView(hashView) ? hashView : 'import';
  const params = u.searchParams;

  const location: AppLocation = { view };

  if (view === 'data-browser') {
    const dataTab = params.get('dataTab');
    if (dataTab && isDataBrowserTab(dataTab)) location.dataTab = dataTab;
  }

  if (view === 'parameters') {
    const controlsTab = parseControlsTabFromSearchParams(params);
    if (controlsTab) location.controlsTab = controlsTab;
    const focus = parseControlsFocusFromSearchParams(params);
    if (focus) location.focus = focus;
    const ruleId = parseControlsRuleIdFromSearchParams(params);
    if (ruleId) location.ruleId = ruleId;
  }

  return location;
}

export function buildAppUrl(location: AppLocation, href = typeof window !== 'undefined' ? window.location.href : 'http://local/'): string {
  const u = new URL(href);
  u.searchParams.delete('tab');
  u.searchParams.delete('focus');
  u.searchParams.delete('ruleId');
  u.searchParams.delete('dataTab');
  u.searchParams.delete('sub');
  u.hash = `#${location.view}`;

  if (location.view === 'parameters') {
    if (location.controlsTab) u.searchParams.set('tab', location.controlsTab);
    if (location.focus) u.searchParams.set('focus', location.focus);
    if (location.ruleId) u.searchParams.set('ruleId', location.ruleId);
  }

  if (location.view === 'data-browser' && location.dataTab) {
    u.searchParams.set('dataTab', location.dataTab);
  }

  return `${u.pathname}${u.search}${u.hash}`;
}

export function readNavReturnLabel(): string | null {
  if (typeof window === 'undefined') return null;
  const state = window.history.state as NavHistoryState | null;
  return state?.returnLabel ?? null;
}

export function applyAppLocationToHistory(
  location: AppLocation,
  mode: 'push' | 'replace',
  historyState?: NavHistoryState | null
): void {
  if (typeof window === 'undefined') return;
  const url = buildAppUrl(location);
  const state = historyState ?? (mode === 'replace' ? window.history.state : null);
  if (mode === 'push') {
    window.history.pushState(state, '', url);
  } else {
    window.history.replaceState(state, '', url);
  }
}

export function navigateAppLocation(
  target: AppLocation,
  options: NavigateOptions = {},
  currentHref = typeof window !== 'undefined' ? window.location.href : 'http://local/#import'
): NavHistoryState | null {
  const current = parseAppLocation(currentHref);
  const mode = options.replace ? 'replace' : 'push';

  let historyState: NavHistoryState | null = null;
  if (mode === 'push') {
    const returnLabel =
      options.returnLabel ??
      (options.returnToCurrent ? getViewLabel(current.view, current) : undefined);
    if (returnLabel) historyState = { returnLabel };
  }

  applyAppLocationToHistory(target, mode, historyState);
  return historyState;
}

/** Map workflow / legacy navigate(view, tab?) to AppLocation. */
export function appLocationFromViewTab(view: AppView, tab?: ControlsTabId): AppLocation {
  const location: AppLocation = { view };
  if (view === 'parameters' && tab) location.controlsTab = tab;
  return location;
}

/** Map data-browser navigation with optional tab. */
export function appLocationForDataBrowser(dataTab?: DataBrowserTab): AppLocation {
  return { view: 'data-browser', ...(dataTab ? { dataTab } : {}) };
}
