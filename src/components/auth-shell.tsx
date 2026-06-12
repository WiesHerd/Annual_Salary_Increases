import type { ReactNode } from 'react';
import { authOrgLabel } from '../lib/auth-config';
import { APP_VERSION } from '../lib/app-version';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const orgLabel = authOrgLabel();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f8fafc]">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#14532d] via-[#15803d] to-[#166534] p-10 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_50%)]" aria-hidden />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/95 p-2 shadow-lg">
            <img src="/GrokImage.jpg" alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-meritly text-2xl font-semibold tracking-tight">Meritly</p>
            <p className="text-sm text-emerald-100/90">Compensation planning</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Merit cycle workspace
          </h2>
          <p className="text-emerald-50/90 text-base leading-relaxed">
            Secure, team-shared access to provider data, policy controls, and merit review —
            synchronized for your compensation team.
          </p>
          {orgLabel && (
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-emerald-50">
              {orgLabel}
            </p>
          )}
        </div>

        <p className="relative z-10 text-xs text-emerald-100/70">
          Authorized personnel only · v{APP_VERSION}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-slate-200 p-1.5 shadow-sm">
              <img src="/GrokImage.jpg" alt="" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-meritly text-lg font-semibold text-slate-900">Meritly</p>
              <p className="text-xs text-slate-500">Compensation planning</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>

          {footer && <div className="mt-6">{footer}</div>}

          <p className="mt-8 text-center text-xs text-slate-400 lg:hidden">v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
