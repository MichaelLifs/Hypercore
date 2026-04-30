import { randomUUID } from 'crypto';
import { AppDataSource } from '../../database/dataSource';
import { compareIso, parseIsoDateStrict } from '../repayment/dayCount30360';
import { generateSchedule } from '../repayment/ScheduleGenerator';
import { Loan } from './Loan.entity';
import { LoanRateSegment } from '../prime-rate/LoanRateSegment.entity';
import { RepaymentEntry } from '../repayment/RepaymentEntry.entity';
import { fetchPrimeRateSegments, FetchedPrimeRateSegment } from '../prime-rate/PrimeRateFetcher';
import { roundMoney } from '../../utils/math';
import type { ScheduleEntry } from '../repayment/repayment.types';
import { DEFAULT_NON_WORK_DAY_POLICY } from './nonWorkDayPolicy';
import type { nonWorkDayPolicy } from './nonWorkDayPolicy';

export interface CreateLoanInput {
  name: string;
  principal: number;
  startDate: string;
  endDate: string;
  nonWorkDayPolicy?:nonWorkDayPolicy;
  /** Snapshot returned by a prior simulateLoan; pinned to reproduce the preview exactly. */
  rateSegments?: FetchedPrimeRateSegment[];
  
}

export interface PaginatedLoans {
  loans: Loan[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoanListFilter {
  search?: string | null;
  startDateFrom?: string | null;
  startDateTo?: string | null;
  principalMin?: number | null;
  principalMax?: number | null;
  interestMin?: number | null;
  interestMax?: number | null;
}

export type LoanSortField =
  | 'CREATED_AT'
  | 'NAME'
  | 'PRINCIPAL'
  | 'START_DATE'
  | 'END_DATE'
  | 'TOTAL_EXPECTED_INTEREST';

export type LoanSortOrder = 'ASC' | 'DESC';

const MAX_TERM_YEARS = 50;
const MAX_RATE_SEGMENTS_INPUT = 20;

// Sanity cap for client-supplied rate snapshots. US prime has never exceeded
// ~22% historically; 50% leaves headroom while rejecting obviously abusive
// values (without this, a client could mint a loan at 10000%).
const MAX_ANNUAL_RATE = 0.5;

function assertValidPrincipal(principal: number): void {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new RangeError('principal must be a finite positive amount');
  }
}

function assertValidLoanDates(startDate: string, endDate: string): void {
  parseIsoDateStrict(startDate);
  parseIsoDateStrict(endDate);
  if (compareIso(endDate, startDate) <= 0) {
    throw new RangeError('endDate must be after startDate');
  }
  const s = parseIsoDateStrict(startDate);
  const e = parseIsoDateStrict(endDate);
  const exceedsMax =
    e.y - s.y > MAX_TERM_YEARS ||
    (e.y - s.y === MAX_TERM_YEARS && (e.m > s.m || (e.m === s.m && e.d > s.d)));
  if (exceedsMax) {
    throw new RangeError(`Loan term may not exceed ${MAX_TERM_YEARS} years`);
  }
}

export function assertValidCreateLoanInput(input: CreateLoanInput): void {
  if (input.name.trim().length === 0) {
    throw new RangeError('Loan name must not be empty');
  }
  assertValidPrincipal(input.principal);
  assertValidLoanDates(input.startDate, input.endDate);
  if (input.rateSegments !== undefined && input.rateSegments.length > MAX_RATE_SEGMENTS_INPUT) {
    throw new RangeError(`rateSegments may not exceed ${MAX_RATE_SEGMENTS_INPUT} entries`);
  }
}

function assertSortedFetchedSegments(segments: FetchedPrimeRateSegment[]): void {
  for (let i = 1; i < segments.length; i++) {
    if (compareIso(segments[i - 1].effectiveFrom, segments[i].effectiveFrom) >= 0) {
      throw new RangeError('rateSegments must be sorted strictly ascending by effectiveFrom');
    }
  }
}

// Applied to both FRED data (defence in depth) and client-supplied snapshots
// (the real attack surface, since createLoan accepts `rateSegments`).
function assertValidFetchedSegmentValues(segments: FetchedPrimeRateSegment[]): void {
  for (const s of segments) {
    parseIsoDateStrict(s.effectiveFrom);
    if (s.effectiveTo !== null) {
      parseIsoDateStrict(s.effectiveTo);
      if (compareIso(s.effectiveTo, s.effectiveFrom) <= 0) {
        throw new RangeError(
          `rateSegment effectiveTo (${s.effectiveTo}) must be strictly after effectiveFrom (${s.effectiveFrom})`,
        );
      }
    }
    if (!Number.isFinite(s.annualRate) || s.annualRate < 0) {
      throw new RangeError('each rateSegment must have a finite non-negative annualRate');
    }
    if (s.annualRate > MAX_ANNUAL_RATE) {
      throw new RangeError(
        `rateSegment annualRate ${s.annualRate} exceeds the permitted maximum of ${MAX_ANNUAL_RATE}`,
      );
    }
  }
}

/**
 * Narrows the full rate history to segments overlapping [startDate, endDate].
 * The schedule generator requires the first segment to cover startDate, so we
 * surface a clear error when upstream data predates the loan start.
 */
export function filterSegmentsForLoan(
  allSegments: FetchedPrimeRateSegment[],
  startDate: string,
  endDate: string,
): FetchedPrimeRateSegment[] {
  assertValidFetchedSegmentValues(allSegments);
  assertSortedFetchedSegments(allSegments);

  const relevant = allSegments.filter(
    (seg) =>
      compareIso(seg.effectiveFrom, endDate) <= 0 &&
      (seg.effectiveTo === null || compareIso(seg.effectiveTo, startDate) > 0),
  );

  if (relevant.length === 0) {
    throw new Error(
      `No prime rate data available for loan period ${startDate} to ${endDate}`,
    );
  }

  if (compareIso(relevant[0].effectiveFrom, startDate) > 0) {
    throw new Error(
      `No prime rate in effect on loan start date ${startDate}; ` +
        `earliest available segment starts ${relevant[0].effectiveFrom}`,
    );
  }

  return relevant;
}

export interface SimulateLoanInput {
  principal: number;
  startDate: string;
  endDate: string;
  nonWorkDayPolicy?:nonWorkDayPolicy;

}

export interface LoanSimulationResult {
  principal: number;
  startDate: string;
  endDate: string;
  totalExpectedInterest: number;
  numberOfPayments: number;
  firstPaymentDate: string | null;
  repaymentSchedule: ScheduleEntry[];
  rateSegments: FetchedPrimeRateSegment[];
}

// When `providedSegments` is passed, FRED is not consulted. This lets
// createLoan pin the preview snapshot so the persisted schedule matches the
// preview exactly even if FRED has updated between simulate and create.
async function buildLoanScheduleData(
  principal: number,
  startDate: string,
  endDate: string,
  nonWorkDayPolicy : nonWorkDayPolicy,
  providedSegments?: FetchedPrimeRateSegment[],
): Promise<{
  schedule: ScheduleEntry[];
  totalExpectedInterest: number;
  rateSegments: FetchedPrimeRateSegment[];
}> {
  const sourceSegments = providedSegments ?? (await fetchPrimeRateSegments());
  const rateSegments = filterSegmentsForLoan(sourceSegments, startDate, endDate);
  const rateSegmentsForGenerator = rateSegments.map((seg) => ({
    effectiveFrom: seg.effectiveFrom,
    annualRate: seg.annualRate,
  }));
  const schedule = generateSchedule(principal, startDate, endDate, rateSegmentsForGenerator,nonWorkDayPolicy);
  const totalExpectedInterest = roundMoney(
    schedule.reduce((sum, entry) => sum + entry.interest, 0),
  );
  return { schedule, totalExpectedInterest, rateSegments };
}


function normalizeNonWorkDayPolicy(policy?: nonWorkDayPolicy | null): nonWorkDayPolicy {
  return policy ?? DEFAULT_NON_WORK_DAY_POLICY;
}


export async function simulateLoan(input: SimulateLoanInput): Promise<LoanSimulationResult> {
  assertValidPrincipal(input.principal);
  assertValidLoanDates(input.startDate, input.endDate);
const nonWorkDayPolicy = normalizeNonWorkDayPolicy(input.nonWorkDayPolicy);
  const { schedule, totalExpectedInterest, rateSegments,} = await buildLoanScheduleData(
    input.principal,
    input.startDate,
    input.endDate,
    nonWorkDayPolicy
    
  );

  return {
    principal: input.principal,
    startDate: input.startDate,
    endDate: input.endDate,
    totalExpectedInterest,
    numberOfPayments: schedule.length,
    firstPaymentDate: schedule[0]?.paymentDate ?? null,
    repaymentSchedule: schedule,
    rateSegments,
  };
}

// WeakMap (rather than augmenting the entity) keeps the entity shape clean
// and avoids a silent collision if a real column of that name is ever added.
// Entries are released with the entity, so the cache is per-request.
const precomputedInterestByLoan = new WeakMap<Loan, number>();

export function getPrecomputedInterest(loan: Loan): number | undefined {
  return precomputedInterestByLoan.get(loan);
}

export function setPrecomputedInterest(loan: Loan, value: number): void {
  precomputedInterestByLoan.set(loan, value);
}

// The rate snapshot persisted in loan_rate_segments is immutable after
// creation; schedule reads never re-fetch from FRED.
export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  assertValidCreateLoanInput(input);
const nonWorkDayPolicy = normalizeNonWorkDayPolicy(input.nonWorkDayPolicy);
  const { schedule, totalExpectedInterest, rateSegments } = await buildLoanScheduleData(
    input.principal,
    input.startDate,
    input.endDate,
    nonWorkDayPolicy,
    input.rateSegments,
    
  );

  const loan = await AppDataSource.transaction(async (em) => {
    const saved = em.create(Loan, {
      name: input.name.trim(),
      principal: input.principal,
      startDate: input.startDate,
      endDate: input.endDate,
      nonWorkDayPolicy,
    });
    await em.save(saved);

    await em.insert(
      LoanRateSegment,
      rateSegments.map((seg) => ({
        id: randomUUID(),
        loanId: saved.id,
        effectiveFrom: seg.effectiveFrom,
        effectiveTo: seg.effectiveTo,
        annualRate: seg.annualRate,
      })),
    );

    await em.insert(
      RepaymentEntry,
      schedule.map((entry) => ({
        id: randomUUID(),
        loanId: saved.id,
        sequenceNumber: entry.sequenceNumber,
        paymentDate: entry.paymentDate,
        paymentType: entry.paymentType,
        principal: entry.principal,
        interest: entry.interest,
        total: entry.total,
        remainingBalance: entry.remainingBalance,
      })),
    );

    return saved;
  });

  setPrecomputedInterest(loan, totalExpectedInterest);
  return loan;
}

const LOAN_SORT_COLUMN: Record<Exclude<LoanSortField, 'TOTAL_EXPECTED_INTEREST'>, string> = {
  CREATED_AT: 'loan.createdAt',
  NAME: 'loan.name',
  PRINCIPAL: 'loan.principal',
  START_DATE: 'loan.startDate',
  END_DATE: 'loan.endDate',
};

export async function getLoans(
  page: number,
  pageSize: number,
  filter?: LoanListFilter | null,
  sortBy?: LoanSortField | null,
  sortOrder?: LoanSortOrder | null,
): Promise<PaginatedLoans> {
  const repo = AppDataSource.getRepository(Loan);

  const interestSubQuery = repo.manager
    .createQueryBuilder()
    .subQuery()
    .select('e.loanId', 'loanId')
    .addSelect('SUM(e.interest)', 'totalInterest')
    .from(RepaymentEntry, 'e')
    .groupBy('e.loanId')
    .getQuery();

  const qb = repo
    .createQueryBuilder('loan')
    .leftJoin(`(${interestSubQuery})`, 'iag', 'iag.loanId = loan.id');

  const f = filter ?? {};
  if (f.search?.trim()) {
    qb.andWhere('INSTR(LOWER(loan.name), LOWER(:searchSub)) > 0', {
      searchSub: f.search.trim(),
    });
  }
  if (f.startDateFrom) {
    qb.andWhere('loan.startDate >= :startDateFrom', { startDateFrom: f.startDateFrom });
  }
  if (f.startDateTo) {
    qb.andWhere('loan.startDate <= :startDateTo', { startDateTo: f.startDateTo });
  }
  if (f.principalMin != null && Number.isFinite(f.principalMin)) {
    qb.andWhere('loan.principal >= :principalMin', { principalMin: f.principalMin });
  }
  if (f.principalMax != null && Number.isFinite(f.principalMax)) {
    qb.andWhere('loan.principal <= :principalMax', { principalMax: f.principalMax });
  }
  if (f.interestMin != null && Number.isFinite(f.interestMin)) {
    qb.andWhere('COALESCE(iag.totalInterest, 0) >= :interestMin', { interestMin: f.interestMin });
  }
  if (f.interestMax != null && Number.isFinite(f.interestMax)) {
    qb.andWhere('COALESCE(iag.totalInterest, 0) <= :interestMax', { interestMax: f.interestMax });
  }

  const order: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const field: LoanSortField = sortBy ?? 'CREATED_AT';
  if (field === 'TOTAL_EXPECTED_INTEREST') {
    qb.addSelect('COALESCE(iag.totalInterest, 0)', 'total_expected_interest_sort');
    qb.orderBy('total_expected_interest_sort', order);
  } else {
    qb.orderBy(LOAN_SORT_COLUMN[field], order);
  }
  if (field !== 'CREATED_AT') {
    qb.addOrderBy('loan.createdAt', 'DESC');
  }
  // Stable tiebreaker so pages don't shuffle when many rows share the sort key.
  qb.addOrderBy('loan.id', 'DESC');

  const total = await qb.clone().getCount();
  const loans = await qb
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  if (loans.length > 0) {
    await precomputeTotalInterest(loans);
  }

  return { loans, total, page, pageSize };
}

export async function getLoanById(id: string): Promise<Loan | null> {
  return AppDataSource.getRepository(Loan).findOne({ where: { id } });
}

/**
 * Deletes loans with explicit child-first ordering in a single transaction.
 * SQLite does not enforce FK cascades unless `PRAGMA foreign_keys = ON`, which
 * this DataSource does not set; a previous cascade-based implementation
 * silently orphaned rate_segments and repayment_entries rows.
 */
export async function deleteLoansByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  return AppDataSource.transaction(async (em) => {
    await em
      .createQueryBuilder()
      .delete()
      .from(RepaymentEntry)
      .where('loanId IN (:...ids)', { ids })
      .execute();
    await em
      .createQueryBuilder()
      .delete()
      .from(LoanRateSegment)
      .where('loanId IN (:...ids)', { ids })
      .execute();
    const result = await em
      .createQueryBuilder()
      .delete()
      .from(Loan)
      .where('id IN (:...ids)', { ids })
      .execute();
    return result.affected ?? 0;
  });
}

export async function deleteLoan(id: string): Promise<boolean> {
  const affected = await deleteLoansByIds([id]);
  return affected > 0;
}

export interface PortfolioSummary {
  totalLoans: number;
  totalPrincipal: number;
  totalExpectedInterest: number;
  activeLoans: number;
  monthlyInterestTimeline: Array<{ month: string; interest: number }>;
  nextMaturity: Loan | null;
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  // UTC to match every other date in the domain (loan dates, rate segments,
  // schedule entries are ISO calendar dates). Local time made nextMaturity
  // replica-dependent around midnight.
  const todayIso = new Date().toISOString().slice(0, 10);

  // Single transaction so the aggregates agree; otherwise a concurrent
  // createLoan can land between the count and the sum queries.
  return AppDataSource.transaction(async (em) => {
    const loanAgg = await em
      .createQueryBuilder(Loan, 'l')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(l.principal), 0)', 'principal')
      .getRawOne<{ count: string; principal: string | number }>();

    const interestAgg = await em
      .createQueryBuilder(RepaymentEntry, 'e')
      .select('COALESCE(SUM(e.interest), 0)', 'interest')
      .getRawOne<{ interest: string | number }>();

    const activeAgg = await em
      .createQueryBuilder(Loan, 'l')
      .select('COUNT(*)', 'count')
      .where('l.endDate >= :today', { today: todayIso })
      .getRawOne<{ count: string | number }>();

    const monthlyInterestRows = await em
      .createQueryBuilder(RepaymentEntry, 'e')
      .select('SUBSTR(e.paymentDate, 1, 7)', 'month')
      .addSelect('COALESCE(SUM(e.interest), 0)', 'interest')
      .groupBy('SUBSTR(e.paymentDate, 1, 7)')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; interest: string | number }>();

    const nextMaturity = await em
      .createQueryBuilder(Loan, 'l')
      .where('l.endDate >= :today', { today: todayIso })
      .orderBy('l.endDate', 'ASC')
      .limit(1)
      .getOne();

    return {
      totalLoans: Number(loanAgg?.count ?? 0),
      totalPrincipal: roundMoney(Number(loanAgg?.principal ?? 0)),
      totalExpectedInterest: roundMoney(Number(interestAgg?.interest ?? 0)),
      activeLoans: Number(activeAgg?.count ?? 0),
      monthlyInterestTimeline: monthlyInterestRows.map((row) => ({
        month: row.month,
        interest: roundMoney(Number(row.interest ?? 0)),
      })),
      nextMaturity: nextMaturity ?? null,
    };
  });
}

// Precomputes SUM(interest) per loan in one grouped query so the
// totalExpectedInterest field resolver avoids N+1.
async function precomputeTotalInterest(loans: Loan[]): Promise<void> {
  const loanIds = loans.map((l) => l.id);

  const rows = await AppDataSource.getRepository(RepaymentEntry)
    .createQueryBuilder('e')
    .select('e.loanId', 'loanId')
    .addSelect('SUM(e.interest)', 'total')
    .where('e.loanId IN (:...loanIds)', { loanIds })
    .groupBy('e.loanId')
    .getRawMany<{ loanId: string; total: string }>();

  const byId = new Map(rows.map((r) => [r.loanId, roundMoney(Number(r.total))]));

  for (const loan of loans) {
    setPrecomputedInterest(loan, byId.get(loan.id) ?? 0);
  }
}
