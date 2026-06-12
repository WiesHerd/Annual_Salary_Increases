import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isSupabaseConfigured } from './client';

describe('supabase client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isSupabaseConfigured is false when env vars are missing', () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('isSupabaseConfigured is true when url and key are set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_test');
    expect(isSupabaseConfigured()).toBe(true);
  });
});
