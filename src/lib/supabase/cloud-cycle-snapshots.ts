import type { SupabaseClient } from '@supabase/supabase-js';
import type { CycleSnapshot } from '../cycle-snapshot-storage';

let activeOrgId: string | null = null;
let activeUserId: string | null = null;

export function setCloudSnapshotContext(orgId: string | null, userId: string | null): void {
  activeOrgId = orgId;
  activeUserId = userId;
}

export async function pushCycleSnapshotToCloud(
  supabase: SupabaseClient,
  snapshot: CycleSnapshot
): Promise<void> {
  if (!activeOrgId) return;
  const { error } = await supabase.from('cycle_snapshots').upsert(
    {
      org_id: activeOrgId,
      cycle_id: snapshot.cycleId,
      finalized_at: snapshot.finalizedAt,
      provider_count: snapshot.providerCount,
      total_increase_dollars: snapshot.totalIncreaseDollars,
      payload: snapshot,
      created_by: activeUserId,
    },
    { onConflict: 'org_id,cycle_id' }
  );
  if (error) {
    console.warn('[Meritly] Cloud cycle snapshot write failed:', error.message);
  }
}

export function scheduleCloudCycleSnapshot(
  supabase: SupabaseClient | null,
  snapshot: CycleSnapshot
): void {
  if (!supabase || !activeOrgId) return;
  void pushCycleSnapshotToCloud(supabase, snapshot);
}

export async function deleteCloudCycleSnapshot(
  supabase: SupabaseClient,
  cycleId: string
): Promise<void> {
  if (!activeOrgId) return;
  const { error } = await supabase
    .from('cycle_snapshots')
    .delete()
    .eq('org_id', activeOrgId)
    .eq('cycle_id', cycleId);
  if (error) {
    console.warn('[Meritly] Cloud cycle snapshot delete failed:', error.message);
  }
}

export function scheduleCloudCycleSnapshotDelete(
  supabase: SupabaseClient | null,
  cycleId: string
): void {
  if (!supabase || !activeOrgId) return;
  void deleteCloudCycleSnapshot(supabase, cycleId);
}
