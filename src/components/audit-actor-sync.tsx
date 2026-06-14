import { useEffect } from 'react';
import { getOrCreateLocalActorId, setAuditActor } from '../lib/audit-actor';
import { useSupabaseAuth } from '../context/supabase-auth-context';

/** Keeps audit actor in sync with auth state (Supabase user or local session). */
export function AuditActorSync() {
  const { mode, user } = useSupabaseAuth();

  useEffect(() => {
    if (mode === 'authenticated' && user) {
      setAuditActor({
        userId: user.id,
        userLabel: user.email ?? `User ${user.id.slice(0, 8)}`,
      });
      return;
    }
    setAuditActor({
      userId: getOrCreateLocalActorId(),
      userLabel: mode === 'local-only' ? 'Local session' : 'Signed out',
    });
  }, [mode, user]);

  return null;
}
