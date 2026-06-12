import { Check, X } from 'lucide-react';
import {
  assessPasswordStrength,
  passwordMatchState,
  type PasswordStrengthLevel,
} from '../lib/password-strength';

const BAR_COLORS: Record<Exclude<PasswordStrengthLevel, 'empty'>, string> = {
  weak: 'bg-red-500',
  fair: 'bg-amber-500',
  good: 'bg-lime-500',
  strong: 'bg-emerald-600',
};

interface PasswordStrengthHintsProps {
  password: string;
  confirmPassword?: string;
  showStrength?: boolean;
  showMatch?: boolean;
}

export function PasswordStrengthHints({
  password,
  confirmPassword = '',
  showStrength = true,
  showMatch = false,
}: PasswordStrengthHintsProps) {
  const strength = assessPasswordStrength(password);
  const match = passwordMatchState(password, confirmPassword);

  if (!showStrength && !showMatch) return null;
  if (showStrength && !password && !showMatch) return null;
  if (showMatch && !confirmPassword) return null;

  const barLevel = strength.level === 'empty' ? 'weak' : strength.level;
  const barPercent = strength.level === 'empty' ? 0 : (strength.score / strength.maxScore) * 100;

  return (
    <div className="space-y-3 -mt-1">
      {showStrength && password && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Password strength</span>
            {strength.level !== 'empty' && (
              <span
                className={`text-xs font-semibold ${
                  strength.level === 'weak'
                    ? 'text-red-600'
                    : strength.level === 'fair'
                      ? 'text-amber-600'
                      : strength.level === 'good'
                        ? 'text-lime-700'
                        : 'text-emerald-700'
                }`}
              >
                {strength.label}
              </span>
            )}
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={strength.score}
            aria-valuemin={0}
            aria-valuemax={strength.maxScore}
            aria-label={`Password strength: ${strength.label || 'none'}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${BAR_COLORS[barLevel]}`}
              style={{ width: `${Math.max(barPercent, strength.level === 'empty' ? 0 : 8)}%` }}
            />
          </div>
          <ul className="grid gap-1 sm:grid-cols-2" aria-label="Password requirements">
            {strength.requirements.map((req) => (
              <li
                key={req.id}
                className={`flex items-center gap-1.5 text-xs ${
                  req.met ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {req.met ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-300" aria-hidden />
                )}
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showMatch && confirmPassword && (
        <p
          role="status"
          className={`flex items-center gap-1.5 text-xs font-medium ${
            match === 'match' ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {match === 'match' ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Passwords match
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5" aria-hidden />
              Passwords do not match
            </>
          )}
        </p>
      )}
    </div>
  );
}
