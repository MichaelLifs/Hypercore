import { assertValidCreateLoanInput } from '../domain/loan/LoanService';

describe('assertValidCreateLoanInput', () => {
  const base = () => ({
    name: 'Bridge facility',
    principal: 100_000,
    startDate: '2024-01-01',
    endDate: '2025-01-01',
  });

  it('accepts a valid payload', () => {
    expect(() => assertValidCreateLoanInput(base())).not.toThrow();
  });

  it('rejects blank name', () => {
    expect(() => assertValidCreateLoanInput({ ...base(), name: '   ' })).toThrow(RangeError);
  });

  it('rejects non-positive or non-finite principal', () => {
    expect(() => assertValidCreateLoanInput({ ...base(), principal: 0 })).toThrow(RangeError);
    expect(() => assertValidCreateLoanInput({ ...base(), principal: -1 })).toThrow(RangeError);
    expect(() => assertValidCreateLoanInput({ ...base(), principal: Number.NaN })).toThrow(RangeError);
  });

  it('rejects invalid ISO dates or end before start', () => {
    expect(() => assertValidCreateLoanInput({ ...base(), startDate: 'not-a-date' })).toThrow();
    expect(() =>
      assertValidCreateLoanInput({ ...base(), startDate: '2024-06-01', endDate: '2024-06-01' }),
    ).toThrow(RangeError);
  });
});
