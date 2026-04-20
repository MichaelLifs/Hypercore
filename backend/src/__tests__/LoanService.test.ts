import { assertValidCreateLoanInput, filterSegmentsForLoan } from '../domain/loan/LoanService';
import type { FetchedPrimeRateSegment } from '../domain/prime-rate/PrimeRateFetcher';

function seg(
  effectiveFrom: string,
  effectiveTo: string | null,
  annualRate: number,
): FetchedPrimeRateSegment {
  return { effectiveFrom, effectiveTo, annualRate };
}

describe('filterSegmentsForLoan', () => {
  const history: FetchedPrimeRateSegment[] = [
    seg('2020-01-01', '2022-01-01', 0.0325),
    seg('2022-01-01', '2022-07-01', 0.035),
    seg('2022-07-01', '2023-07-01', 0.055),
    seg('2023-07-01', null, 0.085),
  ];

  it('returns only segments that overlap the loan period', () => {
    const result = filterSegmentsForLoan(history, '2022-03-01', '2022-10-01');

    expect(result).toHaveLength(2);
    expect(result[0].effectiveFrom).toBe('2022-01-01');
    expect(result[1].effectiveFrom).toBe('2022-07-01');
  });

  it('includes the segment that was in effect at startDate even when it started earlier', () => {
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
    expect(() =>
      filterSegmentsForLoan(history, '2019-01-01', '2019-12-31'),
    ).toThrow();
  });

  it('throws when history is empty', () => {
    expect(() => filterSegmentsForLoan([], '2024-01-01', '2025-01-01')).toThrow();
  });

  it('throws when a segment starts after startDate and nothing covers startDate', () => {
    const sparse = [seg('2024-02-01', null, 0.085)];
    expect(() =>
      filterSegmentsForLoan(sparse, '2024-01-01', '2025-01-01'),
    ).toThrow(/no prime rate in effect on loan start date/i);
  });

  it('does not include segments whose effectiveTo is on or before startDate', () => {
    const result = filterSegmentsForLoan(history, '2022-01-01', '2022-06-01');

    expect(result.every((s) => s.effectiveFrom !== '2020-01-01')).toBe(true);
    expect(result[0].effectiveFrom).toBe('2022-01-01');
  });

  it('rejects an absurd annual rate (> 50%)', () => {
    const abusive = [seg('2020-01-01', null, 10)];
    expect(() => filterSegmentsForLoan(abusive, '2024-01-01', '2024-06-30')).toThrow(
      /exceeds the permitted maximum/i,
    );
  });

  it('accepts the documented maximum (50%) exactly', () => {
    const atMax = [seg('2020-01-01', null, 0.5)];
    expect(() => filterSegmentsForLoan(atMax, '2024-01-01', '2024-06-30')).not.toThrow();
  });

  it('rejects a negative annual rate', () => {
    const negative = [seg('2020-01-01', null, -0.01)];
    expect(() => filterSegmentsForLoan(negative, '2024-01-01', '2024-06-30')).toThrow(
      /non-negative annualRate/i,
    );
  });

  it('rejects a non-finite annual rate (NaN)', () => {
    const nanRate = [seg('2020-01-01', null, Number.NaN)];
    expect(() => filterSegmentsForLoan(nanRate, '2024-01-01', '2024-06-30')).toThrow(
      /finite non-negative annualRate/i,
    );
  });

  it('rejects a malformed effectiveFrom ISO date', () => {
    const bad = [seg('not-a-date', null, 0.05)];
    expect(() => filterSegmentsForLoan(bad, '2024-01-01', '2024-06-30')).toThrow();
  });

  it('rejects a segment whose effectiveTo is on or before effectiveFrom', () => {
    const zeroWidth = [seg('2024-01-01', '2024-01-01', 0.05)];
    expect(() => filterSegmentsForLoan(zeroWidth, '2024-01-02', '2024-06-30')).toThrow(
      /strictly after effectiveFrom/i,
    );

    const negativeWidth = [seg('2024-02-01', '2024-01-01', 0.05)];
    expect(() => filterSegmentsForLoan(negativeWidth, '2024-03-01', '2024-06-30')).toThrow(
      /strictly after effectiveFrom/i,
    );
  });
});
