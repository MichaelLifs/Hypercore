/**
 * Financial math utilities.
 *
 * Why float is acceptable here: loan principals are whole-dollar amounts,
 * annual rates carry at most 4 significant figures, and schedule periods are
 * bounded. Accumulated IEEE-754 drift across a typical loan is well below one cent.
 *
 * Rounding policy:
 *   roundCalc  — 10 decimal places, used for intermediate calculations to
 *                preserve precision through chained multiplications.
 *   roundMoney — 2 decimal places, applied at the domain boundary before any
 *                value is persisted or returned to the caller.
 */

/** Round to 10 decimal places for intermediate financial calculations. */
export function roundCalc(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

/** Round to 2 decimal places for final persisted and display values. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
