/// <reference types="vite/client" />

declare const __MERITLY_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ALLOW_PUBLIC_SIGNUP?: string;
  readonly VITE_AUTH_ORG_LABEL?: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
