import DataLoader from 'dataloader';
import { AppDataSource } from '../../database/dataSource';
import { Loan } from '../../domain/loan/Loan.entity';
import { RepaymentEntry } from '../../domain/repayment/RepaymentEntry.entity';
import {
  createLoan,
  simulateLoan,
  getLoans,
  getLoanById,
  getPortfolioSummary,
  getPrecomputedInterest,
  setPrecomputedInterest,
  CreateLoanInput,
  SimulateLoanInput,
} from '../../domain/loan/LoanService';
import { roundMoney } from '../../utils/math';
import type { FetchedPrimeRateSegment } from '../../domain/prime-rate/PrimeRateFetcher';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Per-request context. DataLoaders are scoped to a single GraphQL request so
 * that batching windows are bounded and no cache persists across users.
 */
export interface GraphQLContext {
  loaders: {
    repaymentScheduleByLoanId: DataLoader<string, RepaymentEntry[]>;
    totalInterestByLoanId: DataLoader<string, number>;
  };
}

export function createContext(): GraphQLContext {
  const repaymentRepo = AppDataSource.getRepository(RepaymentEntry);
  return {
    loaders: {
      repaymentScheduleByLoanId: new DataLoader<string, RepaymentEntry[]>(
        async (loanIds) => {
          const rows = await repaymentRepo
            .createQueryBuilder('e')
            .where('e.loanId IN (:...loanIds)', { loanIds })
            .orderBy('e.loanId')
            .addOrderBy('e.sequenceNumber', 'ASC')
            .getMany();
          const byLoan = new Map<string, RepaymentEntry[]>();
          for (const id of loanIds) byLoan.set(id, []);
          for (const row of rows) {
            byLoan.get(row.loanId)?.push(row);
          }
          return loanIds.map((id) => byLoan.get(id) ?? []);
        },
      ),
      totalInterestByLoanId: new DataLoader<string, number>(async (loanIds) => {
        const rows = await repaymentRepo
          .createQueryBuilder('e')
          .select('e.loanId', 'loanId')
          .addSelect('SUM(e.interest)', 'total')
          .where('e.loanId IN (:...loanIds)', { loanIds })
          .groupBy('e.loanId')
          .getRawMany<{ loanId: string; total: string }>();
        const byId = new Map(rows.map((r) => [r.loanId, roundMoney(Number(r.total))]));
        return loanIds.map((id) => byId.get(id) ?? 0);
      }),
    },
  };
}

function toCreateLoanInput(
  args: {
    input: {
      name: string;
      principal: number;
      startDate: string;
      endDate: string;
      rateSegments?: FetchedPrimeRateSegment[] | null;
    };
  },
): CreateLoanInput {
  const { input } = args;
  return {
    name: input.name,
    principal: input.principal,
    startDate: input.startDate,
    endDate: input.endDate,
    rateSegments: input.rateSegments ?? undefined,
  };
}

export const loanResolvers = {
  Query: {
    loans: async (_: unknown, args: { page?: number; pageSize?: number }) => {
      const page = Math.max(1, args.page ?? 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, args.pageSize ?? DEFAULT_PAGE_SIZE));
      return getLoans(page, pageSize);
    },

    loan: async (_: unknown, args: { id: string }) => {
      return getLoanById(args.id);
    },

    simulateLoan: async (_: unknown, args: { input: SimulateLoanInput }) => {
      return simulateLoan(args.input);
    },

    portfolioSummary: async () => {
      return getPortfolioSummary();
    },
  },

  Mutation: {
    createLoan: async (
      _: unknown,
      args: {
        input: {
          name: string;
          principal: number;
          startDate: string;
          endDate: string;
          rateSegments?: FetchedPrimeRateSegment[] | null;
        };
      },
    ) => {
      return createLoan(toCreateLoanInput(args));
    },
  },

  Loan: {
    /**
     * Date → ISO string. The entity stores a JS Date (TypeORM @CreateDateColumn)
     * but the schema advertises `String!`. Without this resolver the default
     * serializer returns the non-ISO Date.prototype.toString output.
     */
    createdAt: (parent: Loan) => {
      const d = parent.createdAt instanceof Date ? parent.createdAt : new Date(parent.createdAt);
      return d.toISOString();
    },

    /**
     * Returns the pre-computed value when the parent loan was loaded by
     * getLoans or createLoan (via the WeakMap in LoanService). Falls back to
     * the per-request DataLoader for single-loan lookups.
     */
    totalExpectedInterest: async (parent: Loan, _args: unknown, ctx: GraphQLContext) => {
      const precomputed = getPrecomputedInterest(parent);
      if (precomputed !== undefined) {
        return precomputed;
      }
      const total = await ctx.loaders.totalInterestByLoanId.load(parent.id);
      setPrecomputedInterest(parent, total);
      return total;
    },

    repaymentSchedule: async (parent: Loan, _args: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.repaymentScheduleByLoanId.load(parent.id);
    },
  },

  PortfolioSummary: {
    // nextMaturity is a Loan — let the Loan.* field resolvers kick in.
  },
};
