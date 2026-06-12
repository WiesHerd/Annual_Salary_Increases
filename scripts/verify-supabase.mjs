/**
 * Quick check that Supabase URL/key are set and the Meritly tables exist.
 * Usage: node scripts/verify-supabase.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const path = resolve(root, '.env');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.error('❌ No .env file found. Copy .env.example → .env and add your keys.');
    process.exit(1);
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key || !url.startsWith('http')) {
  console.error('❌ Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = ['organizations', 'organization_members', 'workspaces', 'audit_log', 'cycle_snapshots'];
let ok = 0;

console.log('Checking Supabase connection…');
console.log(`  URL: ${url}\n`);

for (const table of tables) {
  const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`  ❌ ${table}: ${error.message}`);
  } else {
    console.log(`  ✅ ${table}`);
    ok++;
  }
}

const { error: rpcError } = await supabase.rpc('bootstrap_user_organization', {
  org_name: 'verify-check',
});

let rpcOk = false;
if (rpcError?.code === 'PGRST202' || rpcError?.message?.includes('Could not find the function')) {
  console.log('  ❌ bootstrap_user_organization RPC (sign-in will fail until this is applied)');
} else {
  console.log('  ✅ bootstrap_user_organization RPC');
  rpcOk = true;
}

if (ok === tables.length && rpcOk) {
  console.log('\n✅ Supabase is ready. Run `npm run dev` and sign in.');
  process.exit(0);
}

console.log('\n⚠️  Setup incomplete.');
if (!rpcOk) {
  console.log('\nTo fix sign-in, run this SQL in Supabase → SQL Editor:');
  console.log('  supabase/FIX_SIGN_IN.sql');
  console.log('\nOr via CLI: npm run supabase:login && npm run supabase:link && npm run db:push');
}
if (ok < tables.length) {
  console.log('\nMissing tables? Run: supabase/migrations/001_phase1_team_enterprise.sql');
}
process.exit(1);
