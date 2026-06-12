import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppBackup } from '../backup';
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from '../backup';
import { APP_VERSION } from '../app-version';

export interface WorkspaceRow {
  org_id: string;
  payload: WorkspacePayload;
  version: number;
  updated_at: string;
  updated_by: string | null;
}

/** Stored in Postgres jsonb — mirrors Meritly backup `data` section. */
export interface WorkspacePayload {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  data: Record<string, string>;
}

export function buildWorkspacePayload(data: Record<string, string>): WorkspacePayload {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function workspacePayloadToBackup(payload: WorkspacePayload): AppBackup {
  return {
    format: payload.format,
    formatVersion: payload.formatVersion,
    appVersion: payload.appVersion,
    exportedAt: payload.exportedAt,
    data: payload.data,
  };
}

export async function fetchWorkspace(
  supabase: SupabaseClient,
  orgId: string
): Promise<WorkspaceRow | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('org_id, payload, version, updated_at, updated_by')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as WorkspaceRow;
}

export async function upsertWorkspace(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  data: Record<string, string>,
  version = 1
): Promise<void> {
  const payload = buildWorkspacePayload(data);
  const { error } = await supabase.from('workspaces').upsert(
    {
      org_id: orgId,
      payload,
      version,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'org_id' }
  );
  if (error) throw error;
}

export function workspaceHasData(row: WorkspaceRow | null): boolean {
  if (!row?.payload) return false;
  const p = row.payload as WorkspacePayload;
  return typeof p.data === 'object' && p.data != null && Object.keys(p.data).length > 0;
}
