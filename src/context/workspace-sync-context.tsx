import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildAppBackup, restoreAppBackup } from '../lib/backup';
import { pauseCloudSync, resumeCloudSync } from '../lib/cloud-sync-scheduler';
import { getSupabaseClient } from '../lib/supabase/client';
import {
  fetchWorkspace,
  upsertWorkspace,
  workspaceHasData,
  workspacePayloadToBackup,
} from '../lib/supabase/workspace-repository';
import { setCloudAuditContext } from '../lib/supabase/cloud-audit';
import { setCloudSnapshotContext } from '../lib/supabase/cloud-cycle-snapshots';
import {
  clearHydratedOrg,
  getHydratedOrgId,
  markOrgHydrated,
  useSupabaseAuth,
} from './supabase-auth-context';

export type CloudSyncStatus = 'idle' | 'hydrating' | 'syncing' | 'synced' | 'error';

export interface WorkspaceSyncState {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
}

const WorkspaceSyncContext = createContext<WorkspaceSyncState | null>(null);

function localWorkspaceHasData(): boolean {
  return Object.keys(buildAppBackup().data).length > 0;
}

export function WorkspaceSyncProvider({ children }: { children: ReactNode }) {
  const { mode, user, organization } = useSupabaseAuth();
  const [status, setStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const hydratingRef = useRef(false);

  const orgId = organization?.orgId ?? null;
  const userId = user?.id ?? null;

  useEffect(() => {
    setCloudAuditContext(orgId, userId);
    setCloudSnapshotContext(orgId, userId);
  }, [orgId, userId]);

  const syncNow = useCallback(async () => {
    if (mode !== 'authenticated' || !orgId || !userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setStatus('syncing');
    setLastError(null);
    try {
      const backup = buildAppBackup();
      await upsertWorkspace(supabase, orgId, userId, backup.data);
      const ts = new Date().toISOString();
      setLastSyncedAt(ts);
      setStatus('synced');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cloud sync failed.';
      setLastError(msg);
      setStatus('error');
    }
  }, [mode, orgId, userId]);

  // Initial hydrate on login: cloud wins if it has data; else upload local
  useEffect(() => {
    if (mode !== 'authenticated' || !orgId || !userId) return;
    if (getHydratedOrgId() === orgId) return;
    if (hydratingRef.current) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    hydratingRef.current = true;
    setStatus('hydrating');

    void (async () => {
      pauseCloudSync();
      try {
        const row = await fetchWorkspace(supabase, orgId);
        if (workspaceHasData(row)) {
          const backup = workspacePayloadToBackup(row!.payload);
          restoreAppBackup(backup);
          markOrgHydrated(orgId);
          window.location.reload();
          return;
        }
        if (localWorkspaceHasData()) {
          const backup = buildAppBackup();
          await upsertWorkspace(supabase, orgId, userId, backup.data);
          setLastSyncedAt(new Date().toISOString());
        }
        markOrgHydrated(orgId);
        setStatus('synced');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not load team workspace.';
        setLastError(msg);
        setStatus('error');
        clearHydratedOrg();
      } finally {
        resumeCloudSync();
        hydratingRef.current = false;
      }
    })();
  }, [mode, orgId, userId]);

  // Debounced push when local data changes
  useEffect(() => {
    if (mode !== 'authenticated' || !orgId) return;
    const onSync = () => void syncNow();
    window.addEventListener('meritly-cloud-sync', onSync);
    return () => window.removeEventListener('meritly-cloud-sync', onSync);
  }, [mode, orgId, syncNow]);

  const value = useMemo<WorkspaceSyncState>(
    () => ({ status, lastSyncedAt, lastError, syncNow }),
    [status, lastSyncedAt, lastError, syncNow]
  );

  return <WorkspaceSyncContext.Provider value={value}>{children}</WorkspaceSyncContext.Provider>;
}

export function useWorkspaceSync(): WorkspaceSyncState {
  const ctx = useContext(WorkspaceSyncContext);
  if (!ctx) throw new Error('useWorkspaceSync must be used within WorkspaceSyncProvider');
  return ctx;
}

/** Optional hook — returns null when sync provider is not mounted (local-only). */
export function useWorkspaceSyncOptional(): WorkspaceSyncState | null {
  return useContext(WorkspaceSyncContext);
}
