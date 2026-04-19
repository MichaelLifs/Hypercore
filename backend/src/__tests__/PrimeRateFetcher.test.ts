import { parsePrimeRateCsv } from '../domain/prime-rate/PrimeRateFetcher';

const HEADER = 'DATE,PRIME';

describe('parsePrimeRateCsv', () => {
  it('parses a well-formed CSV into chronological segments', () => {
    const csv = [HEADER, '2020-01-01,3.25', '2022-03-17,3.5', '2024-09-19,8.0'].join('\n');
    const segments = parsePrimeRateCsv(csv);

    expect(segments).toHaveLength(3);

    expect(segments[0]).toEqual({
      effectiveFrom: '2020-01-01',
      effectiveTo: '2022-03-17',
      annualRate: 0.0325,
    });
    expect(segments[1]).toEqual({
      effectiveFrom: '2022-03-17',
      effectiveTo: '2024-09-19',
      annualRate: 0.035,
    });
    expect(segments[2]).toEqual({
      effectiveFrom: '2024-09-19',
      effectiveTo: null,
      annualRate: 0.08,
    });
  });

  it('converts percentage to decimal fraction', () => {
    const csv = [HEADER, '2024-01-01,8.5'].join('\n');
    const [seg] = parsePrimeRateCsv(csv);
    // 8.5% → 0.085; use toBeCloseTo to tolerate IEEE-754 representation
    expect(seg.annualRate).toBeCloseTo(0.085, 10);
  });

  it('skips FRED missing-value rows marked with "."', () => {
    const csv = [HEADER, '2020-01-01,.', '2021-01-01,4.0', '2022-01-01,5.0'].join('\n');
    const segments = parsePrimeRateCsv(csv);

    expect(segments).toHaveLength(2);
    expect(segments[0].effectiveFrom).toBe('2021-01-01');
    expect(segments[1].effectiveFrom).toBe('2022-01-01');
  });

  it('sets effectiveTo null only for the last (most recent) segment', () => {
    const csv = [HEADER, '2020-01-01,3.0', '2023-01-01,5.0', '2024-01-01,7.0'].join('\n');
    const segments = parsePrimeRateCsv(csv);

    expect(segments[0].effectiveTo).toBe('2023-01-01');
    expect(segments[1].effectiveTo).toBe('2024-01-01');
    expect(segments[2].effectiveTo).toBeNull();
  });

  it('sorts observations by date when the source is out of order', () => {
    const csv = [HEADER, '2022-01-01,4.0', '2020-01-01,3.5'].join('\n');
    const segments = parsePrimeRateCsv(csv);

    expect(segments[0].effectiveFrom).toBe('2020-01-01');
    expect(segments[0].effectiveTo).toBe('2022-01-01');
    expect(segments[1].effectiveFrom).toBe('2022-01-01');
    expect(segments[1].effectiveTo).toBeNull();
  });

  it('throws when no valid observations remain after filtering', () => {
    const csv = [HEADER, '2020-01-01,.', '2021-01-01,.'].join('\n');
    expect(() => parsePrimeRateCsv(csv)).toThrow(/no valid observations/i);
  });

  it('throws on an empty body (header only)', () => {
    expect(() => parsePrimeRateCsv(HEADER)).toThrow(/no valid observations/i);
  });
});
