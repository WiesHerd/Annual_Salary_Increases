import { useState, useEffect, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell } from './auth-shell';
import { Button } from './ui/button';
import { FormField } from './form-field';
import { useSupabaseAuth } from '../context/supabase-auth-context';
import { isPublicSignUpAllowed } from '../lib/auth-config';
import { assessPasswordStrength, passwordMatchState } from '../lib/password-strength';
import { PasswordStrengthHints } from './password-strength-hints';
import { OrgSetupAlert } from './org-setup-alert';

type View = 'sign-in' | 'forgot' | 'update-password' | 'sign-up';

const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[var(--meritly-green)] focus:outline-none focus:ring-2 focus:ring-[var(--meritly-green)]/20 disabled:opacity-60';

function Alert({ variant, children }: { variant: 'error' | 'success'; children: string }) {
  return (
    <p
      role="alert"
      className={`rounded-lg px-3 py-2.5 text-sm ${
        variant === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
      }`}
    >
      {children}
    </p>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        minLength={8}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClassName} pr-10`}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--meritly-green)]/30"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const {
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    authError,
    clearAuthError,
    passwordRecoveryPending,
    clearPasswordRecovery,
  } = useSupabaseAuth();

  const allowSignUp = isPublicSignUpAllowed();
  const [view, setView] = useState<View>(passwordRecoveryPending ? 'update-password' : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (passwordRecoveryPending) setView('update-password');
  }, [passwordRecoveryPending]);

  function switchView(next: View) {
    clearAuthError();
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
    if (next !== 'update-password') clearPasswordRecovery();
    setView(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearAuthError();
    setMessage(null);
    setBusy(true);
    try {
      if (view === 'sign-in') {
        await signIn(email.trim(), password);
      } else if (view === 'sign-up') {
        if (password !== confirmPassword) {
          setMessage('Passwords do not match.');
          return;
        }
        const { needsEmailConfirmation } = await signUp(email.trim(), password);
        if (needsEmailConfirmation) {
          setMessage('Check your email to confirm your account, then sign in.');
          switchView('sign-in');
        }
      } else if (view === 'forgot') {
        await resetPassword(email.trim());
        switchView('sign-in');
        setMessage('If an account exists for that email, we sent a password reset link.');
      } else if (view === 'update-password') {
        if (password !== confirmPassword) {
          setMessage('Passwords do not match.');
          return;
        }
        await updatePassword(password);
        setMessage('Password updated. You are now signed in.');
      }
    } catch {
      // authError set in context
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<View, { title: string; subtitle: string }> = {
    'sign-in': {
      title: 'Sign in',
      subtitle: 'Access your organization\'s secure merit cycle workspace.',
    },
    forgot: {
      title: 'Reset password',
      subtitle: 'We\'ll email you a link to choose a new password.',
    },
    'update-password': {
      title: 'Set new password',
      subtitle: 'Choose a strong password for your Meritly account.',
    },
    'sign-up': {
      title: 'Create account',
      subtitle: 'Register for your team workspace.',
    },
  };

  const { title, subtitle } = titles[view];
  const needsPasswordHints = view === 'sign-up' || view === 'update-password';
  const passwordsMatch = passwordMatchState(password, confirmPassword);
  const strength = assessPasswordStrength(password);
  const canSubmitNewPassword =
    !needsPasswordHints ||
    (password.length >= 8 &&
      passwordsMatch === 'match' &&
      strength.score >= 3);

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <p className="text-center text-xs leading-relaxed text-slate-500">
          Authorized compensation personnel only. Sign-in, exports, imports, and data edits are logged locally for audit. Errors are recorded on this device — no third-party tracking.
          {!allowSignUp && view === 'sign-in' && (
            <>
              {' '}
              Need access? Contact your Meritly administrator.
            </>
          )}
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {(view === 'sign-in' || view === 'forgot' || view === 'sign-up') && (
          <FormField label="Work email" htmlFor="email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              className={inputClassName}
            />
          </FormField>
        )}

        {(view === 'sign-in' || view === 'sign-up' || view === 'update-password') && (
          <FormField
            label={view === 'update-password' ? 'New password' : 'Password'}
            htmlFor="password"
          >
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete={view === 'sign-in' ? 'current-password' : 'new-password'}
              disabled={busy}
            />
            {needsPasswordHints && (
              <PasswordStrengthHints password={password} showMatch={false} />
            )}
          </FormField>
        )}

        {view === 'sign-up' || view === 'update-password' ? (
          <FormField label="Confirm password" htmlFor="confirm-password">
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              disabled={busy}
            />
            <PasswordStrengthHints
              password={password}
              confirmPassword={confirmPassword}
              showStrength={false}
              showMatch
            />
          </FormField>
        ) : null}

        {view === 'sign-in' && (
          <div className="flex justify-end -mt-2">
            <button
              type="button"
              className="text-sm font-medium text-[var(--meritly-green)] hover:underline underline-offset-2"
              onClick={() => switchView('forgot')}
            >
              Forgot password?
            </button>
          </div>
        )}

        {authError && <OrgSetupAlert message={authError} />}
        {authError && <Alert variant="error">{authError}</Alert>}
        {message && !authError && (
          <Alert variant={message.includes('do not match') ? 'error' : 'success'}>{message}</Alert>
        )}

        <Button
          type="submit"
          className="w-full h-10"
          disabled={busy || (needsPasswordHints && !canSubmitNewPassword)}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Please wait…
            </>
          ) : view === 'sign-in' ? (
            'Sign in'
          ) : view === 'forgot' ? (
            'Send reset link'
          ) : view === 'update-password' ? (
            'Save password'
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
        {view === 'sign-in' && allowSignUp && (
          <>
            New to Meritly?{' '}
            <button
              type="button"
              className="font-medium text-[var(--meritly-green)] hover:underline underline-offset-2"
              onClick={() => switchView('sign-up')}
            >
              Create an account
            </button>
          </>
        )}
        {view === 'sign-in' && !allowSignUp && (
          <span className="text-slate-500">Accounts are provisioned by your administrator.</span>
        )}
        {view === 'forgot' && (
          <>
            Remember your password?{' '}
            <button
              type="button"
              className="font-medium text-[var(--meritly-green)] hover:underline underline-offset-2"
              onClick={() => switchView('sign-in')}
            >
              Back to sign in
            </button>
          </>
        )}
        {view === 'sign-up' && (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="font-medium text-[var(--meritly-green)] hover:underline underline-offset-2"
              onClick={() => switchView('sign-in')}
            >
              Sign in
            </button>
          </>
        )}
        {view === 'update-password' && (
          <>
            <button
              type="button"
              className="font-medium text-[var(--meritly-green)] hover:underline underline-offset-2"
              onClick={() => switchView('sign-in')}
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
