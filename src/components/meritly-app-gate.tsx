import { useSupabaseAuth } from '../context/supabase-auth-context';
import { WorkspaceSyncProvider } from '../context/workspace-sync-context';
import { LoginPage } from './login-page';
import type { ReactNode } from 'react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}

/** Sync provider only when cloud auth is active. */
export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { mode } = useSupabaseAuth();
  if (mode === 'authenticated') {
    return <WorkspaceSyncProvider>{children}</WorkspaceSyncProvider>;
  }
  return <>{children}</>;
}

/** Auth gate when Supabase is configured; passes through in local-only mode. */
export function MeritlyAppGate({ children }: { children: ReactNode }) {
  const { mode } = useSupabaseAuth();

  if (mode === 'loading') return <LoadingScreen />;
  if (mode === 'unauthenticated') return <LoginPage />;
  return <>{children}</>;
}
