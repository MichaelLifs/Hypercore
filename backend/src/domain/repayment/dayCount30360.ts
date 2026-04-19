/**
 * 30E/360 day count following the ISDA 2006 30/360 (ISDA) convention
 * (QuantLib: Thirty360::ISDA), including the February end-date exception when
 * the period end is the loan maturity date.
 *
 * Public API measures accrual between two **calendar** dates that bound the
 * interest period **inclusively** (interest accrues through the end date).
 *
 * Full calendar months (start = 1st, end = last day of the same month) return
 * exactly 30 days by measuring to the first day of the following month, which
 * matches principal × (annualRate / 12) for an unchanged rate.
 */

export interface DayCount30360Options {
  /**
   * When the accrual period ends on the last day of February, ISDA does not
   * normalize that day to 30 if and only if that date is the loan maturity.
   * Omit for generic date math (e.g. tests); pass the loan end date when
   * generating a repayment schedule.
   */
  loanMaturityDate?: string;
}

/** Calendar components for a UTC civil date (ISO YYYY-MM-DD), 1-based month. */
interface CalendarDateParts {
  y: number;
  m: number; // 1–12
  d: number;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateStrict(iso: string): CalendarDateParts {
  const m = ISO.exec(iso);
  if (!m) {
    throw new TypeError(`Invalid ISO date (expected YYYY-MM-DD): ${iso}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12) {
    throw new TypeError(`Invalid month in ISO date: ${iso}`);
  }
  const last = lastDayOfMonthUtc(y, mo);
  if (d < 1 || d > last) {
    throw new TypeError(`Invalid day for month in ISO date: ${iso}`);
  }
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new TypeError(`Invalid ISO date: ${iso}`);
  }
  return { y, m: mo, d };
}

export function compareIso(a: string, b: string): number {
  const A = parseIsoDateStrict(a);
  const B = parseIsoDateStrict(b);
  if (A.y !== B.y) return A.y - B.y;
  if (A.m !== B.m) return A.m - B.m;
  return A.d - B.d;
}

export function lastDayOfMonthUtc(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function isLastDayOfFebruaryUtc(ymd: CalendarDateParts): boolean {
  return ymd.m === 2 && ymd.d === lastDayOfMonthUtc(ymd.y, 2);
}

function isFirstDayOfMonth(ymd: CalendarDateParts): boolean {
  return ymd.d === 1;
}

function isLastDayOfMonth(ymd: CalendarDateParts): boolean {
  return ymd.d === lastDayOfMonthUtc(ymd.y, ymd.m);
}

function sameYearMonth(a: CalendarDateParts, b: CalendarDateParts): boolean {
  return a.y === b.y && a.m === b.m;
}

/** First calendar day of the month after `ymd` (UTC). */
export function firstDayOfFollowingMonth(ymd: CalendarDateParts): CalendarDateParts {
  if (ymd.m === 12) return { y: ymd.y + 1, m: 1, d: 1 };
  return { y: ymd.y, m: ymd.m + 1, d: 1 };
}

function ymdToIso(ymd: CalendarDateParts): string {
  const mm = String(ymd.m).padStart(2, '0');
  const dd = String(ymd.d).padStart(2, '0');
  return `${ymd.y}-${mm}-${dd}`;
}

export function addUtcDays(iso: string, deltaDays: number): string {
  const { y, m, d } = parseIsoDateStrict(iso);
  const t = Date.UTC(y, m - 1, d) + deltaDays * 86_400_000;
  const dt = new Date(t);
  return ymdToIso({
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  });
}

function isCalendarFullMonthInclusive(start: CalendarDateParts, end: CalendarDateParts): boolean {
  return isFirstDayOfMonth(start) && isLastDayOfMonth(end) && sameYearMonth(start, end);
}

/**
 * Raw ISDA 30E/360 difference between calendar dates (d1 < d2), matching
 * QuantLib Thirty360::ISDA_Impl::dayCount — used for half-open accrual
 * intervals and for splitting rate sub-periods additively.
 */
export function dayCount30360Raw(
  d1Iso: string,
  d2Iso: string,
  options?: DayCount30360Options,
): number {
  const d1 = parseIsoDateStrict(d1Iso);
  const d2 = parseIsoDateStrict(d2Iso);
  if (compareIso(d1Iso, d2Iso) >= 0) {
    throw new RangeError(`dayCount30360Raw: expected ${d1Iso} < ${d2Iso}`);
  }
  const maturity = options?.loanMaturityDate
    ? parseIsoDateStrict(options.loanMaturityDate)
    : null;
  return isdaRawDayCount(d1, d2, maturity);
}

/**
 * Raw ISDA 30E/360 difference between two calendar dates (d1 < d2),
 * matching QuantLib Thirty360::ISDA_Impl::dayCount.
 */
function isdaRawDayCount(d1: CalendarDateParts, d2: CalendarDateParts, maturity: CalendarDateParts | null): number {
  let dd1 = d1.d;
  let dd2 = d2.d;
  const mm1 = d1.m;
  const mm2 = d2.m;
  const yy1 = d1.y;
  const yy2 = d2.y;

  if (dd1 === 31) dd1 = 30;
  if (dd2 === 31) dd2 = 30;

  if (isLastDayOfFebruaryUtc({ y: yy1, m: mm1, d: dd1 })) {
    dd1 = 30;
  }

  const isMaturity =
    maturity !== null && yy2 === maturity.y && mm2 === maturity.m && d2.d === maturity.d;
  if (!isMaturity && isLastDayOfFebruaryUtc({ y: yy2, m: mm2, d: dd2 })) {
    dd2 = 30;
  }

  return 360 * (yy2 - yy1) + 30 * (mm2 - mm1) + (dd2 - dd1);
}

/**
 * Full calendar month (1st through last day of the same month), interest
 * measured inclusively. Uses the “day after month-end” shortcut except when the
 * period ends on the last day of February and that day is loan maturity (ISDA
 * does not normalize Feb 28/29 on d2 in that case).
 */
function fullCalendarMonthInclusiveDays(
  start: CalendarDateParts,
  end: CalendarDateParts,
  maturity: CalendarDateParts | null,
): number {
  const periodEndsOnMaturity =
    maturity !== null && end.y === maturity.y && end.m === maturity.m && end.d === maturity.d;
  const lastFeb = lastDayOfMonthUtc(end.y, 2);
  if (end.m === 2 && end.d === lastFeb && periodEndsOnMaturity) {
    return isdaRawDayCount(start, end, maturity);
  }
  const firstOfMonthAfterStart = firstDayOfFollowingMonth(start);
  return isdaRawDayCount(start, firstOfMonthAfterStart, maturity);
}

/**
 * Inclusive [start, end] accrual length from raw pieces on half-open intervals:
 * raw(start, end+1day) − raw(end, end+1day).
 */
function inclusiveSpanUsingExclusiveUpperBound(
  start: CalendarDateParts,
  end: CalendarDateParts,
  maturity: CalendarDateParts | null,
): number {
  const exclusiveUpperIso = addUtcDays(ymdToIso(end), 1);
  const exclusiveUpper = parseIsoDateStrict(exclusiveUpperIso);
  return (
    isdaRawDayCount(start, exclusiveUpper, maturity) - isdaRawDayCount(end, exclusiveUpper, maturity)
  );
}

/**
 * 30E/360 ISDA accrual days from `inclusiveStart` through `inclusiveEnd`
 * (both inclusive). Returns 0 when both dates are equal.
 *
 * For a full Gregorian calendar month (1st through last day of that month),
 * returns 30 days (via an internal measurement to the first day of the next month).
 */
export function dayCount30360(
  inclusiveStart: string,
  inclusiveEnd: string,
  options?: DayCount30360Options,
): number {
  const s = parseIsoDateStrict(inclusiveStart);
  const e = parseIsoDateStrict(inclusiveEnd);
  const cmp = compareIso(inclusiveStart, inclusiveEnd);
  if (cmp > 0) {
    throw new RangeError(
      `dayCount30360: inclusiveStart (${inclusiveStart}) must be on or before inclusiveEnd (${inclusiveEnd})`,
    );
  }
  if (cmp === 0) return 0;

  const maturity = options?.loanMaturityDate
    ? parseIsoDateStrict(options.loanMaturityDate)
    : null;

  if (isCalendarFullMonthInclusive(s, e)) {
    return fullCalendarMonthInclusiveDays(s, e, maturity);
  }

  return inclusiveSpanUsingExclusiveUpperBound(s, e, maturity);
}
