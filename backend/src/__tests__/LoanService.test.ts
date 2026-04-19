import { assertValidCreateLoanInput, filterSegmentsForLoan } from '../domain/loan/LoanService';
import type { FetchedPrimeRateSegment } from '../domain/prime-rate/PrimeRateFetcher';

// ---------------------------------------------------------------------------
// assertValidCreateLoanInput — covered by createLoanInput.test.ts; only
// additional cases that improve signal are added here.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// filterSegmentsForLoan
// ---------------------------------------------------------------------------

function seg(
  effectiveFrom: string,
  effectiveTo: string | null,
  annualRate: number,
): FetchedPrimeRateSegment {
  return { effectiveFrom, effectiveTo, annualRate };
}

describe('filterSegmentsForLoan', () => {
  /**
   * Represents a simplified FRED-like history:
   *   A  2020-01-01 → 2022-01-01  @ 3.25%
   *   B  2022-01-01 → 2022-07-01  @ 3.50%
   *   C  2022-07-01 → 2023-07-01  @ 5.50%
   *   D  2023-07-01 → open-ended  @ 8.50%
   */
  const history: FetchedPrimeRateSegment[] = [
    seg('2020-01-01', '2022-01-01', 0.0325),
    seg('2022-01-01', '2022-07-01', 0.035),
    seg('2022-07-01', '2023-07-01', 0.055),
    seg('2023-07-01', null, 0.085),
  ];

  it('returns only segments that overlap the loan period', () => {
    // Loan [2022-03-01, 2022-10-01] overlaps B and C; A ends before start, D starts after end.
    const result = filterSegmentsForLoan(history, '2022-03-01', '2022-10-01');

    expect(result).toHaveLength(2);
    expect(result[0].effectiveFrom).toBe('2022-01-01'); // B covers start
    expect(result[1].effectiveFrom).toBe('2022-07-01'); // C mid-loan rate change
  });

  it('includes the segment that was in effect at startDate even when it started earlier', () => {
    // Loan [2022-06-01, 2022-12-01]: B is active at start even though B began 2022-01-01.
    const result = filterSegmentsForLoan(history, '2022-06-01', '2022-12-01');

    expect(result[0].effectiveFrom).toBe('2022-01-01');
    expect(result[0].annualRate).toBe(0.035);
  });

  it('handles a loan covered entirely by a single open-ended segment', () => {
    const result = filterSegmentsForLoan(history, '2024-01-01', '2025-01-01');

    expect(result).toHaveLength(1);
    expect(result[0].effectiveFrom).toBe('2023-07-01');
    expect(result[0].effectiveTo).toBeNull();
  });

  it('throws when the loan starts before the first available rate', () => {
    // No segment has effectiveFrom <= 2019-01-01 AND overlaps the loan.
    expect(() =>
      filterSegmentsForLoan(history, '2019-01-01', '2019-12-31'),
    ).toThrow();
  });

  it('throws when history is empty', () => {
    expect(() => filterSegmentsForLoan([], '2024-01-01', '2025-01-01')).toThrow();
  });

  it('throws when a segment starts after startDate and nothing covers startDate', () => {
    // Single segment that starts a month after the loan.
    const sparse = [seg('2024-02-01', null, 0.085)];
    expect(() =>
      filterSegmentsForLoan(sparse, '2024-01-01', '2025-01-01'),
    ).toThrow(/no prime rate in effect on loan start date/i);
  });

  it('does not include segments whose effectiveTo is on or before startDate', () => {
    // A ends 2022-01-01 — loan starts 2022-01-01.  effectiveTo (exclusive) = startDate → no overlap.
    const result = filterSegmentsForLoan(history, '2022-01-01', '2022-06-01');

    // A: effectiveTo=2022-01-01, compareIso('2022-01-01', '2022-01-01') = 0, not > 0 → excluded
    expect(result.every((s) => s.effectiveFrom !== '2020-01-01')).toBe(true);
    expect(result[0].effectiveFrom).toBe('2022-01-01'); // B covers start
  });
});
