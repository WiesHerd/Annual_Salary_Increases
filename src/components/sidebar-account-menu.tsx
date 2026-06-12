import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useSupabaseAuth } from '../context/supabase-auth-context';
import { useWorkspaceSyncOptional } from '../context/workspace-sync-context';

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function UserAvatar({ email, busy }: { email: string; busy?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#166534] text-[11px] font-medium text-white shadow-sm ring-1 ring-slate-200/90"
        aria-hidden
      >
        {initialsFromEmail(email)}
      </span>
      {busy && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400"
          aria-label="Saving"
        />
      )}
    </span>
  );
}

interface SidebarAccountMenuProps {
  collapsed?: boolean;
}

export function SidebarAccountMenu({ collapsed = false }: SidebarAccountMenuProps) {
  const { mode, user, signOut } = useSupabaseAuth();
  const sync = useWorkspaceSyncOptional();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (mode === 'local-only') return null;

  const email = user?.email ?? '';
  const displayName = email ? displayNameFromEmail(email) : 'Account';
  const isBusy = sync?.status === 'syncing' || sync?.status === 'hydrating';
  const syncError = sync?.status === 'error' ? sync.lastError ?? 'Could not save to cloud.' : null;

  return (
    <div ref={rootRef} className="relative border-t border-slate-100 px-3 py-2.5">
      {open && (
        <div
          className={`absolute z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-md ${
            collapsed ? 'left-full bottom-0 ml-2 w-52' : 'bottom-full left-3 right-3 mb-1'
          }`}
          role="menu"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            {email && (
              <p className="truncate text-xs text-slate-500" title={email}>
                {email}
              </p>
            )}
          </div>
          {syncError && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-red-600">{syncError}</p>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-slate-400" aria-hidden />
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={`flex w-full items-center gap-2.5 rounded-md py-1 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
          collapsed ? 'justify-center px-0' : 'px-0.5'
        }`}
        title={collapsed ? displayName : undefined}
      >
        {email ? <UserAvatar email={email} busy={isBusy} /> : null}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{displayName}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </>
        )}
      </button>
    </div>
  );
}
