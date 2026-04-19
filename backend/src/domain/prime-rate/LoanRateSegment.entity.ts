import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Loan } from '../loan/Loan.entity';

/**
 * One prime rate segment as fetched from FRED at loan creation time.
 * effectiveTo is null for the most recent (open-ended) segment.
 * Rate is snapshotted at creation so schedule generation is deterministic.
 */
@Entity('loan_rate_segments')
export class LoanRateSegment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  loanId!: string;

  @ManyToOne(() => Loan, (loan) => loan.rateSegments, { onDelete: 'CASCADE' })
  loan!: Loan;

  /** ISO date string: first day this rate was in effect (inclusive) */
  @Column('text')
  effectiveFrom!: string;

  /** ISO date string: first day this rate was no longer in effect (exclusive), or null if still current */
  @Column('text', { nullable: true })
  effectiveTo!: string | null;

  /** Annual rate as a decimal fraction, e.g. 0.0850 for 8.50% */
  @Column('real')
  annualRate!: number;
}
