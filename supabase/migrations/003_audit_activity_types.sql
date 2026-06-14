-- Extend audit_log entity types for session, export, import, and system activity.

alter table public.audit_log drop constraint if exists audit_log_entity_type_check;

alter table public.audit_log add constraint audit_log_entity_type_check
  check (entity_type in (
    'provider', 'market', 'evaluation',
    'session', 'export', 'import', 'system'
  ));
