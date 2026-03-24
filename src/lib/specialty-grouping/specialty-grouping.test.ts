import { describe, it, expect } from 'vitest';
import { resolveSpecialtyGroup, buildRegistry, applyStructuralRules } from './index';
import type { UserLearnedSynonym } from './types';

describe('resolveSpecialtyGroup', () => {
  it('Layer 1 exact canonical (normalized case)', () => {
    const r = resolveSpecialtyGroup('Family Medicine');
    expect(r.assignedSpecialtyGroup).toBe('Primary Care');
    expect(r.matchMethod).toBe('exact');
    expect(r.reviewFlag).toBe(false);
    expect(r.confidenceScore).toBeGreaterThanOrEqual(0.99);
  });

  it('Layer 2 synonym', () => {
    const r = resolveSpecialtyGroup('Peds Cardiology');
    expect(r.assignedSpecialtyGroup).toBe('Pediatric Medical');
    expect(['synonym', 'normalized', 'rule', 'exact']).toContain(r.matchMethod);
    expect(r.assignedCanonicalSpecialty).toContain('Cardiology');
  });

  it('Layer 3 normalized — punctuation/spacing', () => {
    const r = resolveSpecialtyGroup('  cardiology  -  GENERAL  ');
    expect(r.assignedSpecialtyGroup).toBe('Medical');
    expect(['exact', 'normalized', 'synonym']).toContain(r.matchMethod);
  });

  it('pediatric urology routes to Pediatric Surgical', () => {
    const r = resolveSpecialtyGroup('Pediatric Urology');
    expect(r.assignedSpecialtyGroup).toBe('Pediatric Surgical');
    expect(['rule', 'synonym', 'exact', 'normalized']).toContain(r.matchMethod);
  });

  it('Layer 5 adult radiology interventional → Hospital Based', () => {
    const r = resolveSpecialtyGroup('Interventional Rad');
    expect(r.assignedSpecialtyGroup).toBe('Hospital Based');
    expect(['synonym', 'normalized', 'token', 'rule']).toContain(r.matchMethod);
  });

  it('Layer 5 emergency medicine adult → Hospital Based', () => {
    const r = resolveSpecialtyGroup('Emergency Medicine');
    expect(r.assignedSpecialtyGroup).toBe('Hospital Based');
  });

  it('CRNA → APPs - General', () => {
    const r = resolveSpecialtyGroup('Certified Registered Nurse Anesthetist');
    expect(r.assignedSpecialtyGroup).toBe('APPs - General');
  });

  it('Pediatric emergency → Pediatric Hospital Based', () => {
    const r = resolveSpecialtyGroup('Pediatrics - Emergency Medicine');
    expect(r.assignedSpecialtyGroup).toBe('Pediatric Hospital Based');
  });

  it('Neonatology → Pediatric Hospital Based', () => {
    const r = resolveSpecialtyGroup('Neonatal');
    expect(r.assignedSpecialtyGroup).toBe('Pediatric Hospital Based');
  });

  it('unknown label returns null group and review', () => {
    const r = resolveSpecialtyGroup('Completely Unknown Fictional Subspecialty XYZ');
    expect(r.assignedSpecialtyGroup).toBeNull();
    expect(r.reviewFlag).toBe(true);
  });

  it('user-learned synonym merges into registry', () => {
    const userSynonyms: UserLearnedSynonym[] = [
      {
        synonymNormalized: 'totally custom label',
        canonicalSpecialty: 'Family Medicine',
        specialtyGroup: 'Primary Care',
        approvedAt: new Date().toISOString(),
      },
    ];
    const r = resolveSpecialtyGroup('Totally Custom Label', { userSynonyms });
    expect(r.assignedSpecialtyGroup).toBe('Primary Care');
    expect(['synonym', 'exact', 'normalized']).toContain(r.matchMethod);
  });
});

describe('applyStructuralRules', () => {
  it('pediatrics + cardiology', () => {
    const c = applyStructuralRules('Peds Cardiology');
    expect(c?.specialtyGroup).toBe('Pediatric Medical');
  });
});

describe('buildRegistry', () => {
  it('includes seed rows', () => {
    const reg = buildRegistry();
    expect(reg.records.length).toBeGreaterThan(10);
  });
});
