import {
  compareIso,
  dayCount30360,
  dayCount30360Raw,
  parseIsoDateStrict,
} from '../domain/repayment/dayCount30360';

describe('dayCount30360', () => {
  it('returns 30 for two consecutive month-end dates (30E/360 ISDA)', () => {
    expect(dayCount30360('2023-01-31', '2023-02-28')).toBe(30);
    expect(dayCount30360('2024-01-31', '2024-02-29')).toBe(30);
  });

  it('returns 360 for exactly one year month-end to month-end', () => {
    const pairs: [string, string][] = [
      ['2023-01-31', '2023-02-28'],
      ['2023-02-28', '2023-03-31'],
      ['2023-03-31', '2023-04-30'],
      ['2023-04-30', '2023-05-31'],
      ['2023-05-31', '2023-06-30'],
      ['2023-06-30', '2023-07-31'],
      ['2023-07-31', '2023-08-31'],
      ['2023-08-31', '2023-09-30'],
      ['2023-09-30', '2023-10-31'],
      ['2023-10-31', '2023-11-30'],
      ['2023-11-30', '2023-12-31'],
      ['2023-12-31', '2024-01-31'],
    ];
    const sum = pairs.reduce((acc, [a, b]) => acc + dayCount30360(a, b), 0);
    expect(sum).toBe(360);
  });

  it('treats February 28 end-of-month like 30 under ISDA when not loan maturity', () => {
    expect(dayCount30360('2023-02-01', '2023-02-28')).toBe(30);
  });

  it('does not normalize last day of February on d2 when it is loan maturity', () => {
    expect(dayCount30360('2023-02-01', '2023-02-28', { loanMaturityDate: '2023-02-28' })).toBe(27);
  });

  it('handles leap-year February 29 when not maturity', () => {
    expect(dayCount30360('2024-02-01', '2024-02-29')).toBe(30);
  });

  it('handles partial period within a single month (stub)', () => {
    expect(dayCount30360('2024-01-15', '2024-01-31')).toBe(15);
    expect(dayCount30360('2024-03-10', '2024-03-25')).toBe(15);
  });

  it('uses 30 days for a full calendar month (1st through last day)', () => {
    expect(dayCount30360('2024-01-01', '2024-01-31')).toBe(30);
    expect(dayCount30360('2024-02-01', '2024-02-29')).toBe(30);
  });

  it('handles period crossing months (stub to stub)', () => {
    expect(dayCount30360('2023-02-28', '2023-03-10')).toBe(10);
  });

  it('returns 0 for identical start and end', () => {
    expect(dayCount30360('2024-06-15', '2024-06-15')).toBe(0);
  });

  it('rejects end before start', () => {
    expect(() => dayCount30360('2024-02-01', '2024-01-01')).toThrow(RangeError);
  });

  it('rejects malformed ISO dates', () => {
    expect(() => dayCount30360('24-01-01', '2024-01-31')).toThrow();
    expect(() => dayCount30360('2024-13-01', '2024-01-31')).toThrow();
    expect(() => dayCount30360('2024-02-30', '2024-03-01')).toThrow();
  });
});

describe('parseIsoDateStrict', () => {
  it('parses valid UTC dates', () => {
    expect(parseIsoDateStrict('2024-01-01')).toEqual({ y: 2024, m: 1, d: 1 });
  });

  it('rejects invalid calendar dates', () => {
    expect(() => parseIsoDateStrict('2023-02-29')).toThrow();
  });
});

describe('compareIso', () => {
  it('orders YYYY-MM-DD strings chronologically', () => {
    expect(compareIso('2023-12-31', '2024-01-01')).toBeLessThan(0);
    expect(compareIso('2024-01-01', '2024-01-01')).toBe(0);
  });
});

describe('dayCount30360Raw', () => {
  it('sums with inclusive tail to match total inclusive days (rate-split identity)', () => {
    const opt = { loanMaturityDate: '2024-02-15' };
    const total = dayCount30360('2024-01-15', '2024-01-31', opt);
    const head = dayCount30360Raw('2024-01-15', '2024-01-20', opt);
    const tail = dayCount30360('2024-01-20', '2024-01-31', opt);
    expect(head + tail).toBe(total);
  });
});
