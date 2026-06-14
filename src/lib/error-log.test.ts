import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuditActor } from './audit-actor';
import { appendErrorLog, loadErrorLogEntries } from './error-log';

vi.mock('./migrated-local-storage', () => {
  const store = new Map<string, string>();
  return {
    migratedStorageGetItem: (key: string) => store.get(key) ?? null,
    migratedStorageSetItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
});

describe('error-log', () => {
  beforeEach(() => {
    setAuditActor({ userId: 'user-1', userLabel: 'test@example.com' });
  });

  it('appendErrorLog stores message with actor', () => {
    appendErrorLog('Something broke', 'test');
    const entries = loadErrorLogEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('Something broke');
    expect(entries[0].source).toBe('test');
    expect(entries[0].userLabel).toBe('test@example.com');
  });
});
