-- Meritly Phase 1: team workspace on Supabase Postgres
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- Organizations (one per comp team / hospital unit)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meritly workspace',
  created_at timestamptz not null default now()
);

-- Link auth.users to orgs
create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists organization_members_user_id_idx on public.organization_members(user_id);

-- Full workspace snapshot (mirrors Meritly localStorage backup format)
create table if not exists public.workspaces (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Field-level audit (synced from client)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('provider', 'market', 'evaluation')),
  entity_id text not null,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists audit_log_org_changed_at_idx on public.audit_log(org_id, changed_at desc);

-- Finalized cycle snapshots
create table if not exists public.cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  cycle_id text not null,
  finalized_at timestamptz not null,
  provider_count int not null,
  total_increase_dollars numeric not null,
  payload jsonb not null,
  created_by uuid references auth.users(id),
  unique (org_id, cycle_id)
);

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.audit_log enable row level security;
alter table public.cycle_snapshots enable row level security;

-- Helper: org ids for current user
create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.organization_members where user_id = auth.uid();
$$;

-- Organizations: members can read; authenticated users can create
drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member" on public.organizations
  for select using (id in (select public.user_org_ids()));

drop policy if exists "org_insert_authenticated" on public.organizations;
create policy "org_insert_authenticated" on public.organizations
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin" on public.organizations
  for update using (
    id in (
      select org_id from public.organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Members: read own; insert self; admins manage
drop policy if exists "member_select_own" on public.organization_members;
create policy "member_select_own" on public.organization_members
  for select using (user_id = auth.uid() or org_id in (select public.user_org_ids()));

drop policy if exists "member_insert_self" on public.organization_members;
create policy "member_insert_self" on public.organization_members
  for insert with check (user_id = auth.uid());

-- Workspaces: members read/write
drop policy if exists "workspace_select_member" on public.workspaces;
create policy "workspace_select_member" on public.workspaces
  for select using (org_id in (select public.user_org_ids()));

drop policy if exists "workspace_insert_member" on public.workspaces;
create policy "workspace_insert_member" on public.workspaces
  for insert with check (org_id in (select public.user_org_ids()));

drop policy if exists "workspace_update_member" on public.workspaces;
create policy "workspace_update_member" on public.workspaces
  for update using (org_id in (select public.user_org_ids()));

-- Audit log: members insert/read own org
drop policy if exists "audit_select_member" on public.audit_log;
create policy "audit_select_member" on public.audit_log
  for select using (org_id in (select public.user_org_ids()));

drop policy if exists "audit_insert_member" on public.audit_log;
create policy "audit_insert_member" on public.audit_log
  for insert with check (org_id in (select public.user_org_ids()));

-- Cycle snapshots: members read/write
drop policy if exists "snapshot_select_member" on public.cycle_snapshots;
create policy "snapshot_select_member" on public.cycle_snapshots
  for select using (org_id in (select public.user_org_ids()));

drop policy if exists "snapshot_insert_member" on public.cycle_snapshots;
create policy "snapshot_insert_member" on public.cycle_snapshots
  for insert with check (org_id in (select public.user_org_ids()));

drop policy if exists "snapshot_update_member" on public.cycle_snapshots;
create policy "snapshot_update_member" on public.cycle_snapshots
  for update using (org_id in (select public.user_org_ids()));
