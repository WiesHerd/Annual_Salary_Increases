-- Reliable first-login org bootstrap (bypasses RLS chicken-and-egg issues).
-- Run in Supabase SQL Editor, or: npm run supabase:login && npm run supabase:link && npm run db:push

create or replace function public.bootstrap_user_organization(org_name text default 'Meritly workspace')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_org_id uuid;
  existing_org_name text;
  existing_role text;
  new_org_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select om.org_id, o.name, om.role
  into existing_org_id, existing_org_name, existing_role
  from public.organization_members om
  join public.organizations o on o.id = om.org_id
  where om.user_id = uid
  limit 1;

  if existing_org_id is not null then
    insert into public.workspaces (org_id, payload, version, updated_by)
    values (existing_org_id, '{}'::jsonb, 1, uid)
    on conflict (org_id) do nothing;

    return json_build_object(
      'org_id', existing_org_id,
      'org_name', existing_org_name,
      'role', existing_role
    );
  end if;

  new_org_id := gen_random_uuid();

  insert into public.organizations (id, name) values (new_org_id, org_name);
  insert into public.organization_members (org_id, user_id, role) values (new_org_id, uid, 'admin');
  insert into public.workspaces (org_id, payload, version, updated_by)
  values (new_org_id, '{}'::jsonb, 1, uid);

  return json_build_object(
    'org_id', new_org_id,
    'org_name', org_name,
    'role', 'admin'
  );
end;
$$;

revoke all on function public.bootstrap_user_organization(text) from public;
grant execute on function public.bootstrap_user_organization(text) to authenticated;

notify pgrst, 'reload schema';
