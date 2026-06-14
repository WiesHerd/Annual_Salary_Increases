# $0 observability stack

Meritly includes audit logging and error capture **without paid third-party services**. Everything works in local-only mode (no Supabase). Optional Supabase adds sign-in and cloud backup — still on the free tier.

## What you get out of the box ($0)

| Capability | Where | Cost |
|------------|-------|------|
| Activity audit log | Data → Audit log | Free (localStorage) |
| Error log | Data → Audit log (bottom section) | Free (localStorage) |
| User attribution | Signed-in email or "Local session" | Free |
| Sign-in / sign-out logging | When Supabase configured | Free |
| Import & export logging | Automatic on upload/download | Free |

No Sentry, Datadog, or PostHog required.

## Modes

### Local-only (default)

- Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unset in `.env`
- No login screen — app opens directly
- Audit actor = stable **Local session** id on this browser
- All logs stay on this device

### Team mode (optional, still $0 on Supabase free tier)

1. Create a project at [supabase.com](https://supabase.com) (free, no credit card)
2. Copy `.env.example` → `.env` and fill in URL + anon key
3. Run SQL migrations in order:
   - `supabase/migrations/001_phase1_team_enterprise.sql`
   - `supabase/migrations/002_bootstrap_rpc.sql`
   - `supabase/migrations/003_audit_activity_types.sql`
4. Enable **Email** auth under Authentication → Providers
5. Keep `VITE_ALLOW_PUBLIC_SIGNUP=false` — create your account once, then disable signup in Supabase dashboard if desired

Sign-in logs session events; data edits sync to `audit_log` in Postgres (org-scoped).

## What gets logged

- **Session**: sign-in, sign-out, failed sign-in
- **Import**: provider / market / evaluation uploads
- **Export**: merit review CSV/XLSX, committee XLSX
- **Provider**: field-level edits in Data browser
- **System**: React render errors (message only, no PII)

## Viewing logs

**Data browser → Audit log** tab:

- **Activity log** — filter by type, search, export CSV
- **Error log** — recent app errors on this device

## Env vars (all optional except Supabase keys for team mode)

```env
# Team workspace (optional)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALLOW_PUBLIC_SIGNUP=false
# VITE_AUTH_ORG_LABEL=Your health system name
```

## When you might pay later

- Supabase **Pro** (~$25/mo) — production uptime (free tier pauses after 7 days idle), daily backups
- Not required for solo use or demos

## Privacy

- Audit and error logs avoid provider names and salaries in error messages
- No third-party telemetry is sent unless you add services yourself later
