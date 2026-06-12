import type { PolicyActionType } from '../types/compensation-policy';

export interface PolicyActionOption {
  value: PolicyActionType;
  label: string;
  /** Show numeric value input (percent or dollars). */
  valueKind?: 'percent' | 'dollars';
  /** Show free-text metadata input (reason code, label, annotation). */
  metadataKind?: 'text';
}

/** Shared action dropdown options for rule editor and create wizard. */
export const POLICY_ACTION_OPTIONS: PolicyActionOption[] = [
  { value: 'ADD_INCREASE_PERCENT', label: 'Add increase %', valueKind: 'percent' },
  { value: 'ADD_INCREASE_DOLLARS', label: 'Add lump-sum $', valueKind: 'dollars' },
  { value: 'SET_BASE_INCREASE_PERCENT', label: 'Set base increase %', valueKind: 'percent' },
  { value: 'SET_INCREASE_DOLLARS', label: 'Set increase $', valueKind: 'dollars' },
  { value: 'CAP_INCREASE_PERCENT', label: 'Cap increase %', valueKind: 'percent' },
  { value: 'CAP_INCREASE_DOLLARS', label: 'Cap increase $', valueKind: 'dollars' },
  { value: 'FLOOR_INCREASE_PERCENT', label: 'Floor increase %', valueKind: 'percent' },
  { value: 'FLOOR_INCREASE_DOLLARS', label: 'Floor increase $', valueKind: 'dollars' },
  { value: 'FORCE_INCREASE_PERCENT', label: 'Force increase %', valueKind: 'percent' },
  { value: 'FORCE_INCREASE_DOLLARS', label: 'Force increase $', valueKind: 'dollars' },
  { value: 'ZERO_OUT_INCREASE', label: 'Zero out increase' },
  { value: 'FLAG_MANUAL_REVIEW', label: 'Flag manual review', metadataKind: 'text' },
  { value: 'EXCLUDE_FROM_STANDARD_PROCESS', label: 'Exclude from standard process' },
  { value: 'ADD_REASON_CODE', label: 'Add reason code', metadataKind: 'text' },
  { value: 'ADD_POLICY_LABEL', label: 'Add policy label', metadataKind: 'text' },
  { value: 'ANNOTATE_RESULT', label: 'Annotate result', metadataKind: 'text' },
];

export function policyActionUsesValue(type: PolicyActionType): 'percent' | 'dollars' | null {
  const opt = POLICY_ACTION_OPTIONS.find((o) => o.value === type);
  return opt?.valueKind ?? null;
}

export function policyActionUsesMetadata(type: PolicyActionType): boolean {
  return POLICY_ACTION_OPTIONS.some((o) => o.value === type && o.metadataKind === 'text');
}
