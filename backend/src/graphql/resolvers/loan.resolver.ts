import { AppDataSource } from '../../database/dataSource';
import { Loan } from '../../domain/loan/Loan.entity';
import { RepaymentEntry } from '../../domain/repayment/RepaymentEntry.entity';
import {
  createLoan,
  simulateLoan,
  getLoans,
  getLoanById,
  CreateLoanInput,
  SimulateLoanInput,
  LoanWithPrecomputedInterest,
} from '../../domain/loan/LoanService';
import { roundMoney } from '../../utils/math';

const DEFAULT_PAGE_SIZE = 20;

export const loanResolvers = {
  Query: {
    loans: async (_: unknown, args: { page?: number; pageSize?: number }) => {
      const page = Math.max(1, args.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, args.pageSize ?? DEFAULT_PAGE_SIZE));
      return getLoans(page, pageSize);
    },

    loan: async (_: unknown, args: { id: string }) => {
      return getLoanById(args.id);
    },

    simulateLoan: async (_: unknown, args: { input: SimulateLoanInput }) => {
      return simulateLoan(args.input);
    },
  },

  Mutation: {
    createLoan: async (_: unknown, args: { input: CreateLoanInput }) => {
      return createLoan(args.input);
    },
  },

  Loan: {
    /**
     * Returns the pre-computed value when the parent loan was loaded by
     * getLoans (avoiding N+1) or createLoan. Falls back to a single
     * aggregation query for the loan(id) resolver path.
     */
    totalExpectedInterest: async (parent: Loan) => {
      if ('totalExpectedInterest' in parent) {
        return (parent as LoanWithPrecomputedInterest).totalExpectedInterest;
      }
      const result = await AppDataSource.getRepository(RepaymentEntry)
        .createQueryBuilder('e')
        .select('SUM(e.interest)', 'total')
        .where('e.loanId = :id', { id: parent.id })
        .getRawOne<{ total: string | null }>();
      return roundMoney(Number(result?.total ?? 0));
    },

    repaymentSchedule: (parent: Loan) => {
      return AppDataSource.getRepository(RepaymentEntry).find({
        where: { loanId: parent.id },
        order: { sequenceNumber: 'ASC' },
      });
    },
  },
};
