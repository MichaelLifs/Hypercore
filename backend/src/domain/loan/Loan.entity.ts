import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LoanRateSegment } from '../prime-rate/LoanRateSegment.entity';
import { RepaymentEntry } from '../repayment/RepaymentEntry.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;

  @Column('real')
  principal!: number;

  /** ISO date string: YYYY-MM-DD */
  @Column('text')
  startDate!: string;

  /** ISO date string: YYYY-MM-DD */
  @Column('text')
  endDate!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => LoanRateSegment, (seg) => seg.loan, {
    cascade: true,
    eager: false,
  })
  rateSegments!: LoanRateSegment[];

  @OneToMany(() => RepaymentEntry, (entry) => entry.loan, {
    cascade: true,
    eager: false,
  })
  repaymentEntries!: RepaymentEntry[];
}
