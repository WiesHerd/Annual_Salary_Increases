/** Map Supabase / Postgres errors to user-safe messages. */

const EXACT: Record<string, string> = {
  'Invalid login credentials': 'Email or password is incorrect. Try again or reset your password.',
  'Email not confirmed': 'Confirm your email address before signing in. Check your inbox for the link.',
  'User already registered': 'An account with this email already exists. Sign in instead.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
  'Signup is disabled': 'New accounts must be created by your administrator.',
  'Email rate limit exceeded': 'Too many attempts. Wait a few minutes and try again.',
  'For security purposes, you can only request this once every 60 seconds':
    'Please wait a minute before requesting another reset email.',
};

const CONTAINS: [RegExp, string][] = [
  [/invalid.*credentials/i, 'Email or password is incorrect. Try again or reset your password.'],
  [/email.*not.*confirmed/i, 'Confirm your email address before signing in.'],
  [/network|fetch failed/i, 'Could not reach the server. Check your connection and try again.'],
  [/jwt|apikey|api key/i, 'Sign-in service is misconfigured. Contact your administrator.'],
  [/row-level security|permission denied|42501/i, 'Your account could not access the workspace. Contact your administrator.'],
];

export function friendlyAuthError(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const msg = raw.trim();
  if (EXACT[msg]) return EXACT[msg];
  for (const [pattern, friendly] of CONTAINS) {
    if (pattern.test(msg)) return friendly;
  }
  if (msg.length > 120 || /^(PGRST|JWT|22|42)/.test(msg)) {
    return 'Something went wrong. Please try again or contact your administrator.';
  }
  return msg;
}
