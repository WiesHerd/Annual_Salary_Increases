import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from 'react';

import type { Session, User } from '@supabase/supabase-js';

import { authRedirectUrl } from '../lib/auth-config';

import { friendlyAuthError } from '../lib/auth-error-messages';

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';

import { recordAuditAction } from '../lib/audit';
import { ensureOrganization, isOrgSetupRequiredError, type OrganizationContext } from '../lib/supabase/org-bootstrap';



export type AuthMode = 'local-only' | 'loading' | 'unauthenticated' | 'authenticated';



export interface SupabaseAuthState {

  mode: AuthMode;

  session: Session | null;

  user: User | null;

  organization: OrganizationContext | null;

  authError: string | null;

  /** User arrived from a password-reset email link. */

  passwordRecoveryPending: boolean;

  signIn: (email: string, password: string) => Promise<void>;

  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;

  resetPassword: (email: string) => Promise<void>;

  updatePassword: (password: string) => Promise<void>;

  signOut: () => Promise<void>;

  clearAuthError: () => void;

  clearPasswordRecovery: () => void;

}



const SupabaseAuthContext = createContext<SupabaseAuthState | null>(null);



const HYDRATE_SESSION_KEY = 'meritly-cloud-hydrated-org';



export function getHydratedOrgId(): string | null {

  try {

    return sessionStorage.getItem(HYDRATE_SESSION_KEY);

  } catch {

    return null;

  }

}



export function markOrgHydrated(orgId: string): void {

  try {

    sessionStorage.setItem(HYDRATE_SESSION_KEY, orgId);

  } catch {

    // ignore

  }

}



export function clearHydratedOrg(): void {

  try {

    sessionStorage.removeItem(HYDRATE_SESSION_KEY);

  } catch {

    // ignore

  }

}



function setFriendlyError(

  setter: (msg: string | null) => void,

  raw: string | null | undefined

): void {

  setter(friendlyAuthError(raw) ?? 'Something went wrong. Please try again.');

}



async function resolveOrganization(user: User): Promise<OrganizationContext> {

  const supabase = getSupabaseClient();

  if (!supabase) throw new Error('Supabase is not configured.');

  return ensureOrganization(supabase, user.id, user.email);

}



export function SupabaseAuthProvider({ children }: { children: ReactNode }) {

  const configured = isSupabaseConfigured();

  const [mode, setMode] = useState<AuthMode>(configured ? 'loading' : 'local-only');

  const [session, setSession] = useState<Session | null>(null);

  const [organization, setOrganization] = useState<OrganizationContext | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);



  const bootstrapSession = useCallback(async (nextSession: Session | null) => {

    if (!configured) {

      setMode('local-only');

      setSession(null);

      setOrganization(null);

      return;

    }

    if (!nextSession?.user) {

      setSession(null);

      setOrganization(null);

      setMode('unauthenticated');

      return;

    }

    if (passwordRecoveryPending) {

      setSession(nextSession);

      setMode('unauthenticated');

      return;

    }

    setMode('loading');

    try {

      const org = await resolveOrganization(nextSession.user);

      setSession(nextSession);

      setOrganization(org);

      setMode('authenticated');

      setAuthError(null);

      recordAuditAction({
        entityType: 'session',
        action: 'sign-in',
        entityId: org.orgId,
        detail: org.orgName,
      });

    } catch (e) {

      const raw = e instanceof Error ? e.message : String(e);

      const message = isOrgSetupRequiredError(raw)

        ? raw

        : friendlyAuthError(raw) ?? `Workspace setup failed: ${raw}`;

      setAuthError(message);

      setSession(null);

      setOrganization(null);

      setMode('unauthenticated');

      void getSupabaseClient()?.auth.signOut();

    }

  }, [configured, passwordRecoveryPending]);



  useEffect(() => {

    if (!configured) return;

    const supabase = getSupabaseClient();

    if (!supabase) return;



    let mounted = true;



    void supabase.auth.getSession().then(({ data }) => {

      if (mounted) void bootstrapSession(data.session);

    });



    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {

      if (event === 'PASSWORD_RECOVERY') {

        setPasswordRecoveryPending(true);

        setSession(nextSession);

        setMode('unauthenticated');

        setAuthError(null);

        return;

      }

      if (event === 'SIGNED_OUT') {

        setPasswordRecoveryPending(false);

      }

      void bootstrapSession(nextSession);

    });



    return () => {

      mounted = false;

      sub.subscription.unsubscribe();

    };

  }, [configured, bootstrapSession]);



  const signIn = useCallback(async (email: string, password: string) => {

    const supabase = getSupabaseClient();

    if (!supabase) return;

    setAuthError(null);

    setPasswordRecoveryPending(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {

      setFriendlyError(setAuthError, error.message);

      recordAuditAction({ entityType: 'session', action: 'sign-in-failed' });

      throw error;

    }

  }, []);



  const signUp = useCallback(async (email: string, password: string) => {

    const supabase = getSupabaseClient();

    if (!supabase) return { needsEmailConfirmation: false };

    setAuthError(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {

      setFriendlyError(setAuthError, error.message);

      throw error;

    }

    const needsEmailConfirmation = !data.session;

    return { needsEmailConfirmation };

  }, []);



  const resetPassword = useCallback(async (email: string) => {

    const supabase = getSupabaseClient();

    if (!supabase) return;

    setAuthError(null);

    const redirectTo = authRedirectUrl() || (typeof window !== 'undefined' ? window.location.origin : '');

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {

      setFriendlyError(setAuthError, error.message);

      throw error;

    }

  }, []);



  const updatePassword = useCallback(async (password: string) => {

    const supabase = getSupabaseClient();

    if (!supabase) return;

    setAuthError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {

      setFriendlyError(setAuthError, error.message);

      throw error;

    }

    setPasswordRecoveryPending(false);

    await bootstrapSession((await supabase.auth.getSession()).data.session);

  }, [bootstrapSession]);



  const signOut = useCallback(async () => {

    const supabase = getSupabaseClient();

    if (organization) {
      recordAuditAction({
        entityType: 'session',
        action: 'sign-out',
        entityId: organization.orgId,
      });
    }

    clearHydratedOrg();

    setOrganization(null);

    setSession(null);

    setPasswordRecoveryPending(false);

    setMode(configured ? 'unauthenticated' : 'local-only');

    if (supabase) await supabase.auth.signOut();

  }, [configured]);



  const value = useMemo<SupabaseAuthState>(

    () => ({

      mode,

      session,

      user: session?.user ?? null,

      organization,

      authError,

      passwordRecoveryPending,

      signIn,

      signUp,

      resetPassword,

      updatePassword,

      signOut,

      clearAuthError: () => setAuthError(null),

      clearPasswordRecovery: () => setPasswordRecoveryPending(false),

    }),

    [

      mode,

      session,

      organization,

      authError,

      passwordRecoveryPending,

      signIn,

      signUp,

      resetPassword,

      updatePassword,

      signOut,

    ]

  );



  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;

}



export function useSupabaseAuth(): SupabaseAuthState {

  const ctx = useContext(SupabaseAuthContext);

  if (!ctx) throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');

  return ctx;

}


