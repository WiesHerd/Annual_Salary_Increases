/**
 * User-editable policy template library. Stored in localStorage.
 * Built-in templates remain in policy-templates.ts; user templates are stored here.
 */

import type { AnnualIncreasePolicy } from '../types/compensation-policy';

const STORAGE_KEY = 'tcc-policy-engine-user-templates';

/** User-defined template: policy payload without id/key, plus display fields. */
export interface UserPolicyTemplate {
  id: string;
  name: string;
  description: string;
  stage: AnnualIncreasePolicy['stage'];
  policyType: string;
  /** Full policy definition except id and key (added when adding to active list). */
  policy: Omit<AnnualIncreasePolicy, 'id' | 'key'>;
}

function loadJson<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw) as unknown;
    return (data ?? defaultValue) as T;
  } catch {
    return defaultValue;
  }
}

function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadUserTemplates(): UserPolicyTemplate[] {
  try {
    const raw = loadJson<unknown>(STORAGE_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (s: unknown): s is UserPolicyTemplate =>
        s != null &&
        typeof s === 'object' &&
        typeof (s as UserPolicyTemplate).id === 'string' &&
        typeof (s as UserPolicyTemplate).name === 'string' &&
        typeof (s as UserPolicyTemplate).policy === 'object'
    );
  } catch {
    return [];
  }
}

export function saveUserTemplate(template: UserPolicyTemplate): void {
  const list = loadUserTemplates();
  const idx = list.findIndex((t) => t.id === template.id);
  const updated = idx >= 0 ? list.map((t, i) => (i === idx ? template : t)) : [...list, template];
  saveJson(STORAGE_KEY, updated);
}

export function updateUserTemplate(id: string, updates: Partial<Omit<UserPolicyTemplate, 'id'>>): void {
  const list = loadUserTemplates();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...updates };
  saveJson(STORAGE_KEY, list);
}

export function deleteUserTemplate(id: string): void {
  const list = loadUserTemplates().filter((t) => t.id !== id);
  saveJson(STORAGE_KEY, list);
}

export function createUserTemplate(
  name: string,
  description: string,
  stage: AnnualIncreasePolicy['stage'],
  policyType: string,
  policy: Omit<AnnualIncreasePolicy, 'id' | 'key'>
): UserPolicyTemplate {
  const template: UserPolicyTemplate = {
    id: `user-tpl-${crypto.randomUUID()}`,
    name,
    description,
    stage,
    policyType,
    policy: JSON.parse(JSON.stringify(policy)),
  };
  saveUserTemplate(template);
  return template;
}

/** Create an active policy from a user template (new id/key, timestamps). */
export function instantiateUserTemplate(template: UserPolicyTemplate): AnnualIncreasePolicy {
  const ts = () => new Date().toISOString();
  return {
    ...template.policy,
    id: `pol-user-${template.id}-${Date.now()}`,
    key: `user-${template.id}-${Date.now()}`,
    name: template.name,
    description: template.description,
    stage: template.stage,
    policyType: template.policyType,
    createdAt: ts(),
    updatedAt: ts(),
  };
}

/** Create a user template from an existing policy (e.g. "Save as template" from editor). */
export function createUserTemplateFromPolicy(policy: AnnualIncreasePolicy): UserPolicyTemplate {
  const { id: _id, key: _key, ...policyPayload } = policy;
  return createUserTemplate(
    policy.name,
    policy.description ?? '',
    policy.stage,
    policy.policyType,
    policyPayload as Omit<AnnualIncreasePolicy, 'id' | 'key'>
  );
}
