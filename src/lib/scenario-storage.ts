/**
 * Save/load custom scenarios for Compare Scenarios.
 * Saved scenarios = named snapshots of current policy config.
 */

import type { ScenarioConfigSnapshot } from '../types/scenario';

const STORAGE_KEY = 'tcc-compare-saved-scenarios';

export interface SavedScenario {
  id: string;
  label: string;
  config: ScenarioConfigSnapshot;
  createdAt: string;
}

export function loadSavedScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: unknown): s is SavedScenario =>
        s != null &&
        typeof s === 'object' &&
        typeof (s as SavedScenario).id === 'string' &&
        typeof (s as SavedScenario).label === 'string' &&
        (s as SavedScenario).config != null
    );
  } catch {
    return [];
  }
}

export function saveScenario(scenario: SavedScenario): void {
  const list = loadSavedScenarios();
  const idx = list.findIndex((s) => s.id === scenario.id);
  const updated = idx >= 0
    ? list.map((s, i) => (i === idx ? scenario : s))
    : [...list, scenario];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteSavedScenario(id: string): void {
  const list = loadSavedScenarios().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function createSavedScenario(
  label: string,
  config: ScenarioConfigSnapshot
): SavedScenario {
  return {
    id: `saved-${crypto.randomUUID()}`,
    label,
    config,
    createdAt: new Date().toISOString(),
  };
}
