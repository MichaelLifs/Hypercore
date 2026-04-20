import { describe, it, expect } from 'vitest';
import {
  validateLoanForm,
  hasFormErrors,
  type LoanFormState,
} from '../utils/loanFormValidation';

const VALID: LoanFormState = {
  name: 'Bridge Facility',
  principal: '100000',
  startDate: '2024-01-01',
  endDate: '2025-01-01',
};

describe('validateLoanForm', () => {
  it('returns no errors for a valid form', () => {
    const errors = validateLoanForm(VALID);
    expect(hasFormErrors(errors)).toBe(false);
  });

  it('requires a non-empty name', () => {
    const errors = validateLoanForm({ ...VALID, name: '' });
    expect(errors.name).toBeTruthy();
  });

  it('rejects a whitespace-only name', () => {
    const errors = validateLoanForm({ ...VALID, name: '   ' });
    expect(errors.name).toBeTruthy();
  });

  it('accepts a name with surrounding whitespace (trimmed by domain)', () => {
    const errors = validateLoanForm({ ...VALID, name: '  My Loan  ' });
    expect(errors.name).toBeFalsy();
  });

  it('requires a principal value', () => {
    const errors = validateLoanForm({ ...VALID, principal: '' });
    expect(errors.principal).toBeTruthy();
  });

  it('rejects zero principal', () => {
    const errors = validateLoanForm({ ...VALID, principal: '0' });
    expect(errors.principal).toBeTruthy();
  });

  it('rejects negative principal', () => {
    const errors = validateLoanForm({ ...VALID, principal: '-1000' });
    expect(errors.principal).toBeTruthy();
  });

  it('rejects non-numeric principal', () => {
    const errors = validateLoanForm({ ...VALID, principal: 'abc' });
    expect(errors.principal).toBeTruthy();
  });

  it('accepts principal with comma-formatted string', () => {
    const errors = validateLoanForm({ ...VALID, principal: '1,000,000' });
    expect(errors.principal).toBeFalsy();
  });

  it('accepts a fractional principal', () => {
    const errors = validateLoanForm({ ...VALID, principal: '50000.50' });
    expect(errors.principal).toBeFalsy();
  });

  it('requires a start date', () => {
    const errors = validateLoanForm({ ...VALID, startDate: '' });
    expect(errors.startDate).toBeTruthy();
  });

  it('requires an end date', () => {
    const errors = validateLoanForm({ ...VALID, endDate: '' });
    expect(errors.endDate).toBeTruthy();
  });

  it('rejects end date equal to start date', () => {
    const errors = validateLoanForm({ ...VALID, startDate: '2024-06-01', endDate: '2024-06-01' });
    expect(errors.endDate).toBeTruthy();
  });

  it('rejects end date before start date', () => {
    const errors = validateLoanForm({ ...VALID, startDate: '2024-06-01', endDate: '2024-05-01' });
    expect(errors.endDate).toBeTruthy();
  });

  it('accepts end date strictly after start date', () => {
    const errors = validateLoanForm({
      ...VALID,
      startDate: '2024-01-15',
      endDate: '2024-01-16',
    });
    expect(errors.endDate).toBeFalsy();
  });

  it('returns no end-date error when start date is missing (only startDate error)', () => {
    const errors = validateLoanForm({ ...VALID, startDate: '', endDate: '2024-12-31' });
    expect(errors.startDate).toBeTruthy();
    expect(errors.endDate).toBeFalsy();
  });
});

describe('hasFormErrors', () => {
  it('returns false for an empty errors object', () => {
    expect(hasFormErrors({})).toBe(false);
  });

  it('returns true when any field has an error', () => {
    expect(hasFormErrors({ name: 'required' })).toBe(true);
    expect(hasFormErrors({ principal: 'required' })).toBe(true);
  });

  it('returns false when all error fields are undefined', () => {
    expect(hasFormErrors({ name: undefined, principal: undefined })).toBe(false);
  });
});
