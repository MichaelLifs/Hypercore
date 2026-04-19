import {
  compareIso,
  dayCount30360,
  dayCount30360Raw,
  parseIsoDateStrict,
} from '../domain/repayment/dayCount30360';

describe('dayCount30360', () => {
  it('uses 30 days for a full calendar month (1st through last day)', () => {
    expect(dayCount30360('2024-01-01', '2024-01-31')).toBe(30);
    expect(dayCount30360('2024-02-01', '2024-02-29')).toBe(30);
    expect(dayCount30360('2023-02-01', '2023-02-28')).toBe(30);
    expect(dayCount30360('2024-04-01', '2024-04-30')).toBe(30);
  });

  it('sums to 360 across one calendar year of consecutive full calendar months', () => {
    const months: Array<[string, string]> = [
      ['2023-01-01', '2023-01-31'],
      ['2023-02-01', '2023-02-28'],
      ['2023-03-01', '2023-03-31'],
      ['2023-04-01', '2023-04-30'],
      ['2023-05-01', '2023-05-31'],
      ['2023-06-01', '2023-06-30'],
      ['2023-07-01', '2023-07-31'],
      ['2023-08-01', '2023-08-31'],
      ['2023-09-01', '2023-09-30'],
      ['2023-10-01', '2023-10-31'],
      ['2023-11-01', '2023-11-30'],
      ['2023-12-01', '2023-12-31'],
    ];
    const sum = months.reduce((acc, [a, b]) => acc + dayCount30360(a, b), 0);
    expect(sum).toBe(360);
  });

  it('treats February 28 end-of-month like 30 under ISDA when not loan maturity', () => {
    expect(dayCount30360('2023-02-01', '2023-02-28')).toBe(30);
    expect(dayCount30360('2023-02-15', '2023-02-28')).toBe(16);
  });

  it('applies ISDA Feb-maturity exception (non-leap): February is not stretched', () => {
    // [02-01, 02-28] non-leap maturity has 28 calendar days → 28 in 30E/360
    // because ISDA forbids stretching Feb to 30 at maturity.
    expect(
      dayCount30360('2023-02-01', '2023-02-28', { loanMaturityDate: '2023-02-28' }),
    ).toBe(28);
  });

  it('applies ISDA Feb-maturity exception (leap): February is not stretched', () => {
    expect(
      dayCount30360('2024-02-01', '2024-02-29', { loanMaturityDate: '2024-02-29' }),
    ).toBe(29);
  });

  it('handles leap-year February 29 when not maturity', () => {
    expect(dayCount30360('2024-02-01', '2024-02-29')).toBe(30);
  });

  it('handles partial periods within a single month inclusively', () => {
    // [01-15, 01-31] includes 01-31 itself: raw(01-15, 02-01) = 16.
    expect(dayCount30360('2024-01-15', '2024-01-31')).toBe(16);
    // [03-10, 03-25] spans 16 calendar days inclusively.
    expect(dayCount30360('2024-03-10', '2024-03-25')).toBe(16);
  });

  it('handles period crossing months inclusively', () => {
    // raw(02-28, 03-11): dd1=28 (lastFeb 2023) → 30, dd2=11, mm2=3, mm1=2.
    expect(dayCount30360('2023-02-28', '2023-03-10')).toBe(11);
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

describe('rate-split additivity (the property that drove the inclusive redesign)', () => {
  it('sub-strip head (half-open raw) + inclusive tail equals the inclusive whole', () => {
    const opt = { loanMaturityDate: '2024-02-15' };
    const whole = dayCount30360('2024-01-15', '2024-01-31', opt);
    const head = dayCount30360Raw('2024-01-15', '2024-01-20');
    const tail = dayCount30360('2024-01-20', '2024-01-31', opt);
    expect(head + tail).toBe(whole);
  });

  it('additivity holds when the period ends on a Feb maturity (leap)', () => {
    const opt = { loanMaturityDate: '2024-02-29' };
    const whole = dayCount30360('2024-01-15', '2024-02-29', opt);
    const head = dayCount30360Raw('2024-01-15', '2024-02-15');
    const tail = dayCount30360('2024-02-15', '2024-02-29', opt);
    expect(head + tail).toBe(whole);
  });

  it('additivity holds when the period ends on a Feb maturity (non-leap)', () => {
    const opt = { loanMaturityDate: '2023-02-28' };
    const whole = dayCount30360('2023-01-31', '2023-02-28', opt);
    const head = dayCount30360Raw('2023-01-31', '2023-02-15');
    const tail = dayCount30360('2023-02-15', '2023-02-28', opt);
    expect(head + tail).toBe(whole);
  });

  it('additivity holds across multiple intermediate rate boundaries', () => {
    const opt = { loanMaturityDate: '2024-06-30' };
    const whole = dayCount30360('2024-01-10', '2024-06-30', opt);
    const s1 = dayCount30360Raw('2024-01-10', '2024-02-05');
    const s2 = dayCount30360Raw('2024-02-05', '2024-03-20');
    const s3 = dayCount30360Raw('2024-03-20', '2024-05-01');
    const tail = dayCount30360('2024-05-01', '2024-06-30', opt);
    expect(s1 + s2 + s3 + tail).toBe(whole);
  });
});
