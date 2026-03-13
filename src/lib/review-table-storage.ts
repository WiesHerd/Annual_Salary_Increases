/**
 * Persist salary review table column visibility and view preset to localStorage.
 */

import {
  REVIEW_TABLE_COLUMNS,
  REVIEW_VIEW_PRESETS,
  DEFAULT_PRESET_ORDER,
  type ReviewTableColumnId,
  type ReviewViewPresetId,
  type SavedCustomView,
  getDefaultVisibleColumnIds,
  getDefaultColumnWidths,
} from '../features/review/review-table-columns';

const STORAGE_KEY_COLUMNS = 'salary-review-visible-columns';
const STORAGE_KEY_PRESET = 'salary-review-view-preset';
const STORAGE_KEY_SAVED_VIEWS = 'salary-review-saved-custom-views';
const STORAGE_KEY_ACTIVE_CUSTOM_VIEW = 'salary-review-active-custom-view-id';
const STORAGE_KEY_COLUMN_WIDTHS = 'salary-review-column-widths';
const STORAGE_KEY_FROZEN_COLUMNS = 'salary-review-frozen-columns';
const STORAGE_KEY_PRESET_LABELS = 'salary-review-preset-labels';
const STORAGE_KEY_PRESET_ORDER = 'salary-review-preset-order';

const MAX_SAVED_CUSTOM_VIEWS = 10;
const COLUMN_WIDTH_MIN = 80;
const COLUMN_WIDTH_MAX = 400;

const VALID_PRESET_IDS = new Set<ReviewViewPresetId | 'custom'>(['meeting', 'full', 'comp', 'policy', 'custom']);
const VALID_COLUMN_IDS = new Set<ReviewTableColumnId>(
  REVIEW_TABLE_COLUMNS.map((c) => c.id)
);

export type { SavedCustomView };

export interface ReviewTableStorage {
  visibleColumnIds: ReviewTableColumnId[];
  preset: ReviewViewPresetId | 'custom';
  savedCustomViews: SavedCustomView[];
  activeCustomViewId: string | null;
  columnWidths: Record<ReviewTableColumnId, number>;
  frozenColumnIds: ReviewTableColumnId[];
  /** Custom labels for preset buttons; only stored keys override defaults. */
  presetLabels: Partial<Record<ReviewViewPresetId, string>>;
  /** Order of preset buttons; must contain all four preset IDs. */
  presetOrder: ReviewViewPresetId[];
}

function parseColumnIds(raw: unknown): ReviewTableColumnId[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = raw.filter((id): id is ReviewTableColumnId => typeof id === 'string' && VALID_COLUMN_IDS.has(id as ReviewTableColumnId));
  if (ids.length === 0) return null;
  return ids;
}

function parsePreset(raw: unknown): ReviewViewPresetId | 'custom' | null {
  if (typeof raw !== 'string' || !VALID_PRESET_IDS.has(raw as ReviewViewPresetId | 'custom')) return null;
  return raw as ReviewViewPresetId | 'custom';
}

function parseColumnWidths(raw: unknown): Record<ReviewTableColumnId, number> | null {
  if (raw == null || typeof raw !== 'object') return null;
  const defaultWidths = getDefaultColumnWidths();
  const out = { ...defaultWidths };
  let hasValid = false;
  for (const id of VALID_COLUMN_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[id as ReviewTableColumnId] = Math.max(COLUMN_WIDTH_MIN, Math.min(COLUMN_WIDTH_MAX, v));
      hasValid = true;
    }
  }
  return hasValid ? out : null;
}

function parseFrozenColumnIds(raw: unknown): ReviewTableColumnId[] {
  if (!Array.isArray(raw)) return ['compareCheckbox', 'providerName'] as ReviewTableColumnId[];
  const ids = raw.filter((id): id is ReviewTableColumnId => typeof id === 'string' && VALID_COLUMN_IDS.has(id as ReviewTableColumnId));
  return (ids.length > 0 ? ids : ['compareCheckbox', 'providerName']) as ReviewTableColumnId[];
}

function parseSavedCustomViews(raw: unknown): SavedCustomView[] {
  if (!Array.isArray(raw)) return [];
  const views: SavedCustomView[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const { id, name, columnIds: rawIds } = item as { id?: unknown; name?: unknown; columnIds?: unknown };
    if (typeof id !== 'string' || typeof name !== 'string') continue;
    const columnIds = parseColumnIds(rawIds);
    if (!columnIds || columnIds.length === 0) continue;
    views.push({ id, name: name.trim() || id, columnIds });
  }
  return views.slice(0, MAX_SAVED_CUSTOM_VIEWS);
}

function parsePresetLabels(raw: unknown): Partial<Record<ReviewViewPresetId, string>> {
  if (raw == null || typeof raw !== 'object') return {};
  const out: Partial<Record<ReviewViewPresetId, string>> = {};
  const obj = raw as Record<string, unknown>;
  for (const id of DEFAULT_PRESET_ORDER) {
    const v = obj[id];
    if (typeof v === 'string' && v.trim().length > 0) out[id] = v.trim();
  }
  return out;
}

function parsePresetOrder(raw: unknown): ReviewViewPresetId[] {
  if (!Array.isArray(raw) || raw.length !== 4) return [...DEFAULT_PRESET_ORDER];
  const ids = raw.filter((id): id is ReviewViewPresetId => typeof id === 'string' && (id === 'meeting' || id === 'full' || id === 'comp' || id === 'policy'));
  const set = new Set(ids);
  if (set.size !== 4) return [...DEFAULT_PRESET_ORDER];
  for (const id of DEFAULT_PRESET_ORDER) {
    if (!set.has(id)) return [...DEFAULT_PRESET_ORDER];
  }
  return ids;
}

const defaultPresetLabels: Partial<Record<ReviewViewPresetId, string>> = {};
const defaultPresetOrder = [...DEFAULT_PRESET_ORDER];

/** Load saved column visibility and preset from localStorage. Falls back to full preset if missing or invalid. */
export function loadReviewTableFromStorage(): ReviewTableStorage {
  const defaultWidths = getDefaultColumnWidths();
  try {
    const rawColumns = localStorage.getItem(STORAGE_KEY_COLUMNS);
    const rawPreset = localStorage.getItem(STORAGE_KEY_PRESET);
    const rawSavedViews = localStorage.getItem(STORAGE_KEY_SAVED_VIEWS);
    const rawActiveViewId = localStorage.getItem(STORAGE_KEY_ACTIVE_CUSTOM_VIEW);
    const rawColumnWidths = localStorage.getItem(STORAGE_KEY_COLUMN_WIDTHS);
    const rawFrozenColumns = localStorage.getItem(STORAGE_KEY_FROZEN_COLUMNS);
    const rawPresetLabels = localStorage.getItem(STORAGE_KEY_PRESET_LABELS);
    const rawPresetOrder = localStorage.getItem(STORAGE_KEY_PRESET_ORDER);
    const columnIds = rawColumns ? parseColumnIds(JSON.parse(rawColumns)) : null;
    const preset = rawPreset ? parsePreset(JSON.parse(rawPreset)) : null;
    const savedCustomViews = rawSavedViews ? parseSavedCustomViews(JSON.parse(rawSavedViews)) : [];
    const columnWidths = rawColumnWidths ? parseColumnWidths(JSON.parse(rawColumnWidths)) ?? defaultWidths : defaultWidths;
    const frozenColumnIds = rawFrozenColumns ? parseFrozenColumnIds(JSON.parse(rawFrozenColumns)) : (['compareCheckbox', 'providerName'] as ReviewTableColumnId[]);
    const presetLabels = rawPresetLabels ? parsePresetLabels(JSON.parse(rawPresetLabels)) : defaultPresetLabels;
    const presetOrder = rawPresetOrder ? parsePresetOrder(JSON.parse(rawPresetOrder)) : defaultPresetOrder;
    let activeId: string | null = null;
    if (typeof rawActiveViewId === 'string' && rawActiveViewId) {
      try {
        const parsed = JSON.parse(rawActiveViewId) as string;
        if (typeof parsed === 'string' && parsed && savedCustomViews.some((v) => v.id === parsed)) {
          activeId = parsed;
        }
      } catch {
        // ignore
      }
    }

    const base = { savedCustomViews, activeCustomViewId: activeId, columnWidths, frozenColumnIds, presetLabels, presetOrder };
    if (columnIds && columnIds.length > 0) {
      return {
        visibleColumnIds: columnIds,
        preset: preset ?? 'custom',
        ...base,
      };
    }
    const presetId = preset && preset !== 'custom' ? preset : 'full';
    return {
      visibleColumnIds: [...REVIEW_VIEW_PRESETS[presetId]],
      preset: presetId,
      ...base,
    };
  } catch {
    return {
      visibleColumnIds: getDefaultVisibleColumnIds(),
      preset: 'full',
      savedCustomViews: [],
      activeCustomViewId: null,
      columnWidths: defaultWidths,
      frozenColumnIds: ['compareCheckbox', 'providerName'] as ReviewTableColumnId[],
      presetLabels: defaultPresetLabels,
      presetOrder: defaultPresetOrder,
    };
  }
}

/** Save column visibility and preset to localStorage. */
export function saveReviewTableToStorage(state: ReviewTableStorage): void {
  try {
    const columnWidths = state.columnWidths ?? getDefaultColumnWidths();
    const frozenColumnIds = state.frozenColumnIds ?? ['providerName'];
    const presetLabels = state.presetLabels ?? defaultPresetLabels;
    const presetOrder = state.presetOrder ?? defaultPresetOrder;
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(state.visibleColumnIds));
    localStorage.setItem(STORAGE_KEY_PRESET, JSON.stringify(state.preset));
    localStorage.setItem(STORAGE_KEY_SAVED_VIEWS, JSON.stringify(state.savedCustomViews));
    localStorage.setItem(
      STORAGE_KEY_ACTIVE_CUSTOM_VIEW,
      JSON.stringify(state.activeCustomViewId ?? '')
    );
    localStorage.setItem(STORAGE_KEY_COLUMN_WIDTHS, JSON.stringify(columnWidths));
    localStorage.setItem(STORAGE_KEY_FROZEN_COLUMNS, JSON.stringify(frozenColumnIds));
    localStorage.setItem(STORAGE_KEY_PRESET_LABELS, JSON.stringify(presetLabels));
    localStorage.setItem(STORAGE_KEY_PRESET_ORDER, JSON.stringify(presetOrder));
  } catch {
    // ignore
  }
}
