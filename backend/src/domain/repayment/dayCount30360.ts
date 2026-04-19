/**
 * 30E/360 day count following the ISDA 2006 30/360 (ISDA) convention
 * (QuantLib: Thirty360::ISDA), including the February end-date exception when
 * the period end is the loan maturity date.
 *
 * Public API measures accrual between two **calendar** dates that bound the
 * interest period **inclusively** (interest accrues through the end date).
 *
 * Design:
 *   inclusive [s, e] = raw(s, e+1)                                   (normal)
 *   inclusive [s, e] = raw(s, e+1) − (30 − e.d)                      (Feb maturity)
 *
 * The Feb-maturity adjustment reverses the "every month = 30 days" stretch
 * baked into raw 30E/360 when the period ends on the last day of February and
 * that day is loan maturity (ISDA rule: do not normalize Feb 28/29 → 30 at
 * maturity). Non-leap: subtract 2; leap: subtract 1.
 *
 * Additivity across rate-change splits is guaranteed by computing every
 * intermediate sub-strip with `dayCount30360Raw` (half-open) and closing the
 * final sub-strip with `dayCount30360` (inclusive). The two decompositions
 * agree by construction:
 *
 *   raw(s, c₁) + raw(c₁, c₂) + … + dayCount30360(cₖ, e, opts)
 *     = raw(s, e+1) − febMatAdj(e)
 *     = dayCount30360(s, e, opts).
 *
 * A full calendar month (1st through last day, non-maturity-Feb) returns
 * exactly 30 days, so a full month of interest equals principal × rate / 12.
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
  m: number;
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

/**
 * Raw ISDA 30E/360 day difference between calendar dates (d1 < d2), matching
 * QuantLib Thirty360::ISDA_Impl::dayCount on a HALF-OPEN interval [d1, d2).
 *
 * When `options.loanMaturityDate` is supplied and d2 is that date, d2 being
 * the last day of February is NOT normalized to 30 (ISDA Feb-maturity rule).
 *
 * For the ScheduleGenerator's rate-split sub-strips, pass no options: the
 * Feb-maturity exception must be applied exactly once, at the period's
 * inclusive closing via `dayCount30360`, otherwise additivity breaks.
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

function isdaRawDayCount(
  d1: CalendarDateParts,
  d2: CalendarDateParts,
  maturity: CalendarDateParts | null,
): number {
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
 * 30E/360 ISDA accrual days for the INCLUSIVE interval [inclusiveStart,
 * inclusiveEnd]. Returns 0 when both dates are equal.
 *
 * For a full Gregorian calendar month (1st through the last day of the same
 * month, not at Feb maturity) this returns 30 — matching the classical
 * monthly-interest identity `principal × rate / 12`.
 *
 * When `loanMaturityDate` is supplied and the period ends on the last day of
 * February and that day is loan maturity, February is NOT stretched to 30:
 * the return value is reduced by `30 − actualLastDayOfFeb` (1 in leap years,
 * 2 otherwise). This is ISDA's Feb-maturity rule.
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

  // Inclusive [s, e] = half-open [s, e+1). Passing null maturity on the raw
  // call because d2 = e+1 is never itself the last day of February — the
  // Feb-maturity adjustment is applied explicitly below against `e`.
  const endPlusOne = parseIsoDateStrict(addUtcDays(inclusiveEnd, 1));
  let days = isdaRawDayCount(s, endPlusOne, null);

  const maturity = options?.loanMaturityDate
    ? parseIsoDateStrict(options.loanMaturityDate)
    : null;
  const endIsLastFeb = isLastDayOfFebruaryUtc(e);
  const endIsMaturity =
    maturity !== null && e.y === maturity.y && e.m === maturity.m && e.d === maturity.d;
  if (endIsLastFeb && endIsMaturity) {
    days -= 30 - e.d;
  }

  return days;
}
