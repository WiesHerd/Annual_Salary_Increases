export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: number;
  maxScore: number;
  label: string;
  requirements: PasswordRequirement[];
}

export function assessPasswordStrength(password: string): PasswordStrengthResult {
  const requirements: PasswordRequirement[] = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One symbol (!@#$…)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) {
    return {
      level: 'empty',
      score: 0,
      maxScore: 5,
      label: '',
      requirements,
    };
  }

  const score = requirements.filter((r) => r.met).length;

  let level: PasswordStrengthLevel = 'weak';
  let label = 'Weak';
  if (score >= 5) {
    level = 'strong';
    label = 'Strong';
  } else if (score >= 4) {
    level = 'good';
    label = 'Good';
  } else if (score >= 3) {
    level = 'fair';
    label = 'Fair';
  }

  return { level, score, maxScore: 5, label, requirements };
}

export type PasswordMatchState = 'idle' | 'match' | 'mismatch';

export function passwordMatchState(password: string, confirm: string): PasswordMatchState {
  if (!confirm) return 'idle';
  return password === confirm ? 'match' : 'mismatch';
}
