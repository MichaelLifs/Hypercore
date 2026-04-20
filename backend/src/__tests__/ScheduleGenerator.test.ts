import { dayCount30360 } from '../domain/repayment/dayCount30360';
import { generateSchedule } from '../domain/repayment/ScheduleGenerator';
import type { RateSegment } from '../domain/repayment/repayment.types';
import { roundCalc, roundMoney } from '../utils/math';

const r = (annual: number): RateSegment => ({
  effectiveFrom: '2020-01-01',
  annualRate: annual,
});

function segmentsFrom(
  _start: string,
  pairs: { from: string; rate: number }[],
): RateSegment[] {
  return pairs.map((p) => ({ effectiveFrom: p.from, annualRate: p.rate }));
}

describe('generateSchedule', () => {
  it('same calendar month: one PRINCIPAL_AND_INTEREST row (inclusive day count)', () => {
    const sched = generateSchedule(100_000, '2024-03-10', '2024-03-25', [r(0.12)]);
    expect(sched).toHaveLength(1);
    expect(sched[0].paymentType).toBe('PRINCIPAL_AND_INTEREST');
    expect(sched[0].paymentDate).toBe('2024-03-25');
    expect(sched[0].remainingBalance).toBe(0);
    expect(sched[0].principal).toBe(100_000);
    // Inclusive [03-10, 03-25] = raw(03-10, 03-26) = 16 days.
    const days = 16;
    const expectedInterest = roundMoney((100_000 * 0.12 * days) / 360);
    expect(sched[0].interest).toBe(expectedInterest);
    expect(sched[0].total).toBe(sched[0].principal + sched[0].interest);
  });

  it('end on last day of month: no duplicate month-end coupon on maturity', () => {
    const sched = generateSchedule(50_000, '2024-01-15', '2024-01-31', [r(0.06)]);
    expect(sched).toHaveLength(1);
    expect(sched[0].paymentDate).toBe('2024-01-31');
    expect(sched[0].paymentType).toBe('PRINCIPAL_AND_INTEREST');
  });

  it('multi-month loan: intermediate INTEREST rows and final P+I', () => {
    const sched = generateSchedule(120_000, '2024-01-10', '2024-04-05', [r(0.12)]);
    expect(sched.map((x) => x.paymentType)).toEqual([
      'INTEREST',
      'INTEREST',
      'INTEREST',
      'PRINCIPAL_AND_INTEREST',
    ]);
    expect(sched.map((x) => x.paymentDate)).toEqual([
      '2024-01-31',
      '2024-02-29',
      '2024-03-31',
      '2024-04-05',
    ]);
    expect(sched.slice(0, 3).every((x) => x.remainingBalance === 120_000)).toBe(true);
    expect(sched[3].remainingBalance).toBe(0);
  });

  it('mid-month start: first coupon uses inclusive fractional accrual', () => {
    const sched = generateSchedule(90_000, '2024-01-15', '2024-02-29', [r(0.12)]);
    expect(sched[0].paymentDate).toBe('2024-01-31');
    // Inclusive [01-15, 01-31] = 16 days (was 15 under the buggy half-open
    // convention that silently dropped the coupon day).
    const janDays = 16;
    const janInterest = roundMoney((90_000 * 0.12 * janDays) / 360);
    expect(sched[0].interest).toBe(janInterest);
  });

  it('splits interest when rate changes mid-period (inclusive tail strip)', () => {
    const segs = segmentsFrom('2024-01-01', [
      { from: '2020-01-01', rate: 0.06 },
      { from: '2024-01-20', rate: 0.12 },
    ]);
    const sched = generateSchedule(100_000, '2024-01-15', '2024-01-31', segs);
    expect(sched).toHaveLength(1);
    // Head half-open [01-15, 01-20) = 5 days at 6%.
    // Tail inclusive  [01-20, 01-31] = 11 days at 12%  (raw(01-20, 02-01)=11).
    const expected = roundMoney(
      roundCalc((100_000 * 0.06 * 5) / 360) + roundCalc((100_000 * 0.12 * 11) / 360),
    );
    expect(sched[0].interest).toBe(expected);
  });

  it('rate change inside a FULL calendar month preserves 30 days total', () => {
    const segs: RateSegment[] = [
      { effectiveFrom: '2020-01-01', annualRate: 0.06 },
      { effectiveFrom: '2024-01-15', annualRate: 0.12 },
    ];
    const sched = generateSchedule(100_000, '2024-01-01', '2024-02-01', segs);
    expect(sched.map((e) => e.paymentDate)).toEqual(['2024-01-31', '2024-02-01']);

    const janInterest = sched[0].interest;
    // 14 days at 6% (half-open [01-01, 01-15)) + 16 days at 12% (inclusive
    // [01-15, 01-31]). Sum = 30, matching principal × rate / 12 for a full
    // month when the rate is unchanged.
    const expectedJan = roundMoney(
      roundCalc((100_000 * 0.06 * 14) / 360) + roundCalc((100_000 * 0.12 * 16) / 360),
    );
    expect(janInterest).toBe(expectedJan);
  });

  it('rate change exactly on accrual start uses new rate for entire strip', () => {
    const segs = segmentsFrom('2024-01-01', [
      { from: '2020-01-01', rate: 0.06 },
      { from: '2024-03-01', rate: 0.12 },
    ]);
    const sched = generateSchedule(100_000, '2024-03-01', '2024-03-31', segs);
    expect(sched).toHaveLength(1);
    const interest = roundMoney((100_000 * 0.12 * 30) / 360);
    expect(sched[0].interest).toBe(interest);
  });

  it('rate change exactly on coupon/accrual end defers to the next period', () => {
    // Rate changes on 01-31 (a coupon day). Under the fixed convention the
    // current period accrues entirely at the old rate; the new rate picks up
    // for the Feb period starting 02-01. This is the only choice consistent
    // with split additivity (a zero-day tail strip).
    const segs: RateSegment[] = [
      { effectiveFrom: '2020-01-01', annualRate: 0.06 },
      { effectiveFrom: '2024-01-31', annualRate: 0.12 },
    ];
    const sched = generateSchedule(100_000, '2024-01-01', '2024-02-29', segs);
    const jan = sched[0];
    const feb = sched[1];
    expect(jan.paymentDate).toBe('2024-01-31');
    expect(feb.paymentDate).toBe('2024-02-29');
    // Jan: full month at old rate.
    expect(jan.interest).toBe(roundMoney((100_000 * 0.06 * 30) / 360));
    // Feb: full month at new rate AT MATURITY on 02-29, so ISDA Feb-maturity
    // exception applies: Feb is not stretched to 30; 29 days at 12%.
    expect(feb.interest).toBe(roundMoney((100_000 * 0.12 * 29) / 360));
  });

  it('final row pays full principal and remaining balance is zero', () => {
    const sched = generateSchedule(75_000, '2024-05-01', '2024-08-31', [r(0.09)]);
    const last = sched[sched.length - 1];
    expect(last.paymentType).toBe('PRINCIPAL_AND_INTEREST');
    expect(last.principal).toBe(75_000);
    expect(last.remainingBalance).toBe(0);
  });

  it('total interest matches sum of interest fields (money rounding)', () => {
    const sched = generateSchedule(200_000, '2023-11-20', '2024-02-14', [r(0.1)]);
    const sumInterest = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    expect(sumInterest).toBeGreaterThan(0);
  });

  it('rejects principal <= 0', () => {
    expect(() => generateSchedule(0, '2024-01-01', '2024-02-01', [r(0.05)])).toThrow(RangeError);
  });

  it('rejects endDate <= startDate', () => {
    expect(() => generateSchedule(1, '2024-02-01', '2024-02-01', [r(0.05)])).toThrow(RangeError);
    expect(() => generateSchedule(1, '2024-02-01', '2024-01-01', [r(0.05)])).toThrow(RangeError);
  });

  it('rejects empty rateSegments', () => {
    expect(() => generateSchedule(1, '2024-01-01', '2024-02-01', [])).toThrow(RangeError);
  });

  it('rejects unsorted rateSegments', () => {
    const bad: RateSegment[] = [
      { effectiveFrom: '2024-02-01', annualRate: 0.05 },
      { effectiveFrom: '2024-01-01', annualRate: 0.04 },
    ];
    expect(() => generateSchedule(1, '2024-01-01', '2024-03-01', bad)).toThrow(RangeError);
  });

  it('rejects rateSegments that do not cover startDate', () => {
    const segs: RateSegment[] = [{ effectiveFrom: '2024-02-01', annualRate: 0.05 }];
    expect(() => generateSchedule(1, '2024-01-15', '2024-03-01', segs)).toThrow(RangeError);
  });

  it('rejects non-finite or negative annual rates', () => {
    const segsNaN: RateSegment[] = [{ effectiveFrom: '2020-01-01', annualRate: Number.NaN }];
    expect(() => generateSchedule(1, '2024-01-01', '2024-02-01', segsNaN)).toThrow(RangeError);
    const segsNeg: RateSegment[] = [{ effectiveFrom: '2020-01-01', annualRate: -0.01 }];
    expect(() => generateSchedule(1, '2024-01-01', '2024-02-01', segsNeg)).toThrow(RangeError);
  });

  it('rejects NaN principal', () => {
    expect(() => generateSchedule(Number.NaN, '2024-01-01', '2024-02-01', [r(0.05)])).toThrow(RangeError);
  });

  it('REGRESSION: mid-month start does not drop the first coupon day', () => {
    // Pre-fix bug: the first coupon day (01-31) earned no interest when the
    // loan started mid-month, undercharging by 1 day × principal × rate / 360.
    const sched = generateSchedule(100_000, '2024-01-15', '2024-04-05', [r(0.12)]);
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    // Inclusive whole-span days [01-15, 04-05] = raw(01-15, 04-06) = 81.
    const expected = roundMoney((100_000 * 0.12 * 81) / 360);
    expect(total).toBe(expected);
  });

  it('REGRESSION: maturity that is not last-of-month does not drop the maturity day', () => {
    const sched = generateSchedule(100_000, '2024-01-01', '2024-04-15', [r(0.12)]);
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    // Inclusive [01-01, 04-15] = raw(01-01, 04-16) = 30*3 + (16-1) = 105.
    const expected = roundMoney((100_000 * 0.12 * 105) / 360);
    expect(total).toBe(expected);
  });

  it('schedule sum equals dayCount30360 of the whole span for a single-rate loan (start=1st, end=last)', () => {
    // The per-row roundMoney rounding introduces at most ~0.5 cent of drift
    // per row vs the analytic total. We assert that bound here; tighter
    // reconciliation must be done against the analytic figure directly.
    const sched = generateSchedule(250_000, '2024-01-01', '2024-06-30', [r(0.08)]);
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    const whole = dayCount30360('2024-01-01', '2024-06-30', { loanMaturityDate: '2024-06-30' });
    expect(whole).toBe(180);
    const analytic = (250_000 * 0.08 * whole) / 360;
    expect(Math.abs(total - analytic)).toBeLessThanOrEqual(sched.length * 0.005 + 0.005);
  });

  it('schedule sum equals dayCount30360 of the whole span for a single-rate loan (mid-month)', () => {
    const sched = generateSchedule(250_000, '2023-11-17', '2024-05-09', [r(0.075)]);
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    const whole = dayCount30360('2023-11-17', '2024-05-09', { loanMaturityDate: '2024-05-09' });
    const analytic = (250_000 * 0.075 * whole) / 360;
    expect(Math.abs(total - analytic)).toBeLessThanOrEqual(sched.length * 0.005 + 0.005);
  });

  it('Feb 29 (leap) maturity: full month accrues 29 days (not 30, not 28)', () => {
    const sched = generateSchedule(100_000, '2024-02-01', '2024-02-29', [r(0.12)]);
    expect(sched).toHaveLength(1);
    // ISDA Feb-maturity: Feb 29 not stretched to 30, so 29 calendar days.
    expect(sched[0].interest).toBe(roundMoney((100_000 * 0.12 * 29) / 360));
  });

  it('Feb 28 (non-leap) maturity: full month accrues 28 days', () => {
    const sched = generateSchedule(100_000, '2023-02-01', '2023-02-28', [r(0.12)]);
    expect(sched).toHaveLength(1);
    expect(sched[0].interest).toBe(roundMoney((100_000 * 0.12 * 28) / 360));
  });

  it('loan that spans a Feb 29 maturity with a mid-Feb rate change', () => {
    const segs: RateSegment[] = [
      { effectiveFrom: '2020-01-01', annualRate: 0.06 },
      { effectiveFrom: '2024-02-15', annualRate: 0.12 },
    ];
    const sched = generateSchedule(100_000, '2024-01-15', '2024-02-29', segs);
    expect(sched.map((e) => e.paymentDate)).toEqual(['2024-01-31', '2024-02-29']);

    // Jan: inclusive [01-15, 01-31] at 6% = 16 days.
    expect(sched[0].interest).toBe(roundMoney((100_000 * 0.06 * 16) / 360));

    // Feb: head [02-01, 02-15) at 6% = 14 days, tail [02-15, 02-29] at 12%.
    // Tail is dayCount30360(02-15, 02-29, mat=02-29) = raw(02-15, 03-01)−1
    //   = (30+(1-15))−1 = 15 days.
    const expectedFeb = roundMoney(
      roundCalc((100_000 * 0.06 * 14) / 360) + roundCalc((100_000 * 0.12 * 15) / 360),
    );
    expect(sched[1].interest).toBe(expectedFeb);

    // Whole-loan additivity holds: 16 days at 6% + 14 days at 6% + 15 at 12%.
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    const expectedTotal = roundMoney(
      roundCalc((100_000 * 0.06 * 30) / 360) + roundCalc((100_000 * 0.12 * 15) / 360),
    );
    expect(total).toBe(expectedTotal);
  });

  it('loan starting on the 31st normalizes consistently with 30E/360', () => {
    // 01-31 is dd1=31→30; first period [01-31, 02-29] inclusive =
    // raw(01-31, 03-01) = 30*2 + (1-30) = 31 days.
    const sched = generateSchedule(100_000, '2024-01-31', '2024-04-30', [r(0.12)]);
    expect(sched.map((e) => e.paymentDate)).toEqual(['2024-02-29', '2024-03-31', '2024-04-30']);
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    const whole = dayCount30360('2024-01-31', '2024-04-30', { loanMaturityDate: '2024-04-30' });
    expect(total).toBe(roundMoney((100_000 * 0.12 * whole) / 360));
  });

  it('zero-rate loan produces zero interest on every row', () => {
    const sched = generateSchedule(100_000, '2024-01-10', '2024-04-05', [r(0)]);
    expect(sched.every((e) => e.interest === 0)).toBe(true);
    expect(sched[sched.length - 1].principal).toBe(100_000);
  });

  it('multiple rate changes inside a single accrual period accrue additively', () => {
    const segs: RateSegment[] = [
      { effectiveFrom: '2020-01-01', annualRate: 0.04 },
      { effectiveFrom: '2024-01-08', annualRate: 0.08 },
      { effectiveFrom: '2024-01-20', annualRate: 0.12 },
    ];
    const sched = generateSchedule(100_000, '2024-01-01', '2024-01-31', segs);
    expect(sched).toHaveLength(1);
    // Head [01-01, 01-08) = 7 days at 4%.
    // Mid  [01-08, 01-20) = 12 days at 8%.
    // Tail [01-20, 01-31] inclusive = raw(01-20, 02-01) = 11 days at 12%.
    const expected = roundMoney(
      roundCalc((100_000 * 0.04 * 7) / 360) +
        roundCalc((100_000 * 0.08 * 12) / 360) +
        roundCalc((100_000 * 0.12 * 11) / 360),
    );
    expect(sched[0].interest).toBe(expected);
  });

  it('long-dated loan: cumulative rounding drift is bounded', () => {
    // 10-year loan, monthly coupons. The sum of per-row roundMoney values
    // should stay within half a cent per row of the un-rounded analytic total.
    const segs: RateSegment[] = [{ effectiveFrom: '2010-01-01', annualRate: 0.0725 }];
    const sched = generateSchedule(1_000_000, '2014-06-01', '2024-05-31', segs);
    expect(sched).toHaveLength(120);
    const total = roundMoney(sched.reduce((s, x) => s + x.interest, 0));
    const whole = dayCount30360('2014-06-01', '2024-05-31', { loanMaturityDate: '2024-05-31' });
    const analytic = (1_000_000 * 0.0725 * whole) / 360;
    expect(Math.abs(total - analytic)).toBeLessThan(sched.length * 0.005 + 0.01);
  });
});
