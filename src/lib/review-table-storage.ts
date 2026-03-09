/**
 * Persist salary review table column visibility and view preset to localStorage.
 */

import {
  REVIEW_TABLE_COLUMNS,
  REVIEW_VIEW_PRESETS,
  type ReviewTableColumnId,
  type ReviewViewPresetId,
  getDefaultVisibleColumnIds,
} from '../features/review/review-table-columns';

const STORAGE_KEY_COLUMNS = 'salary-review-visible-columns';
const STORAGE_KEY_PRESET = 'salary-review-view-preset';

const VALID_PRESET_IDS = new Set<ReviewViewPresetId | 'custom'>(['meeting', 'full', 'comp', 'custom']);
const VALID_COLUMN_IDS = new Set<ReviewTableColumnId>(
  REVIEW_TABLE_COLUMNS.map((c) => c.id)
);

export interface ReviewTableStorage {
  visibleColumnIds: ReviewTableColumnId[];
  preset: ReviewViewPresetId | 'custom';
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

/** Load saved column visibility and preset from localStorage. Falls back to full preset if missing or invalid. */
export function loadReviewTableFromStorage(): ReviewTableStorage {
  try {
    const rawColumns = localStorage.getItem(STORAGE_KEY_COLUMNS);
    const rawPreset = localStorage.getItem(STORAGE_KEY_PRESET);
    const columnIds = rawColumns ? parseColumnIds(JSON.parse(rawColumns)) : null;
    const preset = rawPreset ? parsePreset(JSON.parse(rawPreset)) : null;
    if (columnIds && columnIds.length > 0) {
      return {
        visibleColumnIds: columnIds,
        preset: preset ?? 'custom',
      };
    }
    const presetId = preset && preset !== 'custom' ? preset : 'full';
    return {
      visibleColumnIds: [...REVIEW_VIEW_PRESETS[presetId]],
      preset: presetId,
    };
  } catch {
    return {
      visibleColumnIds: getDefaultVisibleColumnIds(),
      preset: 'full',
    };
  }
}

/** Save column visibility and preset to localStorage. */
export function saveReviewTableToStorage(state: ReviewTableStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(state.visibleColumnIds));
    localStorage.setItem(STORAGE_KEY_PRESET, JSON.stringify(state.preset));
  } catch {
    // ignore
  }
}
