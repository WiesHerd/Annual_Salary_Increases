import { describe, it, expect } from 'vitest';
import type { ProviderRecord } from '../types/provider';
import { exportReviewTableToCsv } from './review-table-export';

describe('exportReviewTableToCsv', () => {
  it('exports visible columns with formatted headers', () => {
    const records: ProviderRecord[] = [
      {
        Employee_ID: 'e1',
        Provider_Name: 'Alice Smith',
        Current_Base_Salary: 200_000,
        Proposed_Base_Salary: 210_000,
        Approved_Increase_Percent: 5,
      },
    ];
    const csv = exportReviewTableToCsv({
      records,
      columnIds: ['providerName', 'currentBaseSalary', 'approvedIncreasePercent'],
      experienceBands: [],
    });
    expect(csv).toContain('Provider Name');
    expect(csv).toContain('Alice Smith');
    expect(csv).toContain('200,000.00');
    expect(csv).toContain('5.00%');
    expect(csv).not.toContain('compareCheckbox');
  });
});
