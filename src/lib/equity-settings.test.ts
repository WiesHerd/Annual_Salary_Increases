import { describe, it, expect } from 'vitest';
import type { ExperienceBand } from '../types/experience-band';
import {
  resolveEquityBandSettings,
  describeEquityBandSettings,
  bandHasDollarRangeConfig,
} from './equity-settings';

const BASE_BAND: ExperienceBand = {
  id: 'b1',
  label: '0-2 YOE',
  minYoe: 0,
  maxYoe: 2,
  targetTccPercentileLow: 25,
  targetTccPercentileHigh: 50,
};

describe('resolveEquityBandSettings', () => {
  it('defaults to disabled when no flags set', () => {
    expect(resolveEquityBandSettings(BASE_BAND).enabled).toBe(false);
  });

  it('migrates legacy suggestBaseToHitTarget', () => {
    const s = resolveEquityBandSettings({ ...BASE_BAND, suggestBaseToHitTarget: true });
    expect(s.enabled).toBe(true);
    expect(s.targetPoint).toBe('percentileLow');
  });

  it('migrates legacy dollar midpoint when dollar range configured', () => {
    const band: ExperienceBand = {
      ...BASE_BAND,
      suggestBaseToHitDollarRangeMidpoint: true,
      dollarRangeAnchorPercentile: 50,
      dollarRangeMinSpreadPercent: 20,
      dollarRangeMaxSpreadPercent: 20,
    };
    const s = resolveEquityBandSettings(band);
    expect(s.enabled).toBe(true);
    expect(s.targetPoint).toBe('dollarMidpoint');
    expect(s.preferDollarTarget).toBe(true);
  });

  it('respects explicit equity config over legacy', () => {
    const s = resolveEquityBandSettings({
      ...BASE_BAND,
      equitySuggestionsEnabled: true,
      equityTargetPoint: 'percentileMid',
      equityGapClosePercent: 50,
      equityJudgeOn: 'current',
    });
    expect(s.targetPoint).toBe('percentileMid');
    expect(s.gapClosePercent).toBe(50);
    expect(s.judgeOn).toBe('current');
  });
});

describe('bandHasDollarRangeConfig', () => {
  it('is false without spreads', () => {
    expect(bandHasDollarRangeConfig(BASE_BAND)).toBe(false);
  });

  it('is true with anchor percentile and spreads', () => {
    expect(
      bandHasDollarRangeConfig({
        ...BASE_BAND,
        dollarRangeAnchorPercentile: 50,
        dollarRangeMinSpreadPercent: 10,
        dollarRangeMaxSpreadPercent: 10,
      })
    ).toBe(true);
  });
});

describe('describeEquityBandSettings', () => {
  it('explains disabled state', () => {
    expect(describeEquityBandSettings(BASE_BAND)).toContain('off');
  });

  it('explains enabled percentile low target', () => {
    const text = describeEquityBandSettings({
      ...BASE_BAND,
      equitySuggestionsEnabled: true,
      equityTargetPoint: 'percentileLow',
    });
    expect(text).toContain('percentile');
    expect(text).toContain('full gap');
  });
});
