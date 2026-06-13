import { describe, it, expect } from 'vitest';
import {
  parseControlsTabFromSearchParams,
  CONTROLS_DEFAULT_TAB,
  CONTROLS_TAB_IDS,
} from './controls-tab-url';

describe('controls-tab-url', () => {
  it('defaults to policy library tab id', () => {
    expect(CONTROLS_DEFAULT_TAB).toBe('review-cycles');
    expect(CONTROLS_TAB_IDS).toContain('policy-engine-rules');
  });

  it('parses legacy and modern tab query params', () => {
    expect(parseControlsTabFromSearchParams(new URLSearchParams('tab=policy-engine&ruleId=x'))).toBe(
      'policy-engine-rules'
    );
    expect(parseControlsTabFromSearchParams(new URLSearchParams('tab=merit'))).toBe('merit');
    expect(parseControlsTabFromSearchParams(new URLSearchParams('tab=cycle'))).toBe('review-cycles');
    expect(parseControlsTabFromSearchParams(new URLSearchParams(''))).toBeNull();
  });
});
