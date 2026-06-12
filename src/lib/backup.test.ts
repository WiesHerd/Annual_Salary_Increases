import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAppBackup, parseAppBackup, restoreAppBackup, BACKUP_FORMAT } from './backup';

describe('app backup/restore', () => {
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

  it('snapshots only app-owned keys', () => {
    memory.set('meritly-provider-records', '[{"Employee_ID":"EXT001"}]');
    memory.set('salary-review-filters', '{}');
    memory.set('asi-demo-mode', 'false');
    memory.set('some-other-app-key', 'should-not-be-included');
    const backup = buildAppBackup();
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(Object.keys(backup.data).sort()).toEqual([
      'asi-demo-mode',
      'meritly-provider-records',
      'salary-review-filters',
    ]);
  });

  it('round-trips through serialize → parse → restore and removes stale keys', () => {
    memory.set('meritly-provider-records', '[{"Employee_ID":"EXT001"}]');
    memory.set('meritly-parameters', '{"cycles":[]}');
    const serialized = JSON.stringify(buildAppBackup());

    memory.clear();
    memory.set('meritly-provider-records', '[{"Employee_ID":"STALE"}]');
    memory.set('meritly-stale-key', 'leftover');
    memory.set('unrelated-key', 'untouched');

    const result = parseAppBackup(serialized);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    restoreAppBackup(result.backup);

    expect(memory.get('meritly-provider-records')).toBe('[{"Employee_ID":"EXT001"}]');
    expect(memory.get('meritly-parameters')).toBe('{"cycles":[]}');
    expect(memory.has('meritly-stale-key')).toBe(false);
    expect(memory.get('unrelated-key')).toBe('untouched');
  });

  it('rejects invalid files with a readable error', () => {
    expect(parseAppBackup('not json').ok).toBe(false);
    expect(parseAppBackup('{}').ok).toBe(false);
    expect(parseAppBackup(JSON.stringify({ format: 'other', formatVersion: 1, data: {} })).ok).toBe(false);
    const tooNew = JSON.stringify({
      format: BACKUP_FORMAT,
      formatVersion: 999,
      appVersion: 'x',
      exportedAt: new Date().toISOString(),
      data: {},
    });
    const r = parseAppBackup(tooNew);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/newer version/i);
  });

  it('rejects backups containing non-app keys', () => {
    const malicious = JSON.stringify({
      format: BACKUP_FORMAT,
      formatVersion: 1,
      appVersion: 'x',
      exportedAt: new Date().toISOString(),
      data: { 'auth-token': 'evil' },
    });
    const r = parseAppBackup(malicious);
    expect(r.ok).toBe(false);
  });
});
