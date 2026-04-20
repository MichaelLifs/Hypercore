import { AppDataSource } from '../../database/dataSource';
import { Loan } from './Loan.entity';
import { createLoan, deleteLoansByIds, type CreateLoanInput } from './LoanService';
import type { FetchedPrimeRateSegment } from '../prime-rate/PrimeRateFetcher';

// Prefix marks loans as seed data. A prefix (rather than a separate column)
// keeps the schema identical to production so seeded loans exercise the real
// read/write/display paths.
export const TEST_LOAN_PREFIX = 'TEST - ';

interface TestLoanScenario {
  label: string;
  principal: number;
  startDate: string;
  endDate: string;
  /** Forces a specific rate history for edge cases FRED can't reliably reproduce. */
  rateSegments?: FetchedPrimeRateSegment[];
  edgeCase: string;
}

// Scenarios mirror the edge cases in __tests__/ScheduleGenerator.test.ts so
// the UI can showcase each 30E/360 corner case against real schedules.
export const TEST_LOAN_SCENARIOS: TestLoanScenario[] = [
  {
    label: 'Mid-month start (Jan 15 → Apr 5)',
    principal: 100_000,
    startDate: '2024-01-15',
    endDate: '2024-04-05',
    edgeCase: 'Mid-month start: first coupon uses inclusive fractional accrual',
  },
  {
    label: 'Maturity not on month-end (Jan 1 → Apr 15)',
    principal: 150_000,
    startDate: '2024-01-01',
    endDate: '2024-04-15',
    edgeCase: 'Maturity day is not the last day of the month',
  },
  {
    label: 'Full-month periods (May 1 → Aug 31)',
    principal: 200_000,
    startDate: '2024-05-01',
    endDate: '2024-08-31',
    edgeCase: 'Whole-month accruals, final row pays full principal',
  },
  {
    label: 'Leap year Feb 29 maturity',
    principal: 100_000,
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    edgeCase: 'ISDA Feb-maturity exception: 29 day-count (not 30, not 28)',
  },
  {
    label: 'Non-leap Feb 28 maturity',
    principal: 100_000,
    startDate: '2023-02-01',
    endDate: '2023-02-28',
    edgeCase: 'Non-leap February: 28 day-count',
  },
  {
    label: 'Start on the 31st (Jan 31 → Apr 30)',
    principal: 100_000,
    startDate: '2024-01-31',
    endDate: '2024-04-30',
    edgeCase: '30E/360 dd1=31→30 normalization on start date',
  },
  {
    label: 'Short same-month loan (Mar 10 → Mar 25)',
    principal: 50_000,
    startDate: '2024-03-10',
    endDate: '2024-03-25',
    edgeCase: 'Single PRINCIPAL_AND_INTEREST row, inclusive day count',
  },
  {
    label: 'Multi-month spanning year boundary',
    principal: 250_000,
    startDate: '2023-11-17',
    endDate: '2024-05-09',
    edgeCase: 'Schedule sum matches 30E/360 day-count across multiple months',
  },
  {
    label: 'Long-dated loan across rate hikes (2022 → 2024)',
    principal: 500_000,
    startDate: '2022-01-01',
    endDate: '2024-12-31',
    edgeCase: 'Rate changes during loan: uses real FRED history over Fed hike cycle',
  },
  {
    label: 'Rate change mid-period (Feb 15, leap year)',
    principal: 100_000,
    startDate: '2024-01-15',
    endDate: '2024-02-29',
    rateSegments: [
      { effectiveFrom: '2020-01-01', effectiveTo: '2024-02-15', annualRate: 0.06 },
      { effectiveFrom: '2024-02-15', effectiveTo: null, annualRate: 0.12 },
    ],
    edgeCase: 'Rate change inside an accrual period: split-additive interest',
  },
  {
    label: 'Rate change exactly on coupon date (Jan 31)',
    principal: 100_000,
    startDate: '2024-01-01',
    endDate: '2024-02-29',
    rateSegments: [
      { effectiveFrom: '2020-01-01', effectiveTo: '2024-01-31', annualRate: 0.06 },
      { effectiveFrom: '2024-01-31', effectiveTo: null, annualRate: 0.12 },
    ],
    edgeCase: 'Rate change lands on coupon day: new rate applies to next period',
  },
  {
    label: 'Zero-interest loan',
    principal: 100_000,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    rateSegments: [
      { effectiveFrom: '2020-01-01', effectiveTo: null, annualRate: 0 },
    ],
    edgeCase: 'Zero-rate loan: every row produces zero interest',
  },
];

export interface SeedTestLoansResult {
  created: number;
  skipped: number;
  cleared: number;
  createdLabels: string[];
}

// Delegates to deleteLoansByIds so every delete path uses the same explicit
// child-first deletion. A prior `DELETE FROM loans WHERE name LIKE …`
// implementation relied on SQLite FK cascades that never fire under this
// DataSource and silently leaked orphan rows.
export async function clearTestLoans(): Promise<number> {
  const repo = AppDataSource.getRepository(Loan);
  const rows = await repo
    .createQueryBuilder('l')
    .select('l.id', 'id')
    .where('l.name LIKE :prefix', { prefix: `${TEST_LOAN_PREFIX}%` })
    .getRawMany<{ id: string }>();
  return deleteLoansByIds(rows.map((r) => r.id));
}

export async function seedTestLoans(clearFirst: boolean): Promise<SeedTestLoansResult> {
  const cleared = clearFirst ? await clearTestLoans() : 0;

  const repo = AppDataSource.getRepository(Loan);
  const existing = await repo
    .createQueryBuilder('l')
    .select('l.name', 'name')
    .where('l.name LIKE :prefix', { prefix: `${TEST_LOAN_PREFIX}%` })
    .getRawMany<{ name: string }>();
  const existingNames = new Set(existing.map((row) => row.name));

  const createdLabels: string[] = [];
  let skipped = 0;

  for (const scenario of TEST_LOAN_SCENARIOS) {
    const name = `${TEST_LOAN_PREFIX}${scenario.label}`;
    if (existingNames.has(name)) {
      skipped += 1;
      continue;
    }

    const input: CreateLoanInput = {
      name,
      principal: scenario.principal,
      startDate: scenario.startDate,
      endDate: scenario.endDate,
      rateSegments: scenario.rateSegments,
    };
    await createLoan(input);
    createdLabels.push(scenario.label);
  }

  return {
    created: createdLabels.length,
    skipped,
    cleared,
    createdLabels,
  };
}
