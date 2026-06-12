import { describe, it, expect } from 'vitest';
import { computeWorkflowSteps, workflowProgress } from './workflow-checklist';

describe('workflow-checklist', () => {
  const baseInput = {
    recordsCount: 0,
    marketRowCount: 0,
    cycles: [],
    meritMatrix: [],
    policies: [],
    mappingCount: 0,
    budgetSettings: [],
    selectedCycleId: 'FY2025',
    hasReviewedProviders: false,
  };

  it('marks all steps incomplete for empty workspace', () => {
    const steps = computeWorkflowSteps(baseInput);
    expect(steps.every((s) => !s.ready)).toBe(true);
    expect(workflowProgress(steps)).toEqual({ complete: 0, total: 8 });
  });

  it('marks providers and market ready when data exists', () => {
    const steps = computeWorkflowSteps({
      ...baseInput,
      recordsCount: 120,
      marketRowCount: 45,
    });
    expect(steps.find((s) => s.id === 'providers')?.ready).toBe(true);
    expect(steps.find((s) => s.id === 'market')?.ready).toBe(true);
    expect(workflowProgress(steps).complete).toBe(2);
  });

  it('marks budget ready when cycle has a positive target', () => {
    const steps = computeWorkflowSteps({
      ...baseInput,
      budgetSettings: [{ id: 'b1', cycleId: 'FY2025', budgetTargetAmount: 500000 }],
    });
    expect(steps.find((s) => s.id === 'budget')?.ready).toBe(true);
  });
});
