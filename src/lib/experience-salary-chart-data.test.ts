import { describe, it, expect } from 'vitest';
import {
  assignExperienceScatterLabelLayouts,
  buildExperienceSalaryChartData,
  type ExperienceSalaryPoint,
} from './experience-salary-chart-data';
import type { ProviderRecord } from '../types/provider';

function record(overrides: Partial<ProviderRecord> & { Employee_ID: string }): ProviderRecord {
  return {
    Employee_ID: overrides.Employee_ID,
    Provider_Name: overrides.Provider_Name,
    Primary_Division: overrides.Primary_Division,
    Specialty: overrides.Specialty,
    Population: overrides.Population,
    Years_of_Experience: overrides.Years_of_Experience,
    Total_YOE: overrides.Total_YOE,
    Current_FTE: overrides.Current_FTE ?? 1,
    Proposed_Base_Salary: overrides.Proposed_Base_Salary,
    Proposed_Salary_at_1FTE: overrides.Proposed_Salary_at_1FTE,
    Current_Base_Salary: overrides.Current_Base_Salary,
    Current_Salary_at_1FTE: overrides.Current_Salary_at_1FTE,
  } as ProviderRecord;
}

describe('buildExperienceSalaryChartData', () => {
  it('returns one series when groupBy is none', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Years_of_Experience: 5,
        Proposed_Base_Salary: 200_000,
        Current_FTE: 1,
      }),
      record({
        Employee_ID: '2',
        Total_YOE: 10,
        Proposed_Salary_at_1FTE: 250_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'none');
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe('All');
    expect(result.series[0].points).toHaveLength(2);
    expect(result.allPoints).toHaveLength(2);
    expect(result.allPoints[0].yoe).toBe(5);
    expect(result.allPoints[0].salaryAt1Fte).toBe(200_000);
    expect(result.allPoints[1].yoe).toBe(10);
    expect(result.allPoints[1].salaryAt1Fte).toBe(250_000);
  });

  it('normalizes salary to 1 FTE when using raw base salary', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Years_of_Experience: 3,
        Proposed_Base_Salary: 160_000,
        Current_FTE: 0.8,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'none');
    expect(result.allPoints[0].salaryAt1Fte).toBe(200_000); // 160k / 0.8
  });

  it('prefers Proposed_Salary_at_1FTE over raw proposed base', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Years_of_Experience: 2,
        Proposed_Base_Salary: 180_000,
        Proposed_Salary_at_1FTE: 190_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'none');
    expect(result.allPoints[0].salaryAt1Fte).toBe(190_000);
  });

  it('falls back to current base at 1 FTE when no proposed', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Years_of_Experience: 7,
        Current_Base_Salary: 210_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'none');
    expect(result.allPoints[0].salaryAt1Fte).toBe(210_000);
  });

  it('uses Total_YOE when Years_of_Experience is missing', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Total_YOE: 4,
        Proposed_Base_Salary: 195_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'none');
    expect(result.allPoints[0].yoe).toBe(4);
  });

  it('excludes records with missing or invalid YOE or salary', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Years_of_Experience: 5,
        Proposed_Base_Salary: 200_000,
        Current_FTE: 1,
      }),
      record({ Employee_ID: '2' } as Partial<ProviderRecord> & { Employee_ID: string }),
      record({
        Employee_ID: '3',
        Years_of_Experience: 10,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'none');
    expect(result.allPoints).toHaveLength(1);
    expect(result.allPoints[0].employeeId).toBe('1');
  });

  it('groups by population when groupBy is population', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Population: 'physician',
        Years_of_Experience: 5,
        Proposed_Base_Salary: 220_000,
        Current_FTE: 1,
      }),
      record({
        Employee_ID: '2',
        Population: 'Mental Health Therapist',
        Years_of_Experience: 8,
        Proposed_Base_Salary: 95_000,
        Current_FTE: 1,
      }),
      record({
        Employee_ID: '3',
        Population: 'physician',
        Years_of_Experience: 12,
        Proposed_Base_Salary: 280_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'population');
    expect(result.series).toHaveLength(2);
    const physician = result.series.find((s) => s.name === 'physician');
    const mht = result.series.find((s) => s.name === 'Mental Health Therapist');
    expect(physician?.points).toHaveLength(2);
    expect(mht?.points).toHaveLength(1);
    expect(result.allPoints).toHaveLength(3);
  });

  it('groups by specialty when groupBy is specialty', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Specialty: 'Primary Care',
        Years_of_Experience: 5,
        Proposed_Base_Salary: 200_000,
        Current_FTE: 1,
      }),
      record({
        Employee_ID: '2',
        Specialty: 'Pediatrics',
        Years_of_Experience: 3,
        Proposed_Base_Salary: 185_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'specialty');
    expect(result.series).toHaveLength(2);
    expect(result.series.map((s) => s.name).sort()).toEqual(['Pediatrics', 'Primary Care']);
  });

  it('uses — for empty group label and groups under one series', () => {
    const records: ProviderRecord[] = [
      record({
        Employee_ID: '1',
        Specialty: '',
        Years_of_Experience: 2,
        Proposed_Base_Salary: 150_000,
        Current_FTE: 1,
      }),
    ];
    const result = buildExperienceSalaryChartData(records, 'specialty');
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe('—');
  });
});

describe('assignExperienceScatterLabelLayouts', () => {
  function pt(id: string, yoe: number, salary: number): ExperienceSalaryPoint {
    return { employeeId: id, yoe, salaryAt1Fte: salary };
  }

  it('cycles label side for points in the same YOE/salary bucket', () => {
    const layouts = assignExperienceScatterLabelLayouts([
      pt('a', 4, 200_000),
      pt('b', 4.2, 202_000),
    ]);
    expect(layouts.get('a')?.position).toBe('right');
    expect(layouts.get('b')?.position).toBe('left');
  });

  it('adds vertical offset when a fifth point shares a bucket', () => {
    const points: ExperienceSalaryPoint[] = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id, i) =>
      pt(id, 6, 225_000 + i * 1000)
    );
    const layouts = assignExperienceScatterLabelLayouts(points);
    expect(layouts.get('e5')?.position).toBe('right');
    expect(layouts.get('e5')?.offset[1]).toBeGreaterThan(0);
  });
});
