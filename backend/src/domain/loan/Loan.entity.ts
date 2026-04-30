import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LoanRateSegment } from '../prime-rate/LoanRateSegment.entity';
import { RepaymentEntry } from '../repayment/RepaymentEntry.entity';
import { DEFAULT_NON_WORK_DAY_POLICY } from './nonWorkDayPolicy';
import { nonWorkDayPolicy } from './nonWorkDayPolicy';


@Entity('loans')
@Index('idx_loan_end_date', ['endDate'])
@Index('idx_loan_created_at', ['createdAt'])
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;

  @Column('real')
  principal!: number;

  @Column('text')
  startDate!: string;

  @Column('text')
  endDate!: string;

 @Column('text', { default: DEFAULT_NON_WORK_DAY_POLICY })
 nonWorkDayPolicy!: nonWorkDayPolicy;

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
