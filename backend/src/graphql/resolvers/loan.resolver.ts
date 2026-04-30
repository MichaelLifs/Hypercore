import DataLoader from 'dataloader';
import { AppDataSource } from '../../database/dataSource';
import { Loan } from '../../domain/loan/Loan.entity';
import { RepaymentEntry } from '../../domain/repayment/RepaymentEntry.entity';
import {
  createLoan,
  deleteLoan,
  simulateLoan,
  getLoans,
  type LoanListFilter,
  type LoanSortField,
  type LoanSortOrder,
  getLoanById,
  getPortfolioSummary,
  getPrecomputedInterest,
  setPrecomputedInterest,
  CreateLoanInput,
  SimulateLoanInput,
} from '../../domain/loan/LoanService';
import { clearTestLoans, seedTestLoans } from '../../domain/loan/testDataSeed';
import { runBackendTests } from '../../testing/runBackendTests';
import { runFrontendTests } from '../../testing/runFrontendTests';
import { roundMoney } from '../../utils/math';
import type { FetchedPrimeRateSegment } from '../../domain/prime-rate/PrimeRateFetcher';
import { nonWorkDayPolicy } from '../../domain/loan/nonWorkDayPolicy';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// DataLoaders are scoped per request so batching windows are bounded and
// caches never leak across users.
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
      nonWorkDayPolicy ?:nonWorkDayPolicy | null;
      
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
    nonWorkDayPolicy : input.nonWorkDayPolicy ?? undefined

  };
}

export const coreResolvers = {
  Query: {
    loans: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        filter?: LoanListFilter | null;
        sortBy?: LoanSortField | null;
        sortOrder?: LoanSortOrder | null;
      },
    ) => {
      const page = Math.max(1, args.page ?? 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, args.pageSize ?? DEFAULT_PAGE_SIZE));
      return getLoans(
        page,
        pageSize,
        args.filter ?? undefined,
        args.sortBy ?? undefined,
        args.sortOrder ?? undefined,
      );
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

    deleteLoan: async (_: unknown, args: { id: string }) => {
      return deleteLoan(args.id);
    },
  },

  Loan: {
    // Schema advertises String!; TypeORM stores Date. Without this the default
    // serializer returns non-ISO Date.prototype.toString.
    createdAt: (parent: Loan) => {
      const d = parent.createdAt instanceof Date ? parent.createdAt : new Date(parent.createdAt);
      return d.toISOString();
    },

    // Uses the precomputed WeakMap value (populated by list/create paths) and
    // falls back to a per-request DataLoader for single-loan lookups.
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

  PortfolioSummary: {},
};

// Dev-only surface: spawns processes, mutates data outside product flows,
// exposes test infrastructure. Must stay behind `isDevToolsEnabled()`.
export const devToolsResolvers = {
  Mutation: {
    seedTestLoans: async (_: unknown, args: { clearFirst?: boolean | null }) => {
      return seedTestLoans(args.clearFirst === true);
    },

    clearTestLoans: async () => {
      return clearTestLoans();
    },

    runBackendTests: async () => {
      return runBackendTests();
    },

    runFrontendTests: async () => {
      return runFrontendTests();
    },
  },
};

// Explicit BLM_ENABLE_DEV_TOOLS wins; otherwise on outside production.
// Evaluated at bootstrap so a running process can't be flipped into dev mode.
export function isDevToolsEnabled(): boolean {
  const override = process.env.BLM_ENABLE_DEV_TOOLS;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function buildResolvers(): typeof coreResolvers & { Mutation: Record<string, unknown> } {
  if (!isDevToolsEnabled()) {
    return coreResolvers;
  }
  return {
    ...coreResolvers,
    Mutation: { ...coreResolvers.Mutation, ...devToolsResolvers.Mutation },
  };
}

/** @deprecated Use `buildResolvers()`; retained for legacy test imports. */
export const loanResolvers = buildResolvers();
