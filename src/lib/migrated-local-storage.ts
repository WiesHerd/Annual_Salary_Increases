/**
 * Read/write localStorage with meritly-* primary keys and backward-compatible
 * reads from legacy tcc-* keys. Successful writes to primary remove the legacy key.
 */

import { safeLocalStorageSetItem } from './safe-local-storage';

function primaryKeyForLegacyTcc(legacyKey: string): string {
  return `meritly-${legacyKey.slice(4)}`;
}

/** Get item: for tcc-* keys, try meritly-* first, then legacy. Otherwise single key. */
export function migratedStorageGetItem(key: string): string | null {
  try {
    if (key.startsWith('tcc-')) {
      const primary = primaryKeyForLegacyTcc(key);
      const v = localStorage.getItem(primary);
      if (v !== null) return v;
      return localStorage.getItem(key);
    }
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Set item: for tcc-* keys, write meritly-* and remove tcc-* on success. */
export function migratedStorageSetItem(key: string, value: string): boolean {
  if (key.startsWith('tcc-')) {
    const primary = primaryKeyForLegacyTcc(key);
    const ok = safeLocalStorageSetItem(primary, value);
    if (ok) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    return ok;
  }
  return safeLocalStorageSetItem(key, value);
}

export function migratedStorageRemoveItem(key: string): void {
  try {
    if (key.startsWith('tcc-')) {
      const primary = primaryKeyForLegacyTcc(key);
      localStorage.removeItem(primary);
      localStorage.removeItem(key);
      return;
    }
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
