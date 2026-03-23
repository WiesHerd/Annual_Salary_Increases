import { describe, expect, it } from 'vitest';
import { inferMissingProviderTypes } from './infer-missing-provider-type';
import type { ProviderRecord } from '../types/provider';

function row(partial: Partial<ProviderRecord>): ProviderRecord {
  return {
    Employee_ID: '1',
    Specialty: '',
    Population: '',
    ...partial,
  } as ProviderRecord;
}

describe('inferMissingProviderTypes', () => {
  it('leaves non-empty Provider_Type unchanged', () => {
    const r = row({ Provider_Type: 'Physician', Population: 'Mental Health Therapist' });
    expect(inferMissingProviderTypes([r])[0].Provider_Type).toBe('Physician');
  });

  it('infers Mental Health Therapist from Population', () => {
    const r = row({ Population: 'Mental Health Therapist', Provider_Type: '' });
    expect(inferMissingProviderTypes([r])[0].Provider_Type).toBe('Mental Health Therapist');
  });

  it('infers PA from Advanced Practice + Psychiatric PA specialty', () => {
    const r = row({
      Population: 'Advanced Practice Provider',
      Specialty: 'Psychiatric PA',
      Provider_Type: '',
    });
    expect(inferMissingProviderTypes([r])[0].Provider_Type).toBe('PA');
  });

  it('infers NP from Advanced Practice when specialty ends with NP', () => {
    const r = row({
      Population: 'Advanced Practice Provider',
      Specialty: 'Endocrinology NP',
      Provider_Type: '',
    });
    expect(inferMissingProviderTypes([r])[0].Provider_Type).toBe('NP');
  });
});
