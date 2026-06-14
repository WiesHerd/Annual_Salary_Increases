/**
 * Current actor for audit entries — signed-in Supabase user or a stable local id.
 */

import { migratedStorageGetItem, migratedStorageSetItem } from './migrated-local-storage';

const LOCAL_ACTOR_KEY = 'meritly-local-actor-id';

export type AuditActor = {
  userId: string;
  userLabel: string;
};

let currentActor: AuditActor | null = null;

function generateLocalActorId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Stable id for local-only mode (no Supabase sign-in). */
export function getOrCreateLocalActorId(): string {
  try {
    const existing = migratedStorageGetItem(LOCAL_ACTOR_KEY);
    if (existing?.trim()) return existing.trim();
    const id = generateLocalActorId();
    migratedStorageSetItem(LOCAL_ACTOR_KEY, id);
    return id;
  } catch {
    return generateLocalActorId();
  }
}

export function setAuditActor(actor: AuditActor | null): void {
  currentActor = actor;
}

export function getAuditActor(): AuditActor {
  if (currentActor) return currentActor;
  const id = getOrCreateLocalActorId();
  return { userId: id, userLabel: 'Local session' };
}
