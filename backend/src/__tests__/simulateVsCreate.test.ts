/**
 * Scenario D: simulateLoan → createLoan schedule identity.
 *
 * Both `simulateLoan` and `createLoan` delegate to the same
 * `buildLoanScheduleData` pipeline (not exported). We test the pipeline
 * directly via its two exported building blocks — `filterSegmentsForLoan`
 * and `generateSchedule` — avoiding any DB or network I/O while still
 * exercising the full computation path that both service functions share.
 *
 * The guarantee under test:
 *   If the caller passes `simulateLoan`'s returned `rateSegments` snapshot
 *   into `createLoan`, the persisted schedule is byte-for-byte identical to
 *   the preview schedule — even if FRED publishes a new rate between the two
 *   calls.
 */

import { filterSegmentsForLoan } from '../domain/loan/LoanService';
import { generateSchedule } from '../domain/repayment/ScheduleGenerator';
import type { FetchedPrimeRateSegment } from '../domain/prime-rate/PrimeRateFetcher';

/**
 * Replicates the shared `buildLoanScheduleData` pipeline without DB/network.
 *   filterSegmentsForLoan(source, start, end)
 *     → generateSchedule(principal, start, end, mapped segments)
 *
 * This is exactly what both `simulateLoan` and `createLoan` execute; the only
 * difference is whether `source` is the full live FRED history or the snapshot
 * captured at simulation time.
 */
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
    // Loan that spans two rate segments so the snapshot is non-trivial.
    const principal = 100_000;
    const startDate = '2022-03-15';
    const endDate = '2023-01-31';

    // simulateLoan: runs the pipeline against the full FRED history.
    const { schedule: simulateSchedule, rateSegments: snapshot } = pipeline(
      principal,
      startDate,
      endDate,
      FRED_HISTORY,
    );

    // createLoan: runs the same pipeline with the snapshot returned by simulate.
    // filterSegmentsForLoan on an already-filtered snapshot is effectively a
    // no-op, so generateSchedule receives identical inputs → schedules must match.
    const { schedule: createSchedule } = pipeline(principal, startDate, endDate, snapshot);

    expect(createSchedule).toEqual(simulateSchedule);
  });

  it('snapshot isolates the schedule when FRED retroactively adds a mid-loan rate change', () => {
    // A loan where the simulate snapshot captured two segments.
    const principal = 80_000;
    const startDate = '2022-04-15';
    const endDate = '2022-09-30';

    // simulateLoan with the original history — snapshot is captured here.
    const { schedule: originalSchedule, rateSegments: snapshot } = pipeline(
      principal,
      startDate,
      endDate,
      FRED_HISTORY,
    );

    // After simulation, FRED publishes a revision that splits the 2022-01-01
    // segment at 2022-06-01 with a higher rate — this overlaps the loan period.
    const updatedHistory: FetchedPrimeRateSegment[] = [
      { effectiveFrom: '2020-01-01', effectiveTo: '2022-01-01', annualRate: 0.0325 },
      { effectiveFrom: '2022-01-01', effectiveTo: '2022-06-01', annualRate: 0.035 },
      { effectiveFrom: '2022-06-01', effectiveTo: '2022-07-01', annualRate: 0.045 }, // new revision
      { effectiveFrom: '2022-07-01', effectiveTo: '2023-07-01', annualRate: 0.055 },
      { effectiveFrom: '2023-07-01', effectiveTo: null, annualRate: 0.085 },
    ];

    // createLoan with snapshot: must reproduce exactly what the user previewed.
    const { schedule: fromSnapshot } = pipeline(principal, startDate, endDate, snapshot);

    // Running without the snapshot against updated FRED gives a different schedule
    // (the new 4.5% segment changes the June interest).
    const { schedule: fromUpdatedHistory } = pipeline(
      principal,
      startDate,
      endDate,
      updatedHistory,
    );

    expect(fromSnapshot).toEqual(originalSchedule);        // snapshot is stable
    expect(fromSnapshot).not.toEqual(fromUpdatedHistory);  // update would have changed it
  });

  it('snapshot identity holds for a single-rate loan (trivial snapshot)', () => {
    // Even when the snapshot contains only one segment, the round-trip is exact.
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
