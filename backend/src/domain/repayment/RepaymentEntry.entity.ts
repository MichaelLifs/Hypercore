import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Loan } from '../loan/Loan.entity';
import type { PaymentType } from './paymentTypes';

export type { PaymentType };

@Entity('repayment_entries')
@Index('idx_repayment_loan_seq', ['loanId', 'sequenceNumber'])
@Unique('uq_repayment_loan_seq', ['loanId', 'sequenceNumber'])
export class RepaymentEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  loanId!: string;

  @ManyToOne(() => Loan, (loan) => loan.repaymentEntries, {
    onDelete: 'CASCADE',
  })
  loan!: Loan;

  /** 1-based position in the schedule. */
  @Column('integer')
  sequenceNumber!: number;

  @Column('text')
  paymentDate!: string;

  @Column('text')
  paymentType!: PaymentType;

  /** Principal component; 0 for interest-only rows. */
  @Column('real')
  principal!: number;

  @Column('real')
  interest!: number;

  @Column('real')
  total!: number;

  /** Outstanding principal after this payment is applied. */
  @Column('real')
  remainingBalance!: number;
}
