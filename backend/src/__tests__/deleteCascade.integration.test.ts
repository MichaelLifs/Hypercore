// Regression guard: `clearTestLoans` used to rely on an FK cascade that this
// DataSource never enforces, leaking orphan rate_segments / repayment_entries
// rows on every call. Exercises a temp-file DB to assert zero orphans.

import fs from 'fs';
import os from 'os';
import path from 'path';

// Must be set BEFORE importing anything that touches the DataSource.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blm-cascade-'));
const tempDbPath = path.join(tempDir, 'cascade.db');
process.env.DB_PATH = tempDbPath;

/* eslint-disable import/first */
import { AppDataSource } from '../database/dataSource';
import { Loan } from '../domain/loan/Loan.entity';
import { LoanRateSegment } from '../domain/prime-rate/LoanRateSegment.entity';
import { RepaymentEntry } from '../domain/repayment/RepaymentEntry.entity';
import { createLoan, deleteLoan, deleteLoansByIds } from '../domain/loan/LoanService';
import { clearTestLoans, TEST_LOAN_PREFIX } from '../domain/loan/testDataSeed';
import type { FetchedPrimeRateSegment } from '../domain/prime-rate/PrimeRateFetcher';
/* eslint-enable import/first */

// A single closed-form rate snapshot covering every scenario below, so no
// network I/O ever fires during the test run.
const SEED_SEGMENTS: FetchedPrimeRateSegment[] = [
  { effectiveFrom: '2010-01-01', effectiveTo: null, annualRate: 0.085 },
];

async function countChildren(loanId: string): Promise<{ rates: number; entries: number }> {
  const rates = await AppDataSource.getRepository(LoanRateSegment).count({ where: { loanId } });
  const entries = await AppDataSource.getRepository(RepaymentEntry).count({ where: { loanId } });
  return { rates, entries };
}

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

beforeEach(async () => {
  // Wipe every table between tests so assertions are independent.
  await AppDataSource.getRepository(RepaymentEntry).clear();
  await AppDataSource.getRepository(LoanRateSegment).clear();
  await AppDataSource.getRepository(Loan).clear();
});

describe('deleteLoan cascade', () => {
  it('removes the loan and every child row in a single transaction', async () => {
    const loan = await createLoan({
      name: 'Cascade single',
      principal: 100_000,
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      rateSegments: SEED_SEGMENTS,
    });

    const before = await countChildren(loan.id);
    expect(before.rates).toBeGreaterThan(0);
    expect(before.entries).toBeGreaterThan(0);

    const removed = await deleteLoan(loan.id);
    expect(removed).toBe(true);

    const after = await countChildren(loan.id);
    expect(after.rates).toBe(0);
    expect(after.entries).toBe(0);

    const stillThere = await AppDataSource.getRepository(Loan).findOne({ where: { id: loan.id } });
    expect(stillThere).toBeNull();
  });

  it('returns false and changes nothing when the id does not exist', async () => {
    const removed = await deleteLoan('00000000-0000-0000-0000-000000000000');
    expect(removed).toBe(false);
  });
});

describe('deleteLoansByIds', () => {
  it('is a no-op for an empty id list (no transaction issued)', async () => {
    const affected = await deleteLoansByIds([]);
    expect(affected).toBe(0);
  });

  it('removes multiple loans atomically, each with its child rows', async () => {
    const a = await createLoan({
      name: 'Bulk A',
      principal: 50_000,
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      rateSegments: SEED_SEGMENTS,
    });
    const b = await createLoan({
      name: 'Bulk B',
      principal: 75_000,
      startDate: '2024-02-01',
      endDate: '2024-07-31',
      rateSegments: SEED_SEGMENTS,
    });

    const affected = await deleteLoansByIds([a.id, b.id]);
    expect(affected).toBe(2);

    expect(await countChildren(a.id)).toEqual({ rates: 0, entries: 0 });
    expect(await countChildren(b.id)).toEqual({ rates: 0, entries: 0 });
  });
});

describe('clearTestLoans cascade (regression)', () => {
  it('removes all TEST_LOAN_PREFIX loans together with their rate segments and schedule rows', async () => {
    const prefixed = await createLoan({
      name: `${TEST_LOAN_PREFIX}Cascade demo`,
      principal: 100_000,
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      rateSegments: SEED_SEGMENTS,
    });
    const untouched = await createLoan({
      name: 'Real customer loan',
      principal: 200_000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rateSegments: SEED_SEGMENTS,
    });

    const before = await countChildren(prefixed.id);
    expect(before.rates).toBeGreaterThan(0);
    expect(before.entries).toBeGreaterThan(0);

    const cleared = await clearTestLoans();
    expect(cleared).toBe(1);

    // The exact assertion the old implementation silently failed: Loan row
    // deleted, children left behind as orphans.
    const afterPrefixed = await countChildren(prefixed.id);
    expect(afterPrefixed.rates).toBe(0);
    expect(afterPrefixed.entries).toBe(0);

    const untouchedCount = await countChildren(untouched.id);
    expect(untouchedCount.rates).toBeGreaterThan(0);
    expect(untouchedCount.entries).toBeGreaterThan(0);

    const orphanRates = await AppDataSource.query(`
      SELECT COUNT(*) AS n FROM loan_rate_segments
      WHERE loanId NOT IN (SELECT id FROM loans)
    `);
    const orphanEntries = await AppDataSource.query(`
      SELECT COUNT(*) AS n FROM repayment_entries
      WHERE loanId NOT IN (SELECT id FROM loans)
    `);
    expect(Number(orphanRates[0].n)).toBe(0);
    expect(Number(orphanEntries[0].n)).toBe(0);
  });

  it('returns 0 and is a safe no-op when no test-prefixed loans exist', async () => {
    await createLoan({
      name: 'Real customer loan only',
      principal: 200_000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rateSegments: SEED_SEGMENTS,
    });

    const cleared = await clearTestLoans();
    expect(cleared).toBe(0);

    const loans = await AppDataSource.getRepository(Loan).find();
    expect(loans).toHaveLength(1);
  });
});
