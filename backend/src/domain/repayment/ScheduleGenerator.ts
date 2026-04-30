import { roundCalc, roundMoney } from '../../utils/math';
import {
  addUtcDays,
  compareIso,
  dayCount30360,
  dayCount30360Raw,
  lastDayOfMonthUtc,
  parseIsoDateStrict,
  type DayCount30360Options,
} from './dayCount30360';
import type { RateSegment, ScheduleEntry } from './repayment.types';
import { DEFAULT_NON_WORK_DAY_POLICY,  } from '../loan/nonWorkDayPolicy';
import { nonWorkDayPolicy } from '../loan/nonWorkDayPolicy';

import { adjustPaymentDate } from './workDays';

function dayCountOpts(endDate: string): DayCount30360Options {
  return { loanMaturityDate: endDate };
}

function assertSortedSegments(segments: RateSegment[]): void {
  for (let i = 1; i < segments.length; i++) {
    if (compareIso(segments[i - 1].effectiveFrom, segments[i].effectiveFrom) >= 0) {
      throw new RangeError('rateSegments must be sorted strictly ascending by effectiveFrom');
    }
  }
}

function assertRateSegmentValues(segments: RateSegment[]): void {
  for (const s of segments) {
    if (!Number.isFinite(s.annualRate) || s.annualRate < 0) {
      throw new RangeError('each rate segment must have a finite non-negative annualRate');
    }
  }
}

// Assumes `segments` is sorted strictly ascending by `effectiveFrom`
// (validated in `generateSchedule` before this is called).
function annualRateOn(segments: RateSegment[], asOf: string): number {
  let lo = 0;
  let hi = segments.length - 1;
  let bestIdx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (compareIso(segments[mid].effectiveFrom, asOf) <= 0) {
      bestIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (bestIdx === -1) {
    throw new RangeError(`No rate segment covers date ${asOf}`);
  }
  return segments[bestIdx].annualRate;
}

/** Month-end coupon dates L with start < L < end. */
function monthEndCouponsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const s = parseIsoDateStrict(start);
  const e = parseIsoDateStrict(end);
  let y = s.y;
  let m = s.m;

  for (;;) {
    const lastD = lastDayOfMonthUtc(y, m);
    const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(lastD).padStart(2, '0')}`;
    if (compareIso(start, iso) < 0 && compareIso(iso, end) < 0) {
      out.push(iso);
    }
    if (m === 12) {
      y += 1;
      m = 1;
    } else {
      m += 1;
    }
    if (y > e.y || (y === e.y && m > e.m)) {
      break;
    }
  }
  return out;
}

/**
 * Accrues interest over [accrualStart, accrualEnd] inclusively, splitting at
 * each rate change. Intermediate strips are measured half-open via
 * `dayCount30360Raw` (no maturity option); the final strip is closed
 * inclusively via `dayCount30360` with the maturity option, so the ISDA
 * Feb-maturity exception is applied exactly once, at the true period close.
 * This decomposition is additive by construction.
 *
 * A rate change effective on accrualEnd is excluded (strict `<`) so the new
 * rate applies to the following period; otherwise the final inclusive strip
 * would collapse to zero days and drop the closing day from accrual.
 */
function interestAccrued(
  principal: number,
  accrualStart: string,
  accrualEnd: string,
  segments: RateSegment[],
  loanEnd: string,
): number {
  const changeDates: string[] = [];
  for (const s of segments) {
    if (
      compareIso(accrualStart, s.effectiveFrom) < 0 &&
      compareIso(s.effectiveFrom, accrualEnd) < 0
    ) {
      changeDates.push(s.effectiveFrom);
    }
  }
  changeDates.sort(compareIso);

  const opts = dayCountOpts(loanEnd);

  if (changeDates.length === 0) {
    const days = dayCount30360(accrualStart, accrualEnd, opts);
    const rate = annualRateOn(segments, accrualStart);
    return roundCalc((principal * rate * days) / 360);
  }

  let sum = 0;
  let cursor = accrualStart;

  for (const change of changeDates) {
    const subDays = dayCount30360Raw(cursor, change);
    const rate = annualRateOn(segments, cursor);
    sum = roundCalc(sum + roundCalc((principal * rate * subDays) / 360));
    cursor = change;
  }

  const lastDays = dayCount30360(cursor, accrualEnd, opts);
  const lastRate = annualRateOn(segments, cursor);
  sum = roundCalc(sum + roundCalc((principal * lastRate * lastDays) / 360));

  return sum;
}

/**
 * Pure, deterministic schedule generator; no I/O.
 *
 * Day count is 30E/360 ISDA. Intermediate math uses roundCalc (10 dp) and
 * every persisted ScheduleEntry field uses roundMoney (2 dp); see
 * src/utils/math.ts for the rationale.
 */
export function generateSchedule(
  principal: number,
  startDate: string,
  endDate: string,
  rateSegments: RateSegment[],
  nonWorkDayPolicy : nonWorkDayPolicy = DEFAULT_NON_WORK_DAY_POLICY,
): ScheduleEntry[] {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new RangeError('principal must be a finite positive amount');
  }
  parseIsoDateStrict(startDate);
  parseIsoDateStrict(endDate);
  if (compareIso(endDate, startDate) <= 0) {
    throw new RangeError('endDate must be after startDate');
  }
  if (rateSegments.length === 0) {
    throw new RangeError('rateSegments must not be empty');
  }
  assertSortedSegments(rateSegments);
  assertRateSegmentValues(rateSegments);
  if (compareIso(rateSegments[0].effectiveFrom, startDate) > 0) {
    throw new RangeError('first rate segment must start on or before startDate');
  }

  const coupons = monthEndCouponsBetween(startDate, endDate);
  const paymentDates = [...coupons, endDate];

  const entries: ScheduleEntry[] = [];
  let cursor = startDate;
  let seq = 1;

  for (const payDate of paymentDates) {
    const isMaturity = compareIso(payDate, endDate) === 0;
    const interestRaw = interestAccrued(principal, cursor, payDate, rateSegments, endDate);
    const interest = roundMoney(interestRaw);
    const adjustedPayDate = adjustPaymentDate(payDate,nonWorkDayPolicy)

    if (isMaturity) {
      const principalPaid = roundMoney(principal);
      const total = roundMoney(principalPaid + interest);
      entries.push({
        sequenceNumber: seq++,
        paymentDate:adjustedPayDate,
        paymentType: 'PRINCIPAL_AND_INTEREST',
        principal: principalPaid,
        interest,
        total,
        remainingBalance: 0,
      });
    } else {
      const total = roundMoney(interest);
      entries.push({
        sequenceNumber: seq++,
        paymentDate:adjustedPayDate,
        paymentType: 'INTEREST',
        principal: 0,
        interest,
        total,
        remainingBalance: roundMoney(principal),
      });
    }

    cursor = addUtcDays(payDate, 1);
  }

  return entries;
}
