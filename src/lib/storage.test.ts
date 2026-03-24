import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProviderRecordsWithMeta, saveProviderRecords } from './storage';

describe('saveProviderRecords empty list', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    const ls = {
      getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: (i: number) => Array.from(memory.keys())[i] ?? null,
      get length() {
        return memory.size;
      },
    } satisfies Storage;
    vi.stubGlobal('localStorage', ls);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes stale legacy tcc key and persists meritly [] so reload cannot fall back to old rows', () => {
    memory.set('tcc-provider-records', JSON.stringify([{ Employee_ID: 'EXT001', Provider_Name: 'Test' }]));
    saveProviderRecords([]);
    expect(memory.get('tcc-provider-records')).toBeUndefined();
    expect(memory.get('meritly-provider-records')).toBe('[]');
    const meta = loadProviderRecordsWithMeta();
    expect(meta.records).toHaveLength(0);
    expect(meta.hasStoredProviderState).toBe(true);
  });
});
