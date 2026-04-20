import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Loan } from '../loan/Loan.entity';

/**
 * Snapshot of a prime-rate segment at loan creation time. effectiveTo is null
 * for the open-ended (current) segment. Snapshotting guarantees deterministic
 * schedule reads even after FRED publishes a new rate.
 */
@Entity('loan_rate_segments')
@Index('idx_rate_segment_loan', ['loanId'])
export class LoanRateSegment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  loanId!: string;

  @ManyToOne(() => Loan, (loan) => loan.rateSegments, { onDelete: 'CASCADE' })
  loan!: Loan;

  /** ISO date; inclusive lower bound. */
  @Column('text')
  effectiveFrom!: string;

  /** ISO date; exclusive upper bound. Null for the open-ended current segment. */
  @Column('text', { nullable: true })
  effectiveTo!: string | null;

  /** Decimal fraction (0.0850 = 8.50%). */
  @Column('real')
  annualRate!: number;
}
