import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditEntityType, AuditEntry } from '../audit';

let activeOrgId: string | null = null;
let activeUserId: string | null = null;

export function setCloudAuditContext(orgId: string | null, userId: string | null): void {
  activeOrgId = orgId;
  activeUserId = userId;
}

export async function pushCloudAuditEntry(
  supabase: SupabaseClient,
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): Promise<void> {
  if (!activeOrgId) return;
  const { error } = await supabase.from('audit_log').insert({
    org_id: activeOrgId,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    field: entry.field,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    changed_by: activeUserId ?? entry.userId ?? null,
  });
  if (error) {
    console.warn('[Meritly] Cloud audit write failed:', error.message);
  }
}

/** Fire-and-forget wrapper used from audit.ts */
export function scheduleCloudAuditPush(
  supabase: SupabaseClient | null,
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): void {
  if (!supabase || !activeOrgId) return;
  void pushCloudAuditEntry(supabase, entry);
}

export type CloudAuditRow = {
  id: string;
  org_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_at: string;
};

export async function fetchCloudAuditLog(
  supabase: SupabaseClient,
  orgId: string,
  limit = 500
): Promise<CloudAuditRow[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('org_id', orgId)
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CloudAuditRow[];
}
