// Guarantees that passing simulateLoan's rateSegments snapshot into
// createLoan reproduces the preview schedule byte-for-byte, even if FRED
// publishes a new rate between the two calls. Tests the shared
// buildLoanScheduleData pipeline via its exported building blocks so no DB
// or network I/O is required.

import { filterSegmentsForLoan } from '../domain/loan/LoanService';
import { generateSchedule } from '../domain/repayment/ScheduleGenerator';
import type { FetchedPrimeRateSegment } from '../domain/prime-rate/PrimeRateFetcher';

function pipeline(
  principal: number,
  startDate: string,
  endDate: string,
  source: FetchedPrimeRateSegment[],
): { schedule: ReturnType<typeof generateSchedule>; rateSegments: FetchedPrimeRateSegment[] } {
  const rateSegments = filterSegmentsForLoan(source, startDate, endDate);
  const schedule = generateSchedule(
    principal,
    startDate,
    endDate,
    rateSegments.map((s) => ({ effectiveFrom: s.effectiveFrom, annualRate: s.annualRate })),
  );
  return { schedule, rateSegments };
}

const FRED_HISTORY: FetchedPrimeRateSegment[] = [
  { effectiveFrom: '2020-01-01', effectiveTo: '2022-01-01', annualRate: 0.0325 },
  { effectiveFrom: '2022-01-01', effectiveTo: '2022-07-01', annualRate: 0.035 },
  { effectiveFrom: '2022-07-01', effectiveTo: '2023-07-01', annualRate: 0.055 },
  { effectiveFrom: '2023-07-01', effectiveTo: null, annualRate: 0.085 },
];

describe('simulateLoan → createLoan schedule identity', () => {
  it('passing the simulate snapshot into createLoan produces an identical schedule', () => {
    const principal = 100_000;
    const startDate = '2022-03-15';
    const endDate = '2023-01-31';

    const { schedule: simulateSchedule, rateSegments: snapshot } = pipeline(
      principal,
      startDate,
      endDate,
      FRED_HISTORY,
    );

    const { schedule: createSchedule } = pipeline(principal, startDate, endDate, snapshot);

    expect(createSchedule).toEqual(simulateSchedule);
  });

  it('snapshot isolates the schedule when FRED retroactively adds a mid-loan rate change', () => {
    const principal = 80_000;
    const startDate = '2022-04-15';
    const endDate = '2022-09-30';

    const { schedule: originalSchedule, rateSegments: snapshot } = pipeline(
      principal,
      startDate,
      endDate,
      FRED_HISTORY,
    );

    // Retroactive FRED revision that splits the 2022-01-01 segment mid-loan.
    const updatedHistory: FetchedPrimeRateSegment[] = [
      { effectiveFrom: '2020-01-01', effectiveTo: '2022-01-01', annualRate: 0.0325 },
      { effectiveFrom: '2022-01-01', effectiveTo: '2022-06-01', annualRate: 0.035 },
      { effectiveFrom: '2022-06-01', effectiveTo: '2022-07-01', annualRate: 0.045 },
      { effectiveFrom: '2022-07-01', effectiveTo: '2023-07-01', annualRate: 0.055 },
      { effectiveFrom: '2023-07-01', effectiveTo: null, annualRate: 0.085 },
    ];

    const { schedule: fromSnapshot } = pipeline(principal, startDate, endDate, snapshot);
    const { schedule: fromUpdatedHistory } = pipeline(
      principal,
      startDate,
      endDate,
      updatedHistory,
    );

    expect(fromSnapshot).toEqual(originalSchedule);
    expect(fromSnapshot).not.toEqual(fromUpdatedHistory);
  });

  it('snapshot identity holds for a single-rate loan (trivial snapshot)', () => {
    const singleRate: FetchedPrimeRateSegment[] = [
      { effectiveFrom: '2020-01-01', effectiveTo: null, annualRate: 0.085 },
    ];

    const principal = 50_000;
    const startDate = '2024-01-15';
    const endDate = '2024-06-30';

    const { schedule: simSchedule, rateSegments: snapshot } = pipeline(
      principal,
      startDate,
      endDate,
      singleRate,
    );
    const { schedule: createSchedule } = pipeline(principal, startDate, endDate, snapshot);

    expect(createSchedule).toEqual(simSchedule);
  });
});
