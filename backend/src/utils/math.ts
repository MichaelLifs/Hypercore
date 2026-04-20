/**
 * Float is acceptable here: principals are whole dollars, rates carry at most
 * 4 significant figures, schedule periods are bounded, so IEEE-754 drift
 * across a full loan stays well below a cent. roundCalc preserves precision
 * through chained multiplications; roundMoney is the domain boundary applied
 * to every persisted / returned value.
 */

export function roundCalc(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
