import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuditActor } from './audit-actor';
import { loadAuditEntries, recordAuditAction } from './audit';

vi.mock('./migrated-local-storage', () => {
  const store = new Map<string, string>();
  return {
    migratedStorageGetItem: (key: string) => store.get(key) ?? null,
    migratedStorageSetItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
});

vi.mock('./supabase/client', () => ({
  getSupabaseClient: () => null,
}));

describe('audit', () => {
  beforeEach(() => {
    setAuditActor({ userId: 'user-1', userLabel: 'test@example.com' });
  });

  it('recordAuditAction attaches actor and stores entry', () => {
    recordAuditAction({
      entityType: 'session',
      action: 'sign-in',
      entityId: 'org-1',
      detail: 'Test Org',
    });
    const entries = loadAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].entityType).toBe('session');
    expect(entries[0].field).toBe('sign-in');
    expect(entries[0].userId).toBe('user-1');
    expect(entries[0].userLabel).toBe('test@example.com');
  });
});
