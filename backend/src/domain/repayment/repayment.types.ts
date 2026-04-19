import type { PaymentType } from './paymentTypes';

export interface RateSegment {
  /** ISO date (YYYY-MM-DD); rate applies from this date (inclusive). */
  effectiveFrom: string;
  /** Annual rate as a decimal fraction, e.g. 0.085 for 8.5%. */
  annualRate: number;
}

export interface ScheduleEntry {
  sequenceNumber: number;
  /** ISO date string: YYYY-MM-DD */
  paymentDate: string;
  paymentType: PaymentType;
  principal: number;
  interest: number;
  total: number;
  remainingBalance: number;
}
