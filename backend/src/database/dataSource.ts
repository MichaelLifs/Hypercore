import 'reflect-metadata';
import path from 'path';
import { DataSource } from 'typeorm';
import { Loan } from '../domain/loan/Loan.entity';
import { LoanRateSegment } from '../domain/prime-rate/LoanRateSegment.entity';
import { RepaymentEntry } from '../domain/repayment/RepaymentEntry.entity';

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(process.cwd(), 'data', 'loans.db');

export const AppDataSource = new DataSource({
  type: 'better-sqlite3', // SQLite driver for TypeORM
  database: dbPath,
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: [Loan, LoanRateSegment, RepaymentEntry],
});
