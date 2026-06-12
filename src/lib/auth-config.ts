/**
 * Auth UI and behavior flags (Vite env).
 */

export function isPublicSignUpAllowed(): boolean {
  const raw = import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP?.trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  return false;
}

/** Optional subtitle on login, e.g. hospital system name. */
export function authOrgLabel(): string | null {
  const raw = import.meta.env.VITE_AUTH_ORG_LABEL?.trim();
  return raw || null;
}

export function authRedirectUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || '';
}
