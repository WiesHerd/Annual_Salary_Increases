import type { ProviderRecord } from '../types/provider';

/**
 * Fills Provider_Type when blank using Population / Specialty (legacy rows before Provider_Type existed).
 */
export function inferMissingProviderTypes(records: ProviderRecord[]): ProviderRecord[] {
  return records.map((r) => {
    if ((r.Provider_Type ?? '').trim() !== '') return r;
    const pop = (r.Population ?? '').trim().toLowerCase();
    if (pop === 'mental health therapist') return { ...r, Provider_Type: 'Mental Health Therapist' };
    if (pop === 'division chief' || pop === 'staff physician') return { ...r, Provider_Type: 'Physician' };
    if (pop === 'advanced practice provider') {
      const s = (r.Specialty ?? '').trim();
      if (/\bPA\b$/i.test(s) || /^PA\b/i.test(s) || /\sPA$/i.test(s)) return { ...r, Provider_Type: 'PA' };
      if (/\bNP\b$/i.test(s) || /^NP\b/i.test(s) || /\sNP$/i.test(s)) return { ...r, Provider_Type: 'NP' };
      return { ...r, Provider_Type: 'NP' };
    }
    return r;
  });
}
