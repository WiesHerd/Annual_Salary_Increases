/**
 * Apply migration 002 (bootstrap RPC) to the linked Supabase project.
 * Usage: npm run supabase:login && npm run supabase:link && npm run db:push
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const raw = readFileSync(resolve(root, '.env'), 'utf8');
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

if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log('Note: bootstrap RPC must be applied with service role or SQL editor.');
console.log('Run this SQL in Supabase → SQL Editor if sign-in still fails:\n');
console.log(readFileSync(resolve(root, 'supabase/migrations/002_bootstrap_rpc.sql'), 'utf8'));

const supabase = createClient(url, key);
const { error } = await supabase.from('organizations').select('id', { head: true, count: 'exact' });
if (error) {
  console.error('\nConnection check failed:', error.message);
  process.exit(1);
}
console.log('\n✅ Connected. Paste the SQL above into Supabase SQL Editor and click Run.');
