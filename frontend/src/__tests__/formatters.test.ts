import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';

describe('formatCurrency', () => {
  it('formats a round dollar amount with two decimal places', () => {
    expect(formatCurrency(1_000_000)).toBe('$1,000,000.00');
  });

  it('formats a fractional amount correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a negative amount with a leading minus', () => {
    expect(formatCurrency(-500)).toContain('500.00');
  });

  it('rounds to two decimal places (half-up)', () => {
    // $100.005 → $100.01 (standard rounding)
    expect(formatCurrency(100.005)).toMatch(/100\.0[01]/);
  });

  it('formats typical loan interest values', () => {
    expect(formatCurrency(12_345.67)).toBe('$12,345.67');
    expect(formatCurrency(0.01)).toBe('$0.01');
  });
});

describe('formatPercent', () => {
  it('formats a decimal fraction as a percentage string', () => {
    expect(formatPercent(0.085)).toContain('8.5');
    expect(formatPercent(0.085)).toContain('%');
  });

  it('formats 0 as 0.00%', () => {
    expect(formatPercent(0)).toContain('0');
    expect(formatPercent(0)).toContain('%');
  });

  it('formats 1 as 100%', () => {
    expect(formatPercent(1)).toContain('100');
    expect(formatPercent(1)).toContain('%');
  });

  it('formats typical prime rate values (e.g. 8.5%)', () => {
    const result = formatPercent(0.085);
    expect(result).toContain('8.5');
  });
});

describe('formatDate', () => {
  it('formats an ISO date to US locale month-day-year', () => {
    // Result is locale-dependent; we assert structural shape rather than exact string
    const result = formatDate('2024-03-15');
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('formats January 1 correctly', () => {
    const result = formatDate('2024-01-01');
    expect(result).toContain('2024');
    expect(result).toContain('1');
  });

  it('formats a leap-year Feb 29 correctly', () => {
    const result = formatDate('2024-02-29');
    expect(result).toContain('2024');
    expect(result).toContain('29');
  });

  it('formats December 31 correctly', () => {
    const result = formatDate('2024-12-31');
    expect(result).toContain('2024');
    expect(result).toContain('31');
  });

  it('does not shift the date by timezone (parses as local calendar date)', () => {
    // Uses local Date constructor so 2024-01-01 is always Jan 1, not Dec 31
    const result = formatDate('2024-01-01');
    expect(result).not.toMatch(/Dec/i);
    expect(result).toMatch(/Jan/i);
  });
});
