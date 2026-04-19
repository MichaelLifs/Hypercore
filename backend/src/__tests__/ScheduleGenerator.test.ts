import { generateSchedule } from '../domain/repayment/ScheduleGenerator';
import type { RateSegment } from '../domain/repayment/repayment.types';
import { roundCalc, roundMoney } from '../utils/math';

const r = (annual: number): RateSegment => ({
  effectiveFrom: '2020-01-01',
  annualRate: annual,
});

function segmentsFrom(
  start: string,
  pairs: { from: string; rate: number }[],
): RateSegment[] {
  return pairs.map((p) => ({ effectiveFrom: p.from, annualRate: p.rate }));
}

describe('generateSchedule', () => {
  it('same calendar month: one PRINCIPAL_AND_INTEREST row', () => {
    const sched = generateSchedule(100_000, '2024-03-10', '2024-03-25', [r(0.12)]);
    expect(sched).toHaveLength(1);
    expect(sched[0].paymentType).toBe('PRINCIPAL_AND_INTEREST');
    expect(sched[0].paymentDate).toBe('2024-03-25');
    expect(sched[0].remainingBalance).toBe(0);
    expect(sched[0].principal).toBe(100_000);
    const days = 15;
    const expectedInterest = Math.round(((100_000 * 0.12 * days) / 360) * 100) / 100;
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

  it('mid-month start: first coupon uses fractional month accrual', () => {
    const sched = generateSchedule(90_000, '2024-01-15', '2024-02-29', [r(0.12)]);
    expect(sched[0].paymentDate).toBe('2024-01-31');
    const janDays = 15;
    const janInterest = roundMoney((90_000 * 0.12 * janDays) / 360);
    expect(sched[0].interest).toBe(janInterest);
  });

  it('splits interest when rate changes mid-period', () => {
    const segs = segmentsFrom('2024-01-01', [
      { from: '2020-01-01', rate: 0.06 },
      { from: '2024-01-20', rate: 0.12 },
    ]);
    const sched = generateSchedule(100_000, '2024-01-15', '2024-01-31', segs);
    expect(sched).toHaveLength(1);
    const expected = roundMoney(
      roundCalc((100_000 * 0.06 * 5) / 360) + roundCalc((100_000 * 0.12 * 10) / 360),
    );
    expect(sched[0].interest).toBe(expected);
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
});
