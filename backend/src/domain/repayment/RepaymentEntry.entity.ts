import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Loan } from '../loan/Loan.entity';
import type { PaymentType } from './paymentTypes';

export type { PaymentType };

@Entity('repayment_entries')
export class RepaymentEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  loanId!: string;

  @ManyToOne(() => Loan, (loan) => loan.repaymentEntries, {
    onDelete: 'CASCADE',
  })
  loan!: Loan;

  /** 1-based position in the schedule */
  @Column('integer')
  sequenceNumber!: number;

  /** ISO date string: YYYY-MM-DD */
  @Column('text')
  paymentDate!: string;

  @Column('text')
  paymentType!: PaymentType;

  /** Principal component of this payment (0 for interest-only rows) */
  @Column('real')
  principal!: number;

  @Column('real')
  interest!: number;

  /** principal + interest */
  @Column('real')
  total!: number;

  /** Outstanding principal balance after this payment is applied */
  @Column('real')
  remainingBalance!: number;
}
