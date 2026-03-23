/**
 * Effective years of experience for compensation rules.
 * For advanced practice providers, prefer APP_YOE when populated so NP/PA tenure
 * is not conflated with physician YOE fields.
 */

import type { ProviderRecord } from '../types/provider';

const APP_PROVIDER_TYPE_EXACT = new Set(
  [
    'app',
    'np',
    'pa',
    'aprn',
    'crna',
    'arnp',
    'fnp',
    'anp',
    'whnp',
    'apc',
    'apnp',
    'cnm',
    'nm',
    'midwife',
    'pa-c',
    'pac',
  ].map((s) => s.toLowerCase())
);

/**
 * True when Provider_Type indicates NP/PA/APP-style roles (case-insensitive).
 * Avoids treating staff physicians as APPs.
 */
export function isAdvancedPracticeProviderType(providerType: string | undefined): boolean {
  const t = (providerType ?? '').trim().toLowerCase();
  if (!t) return false;
  if (APP_PROVIDER_TYPE_EXACT.has(t)) return true;
  if (t.includes('nurse practitioner')) return true;
  if (t.includes('physician assistant') || t.includes('physician associate')) return true;
  if (t.includes('advanced practice')) return true;
  return false;
}

/**
 * YOE used for experience bands, policy facts, and YOE tier models.
 * Uses APP_YOE when the row is an APP type and APP_YOE is numeric; otherwise Years_of_Experience ?? Total_YOE.
 */
export function getEffectiveYoe(record: ProviderRecord): number | undefined {
  if (isAdvancedPracticeProviderType(record.Provider_Type)) {
    const appYoe = record.APP_YOE;
    if (appYoe != null && Number.isFinite(appYoe)) return appYoe;
  }
  const y = record.Years_of_Experience ?? record.Total_YOE;
  if (y != null && Number.isFinite(y)) return y;
  return undefined;
}
