import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const email = `meritly.debug.${Date.now()}@gmail.com`;
const password = 'DebugTest123!';

const { data: signData, error: signErr } = await sb.auth.signUp({ email, password });
console.log('signUp:', signErr?.message ?? 'ok', '| session:', !!signData.session);

if (!signData.session) {
  console.log('No session (email confirmation may be required).');
  process.exit(0);
}

const uid = signData.session.user.id;
const orgId = randomUUID();

const e1 = await sb.from('organizations').insert({ id: orgId, name: 'test org' });
console.log('org insert:', e1.error?.message ?? 'ok');

const e2 = await sb.from('organization_members').insert({
  org_id: orgId,
  user_id: uid,
  role: 'admin',
});
console.log('member insert:', e2.error?.message ?? 'ok');

const e3 = await sb.from('workspaces').insert({
  org_id: orgId,
  payload: {},
  version: 1,
  updated_by: uid,
});
console.log('workspace insert:', e3.error?.message ?? 'ok');
