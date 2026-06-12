import { AlertTriangle } from 'lucide-react';
import { isOrgSetupRequiredError } from '../lib/supabase/org-bootstrap';

export function OrgSetupAlert({ message }: { message: string }) {
  if (!isOrgSetupRequiredError(message)) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div className="flex gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="space-y-2 min-w-0">
          <p className="font-semibold">One-time database setup required</p>
          <p className="text-amber-900/90">
            Sign-in failed because a setup script has not been run in Supabase yet. This takes about
            one minute.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-amber-900/90">
            <li>
              Open{' '}
              <a
                href="https://supabase.com/dashboard/project/msrqcxebcrcdzorlfdiv/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                Supabase SQL Editor
              </a>
            </li>
            <li>
              Open file{' '}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">
                supabase/FIX_SIGN_IN.sql
              </code>{' '}
              in this project, copy all of it
            </li>
            <li>Paste → Run → wait for Success</li>
            <li>
              Run{' '}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">npm run verify:supabase</code>{' '}
              — should show bootstrap RPC ✅
            </li>
            <li>Refresh this page and sign in again</li>
          </ol>
          <p className="text-xs text-amber-800/80 pt-1">
            CLI alternative:{' '}
            <code className="rounded bg-amber-100/80 px-1">npm run supabase:login</code> then{' '}
            <code className="rounded bg-amber-100/80 px-1">npm run supabase:link</code> then{' '}
            <code className="rounded bg-amber-100/80 px-1">npm run db:push</code>
          </p>
        </div>
      </div>
    </div>
  );
}
