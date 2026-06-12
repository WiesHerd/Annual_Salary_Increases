import type { SupabaseClient } from '@supabase/supabase-js';

export interface OrganizationContext {
  orgId: string;
  orgName: string;
  role: 'admin' | 'editor' | 'viewer';
}

/** Shown in UI when migration 002 has not been applied in Supabase. */
export const ORG_SETUP_REQUIRED_MESSAGE =
  'Workspace setup is incomplete. Your admin must run one SQL script in Supabase (see steps below), then sign in again.';

export function isOrgSetupRequiredError(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    message.includes('Workspace setup is incomplete') ||
    message.includes('bootstrap_user_organization') ||
    message.includes('PGRST202') ||
    message.includes('Could not find the function')
  );
}

function defaultOrgName(email: string | undefined): string {
  if (!email) return 'Meritly workspace';
  const domain = email.split('@')[1];
  if (domain) return `${domain} merit cycle`;
  return 'Meritly workspace';
}

type BootstrapRpcResult = {
  org_id: string;
  org_name: string;
  role: string;
};

function parseBootstrapResult(data: unknown): OrganizationContext {
  let row: unknown = data;
  if (typeof data === 'string') {
    try {
      row = JSON.parse(data);
    } catch {
      throw new Error('Invalid workspace bootstrap response.');
    }
  }
  if (typeof row !== 'object' || row == null) {
    throw new Error('Invalid workspace bootstrap response.');
  }
  const parsed = row as BootstrapRpcResult;
  if (!parsed.org_id || !parsed.org_name) {
    throw new Error('Invalid workspace bootstrap response.');
  }
  return {
    orgId: parsed.org_id,
    orgName: parsed.org_name,
    role: (parsed.role as OrganizationContext['role']) ?? 'admin',
  };
}

function isRpcMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    error.message?.includes('bootstrap_user_organization') === true ||
    error.message?.includes('Could not find the function') === true
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureWorkspaceRow(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('workspaces')
    .select('org_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing?.org_id) return;

  const { error } = await supabase.from('workspaces').insert({
    org_id: orgId,
    payload: {},
    version: 1,
    updated_by: userId,
  });
  if (error) throw error;
}

/** Fallback when RPC migration has not been applied. */
async function ensureOrganizationLegacy(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined
): Promise<OrganizationContext> {
  const { data: membership, error: memberErr } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (memberErr) throw memberErr;

  if (membership?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', membership.org_id)
      .maybeSingle();

    await ensureWorkspaceRow(supabase, membership.org_id, userId);

    return {
      orgId: membership.org_id,
      orgName: org?.name ?? 'Meritly workspace',
      role: (membership.role as OrganizationContext['role']) ?? 'admin',
    };
  }

  const orgName = defaultOrgName(email);
  const orgId = crypto.randomUUID();

  const { error: orgErr } = await supabase.from('organizations').insert({ id: orgId, name: orgName });
  if (orgErr) throw orgErr;

  const { error: joinErr } = await supabase.from('organization_members').insert({
    org_id: orgId,
    user_id: userId,
    role: 'admin',
  });
  if (joinErr) throw joinErr;

  await ensureWorkspaceRow(supabase, orgId, userId);

  return { orgId, orgName, role: 'admin' };
}

async function bootstrapViaRpc(
  supabase: SupabaseClient,
  orgName: string
): Promise<OrganizationContext | null> {
  const { data, error } = await supabase.rpc('bootstrap_user_organization', { org_name: orgName });
  if (!error && data) return parseBootstrapResult(data);
  if (isRpcMissingError(error)) return null;
  throw error ?? new Error('Could not bootstrap workspace.');
}

/**
 * Ensure the signed-in user belongs to an organization; create one on first login.
 * Prefers RPC (migration 002); falls back to client bootstrap with retries.
 */
export async function ensureOrganization(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined
): Promise<OrganizationContext> {
  const orgName = defaultOrgName(email);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(500);
    await supabase.auth.getSession();

    try {
      const rpcResult = await bootstrapViaRpc(supabase, orgName);
      if (rpcResult) return rpcResult;
      return await ensureOrganizationLegacy(supabase, userId, email);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (lastError && isRpcMissingError(lastError as { code?: string; message?: string })) {
    throw new Error(ORG_SETUP_REQUIRED_MESSAGE);
  }

  throw lastError ?? new Error(ORG_SETUP_REQUIRED_MESSAGE);
}

/** Check whether migration 002 RPC exists (unauthenticated call returns "Not authenticated"). */
export async function checkBootstrapRpcExists(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.rpc('bootstrap_user_organization', { org_name: 'test' });
  if (!error) return true;
  if (isRpcMissingError(error)) return false;
  return true;
}
