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

export interface CreateLoanInput {
  name: string;
  principal: number;
  startDate: string;
  endDate: string;
  /** Optional rate snapshot passed through from a prior simulateLoan call. */
  rateSegments?: FetchedPrimeRateSegment[];
}

export interface PaginatedLoans {
  loans: Loan[];
  total: number;
  page: number;
  pageSize: number;
}

/** Optional filters for the paginated loans list (all fields optional). */
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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MAX_TERM_YEARS = 50;
const MAX_RATE_SEGMENTS_INPUT = 20;

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

/**
 * Domain validation for loan creation inputs (GraphQL validation is not sufficient).
 * Call before persisting or building rate/schedule data.
 */
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

/**
 * Filters the full FRED rate history to only segments that overlap [startDate, endDate].
 *
 * A segment overlaps when:
 *   - its effectiveFrom is on or before endDate, AND
 *   - its effectiveTo is after startDate (or it is open-ended)
 *
 * The schedule generator requires the first segment to cover startDate
 * (i.e. its effectiveFrom must be on or before startDate). This is validated
 * explicitly so callers receive a clear error if FRED data predates the loan start.
 *
 * Exported for unit testing.
 */
export function filterSegmentsForLoan(
  allSegments: FetchedPrimeRateSegment[],
  startDate: string,
  endDate: string,
): FetchedPrimeRateSegment[] {
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

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export interface SimulateLoanInput {
  principal: number;
  startDate: string;
  endDate: string;
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

/**
 * Runs the full schedule-generation pipeline (FRED fetch → filter → generate)
 * without touching the database.
 *
 * If `providedSegments` is supplied, it is used verbatim instead of fetching
 * FRED. This lets `createLoan` accept a snapshot returned by `simulateLoan`
 * so that the persisted schedule matches the preview exactly, even if FRED
 * has updated between calls.
 */
async function buildLoanScheduleData(
  principal: number,
  startDate: string,
  endDate: string,
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
  const schedule = generateSchedule(principal, startDate, endDate, rateSegmentsForGenerator);
  const totalExpectedInterest = roundMoney(
    schedule.reduce((sum, entry) => sum + entry.interest, 0),
  );
  return { schedule, totalExpectedInterest, rateSegments };
}

/**
 * Previews a repayment schedule using real prime-rate data from FRED.
 * Pure computation; nothing is written to the database.
 */
export async function simulateLoan(input: SimulateLoanInput): Promise<LoanSimulationResult> {
  assertValidPrincipal(input.principal);
  assertValidLoanDates(input.startDate, input.endDate);

  const { schedule, totalExpectedInterest, rateSegments } = await buildLoanScheduleData(
    input.principal,
    input.startDate,
    input.endDate,
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

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Precomputed-interest storage, keyed by the Loan entity instance.
 *
 * Using a WeakMap (instead of augmenting the entity with a non-column field
 * and testing `'totalExpectedInterest' in parent`) keeps the entity shape
 * clean, avoids a silent failure mode if a real column of that name is ever
 * added, and doesn't leak the cache beyond a single request lifetime.
 */
const precomputedInterestByLoan = new WeakMap<Loan, number>();

export function getPrecomputedInterest(loan: Loan): number | undefined {
  return precomputedInterestByLoan.get(loan);
}

export function setPrecomputedInterest(loan: Loan, value: number): void {
  precomputedInterestByLoan.set(loan, value);
}

/**
 * Validates input, optionally fetches the current prime rate history (only if
 * the caller didn't pass a snapshot), generates the full repayment schedule,
 * and persists the loan, its rate snapshot, and the repayment entries in a
 * single transaction.
 *
 * The rate snapshot stored in loan_rate_segments is immutable after creation;
 * it is never re-fetched when reading a loan later.
 */
export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  assertValidCreateLoanInput(input);

  const { schedule, totalExpectedInterest, rateSegments } = await buildLoanScheduleData(
    input.principal,
    input.startDate,
    input.endDate,
    input.rateSegments,
  );

  const loan = await AppDataSource.transaction(async (em) => {
    const saved = em.create(Loan, {
      name: input.name.trim(),
      principal: input.principal,
      startDate: input.startDate,
      endDate: input.endDate,
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

/** Excludes interest sort: pagination with joins requires ORDER BY without `.` (TypeORM distinct-id path). */
const LOAN_SORT_COLUMN: Record<Exclude<LoanSortField, 'TOTAL_EXPECTED_INTEREST'>, string> = {
  CREATED_AT: 'loan.createdAt',
  NAME: 'loan.name',
  PRINCIPAL: 'loan.principal',
  START_DATE: 'loan.startDate',
  END_DATE: 'loan.endDate',
};

/**
 * Returns a paginated list of loans, with totalExpectedInterest pre-computed
 * for all loans on the page in a single aggregation query (avoids N+1).
 */
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
  // Ensure stable ordering across pages when many rows share the same sort key.
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
 * Deletes a loan and all associated rate segments and repayment entries in a
 * single transaction. Returns `true` when the loan was found and removed,
 * `false` when no loan with the given id exists.
 *
 * Child rows are deleted explicitly before the parent because SQLite does not
 * enforce FK constraints unless `PRAGMA foreign_keys = ON` is set, and this
 * DataSource does not set it.
 */
export async function deleteLoan(id: string): Promise<boolean> {
  const repo = AppDataSource.getRepository(Loan);
  const loan = await repo.findOne({ where: { id } });
  if (!loan) return false;

  await AppDataSource.transaction(async (em) => {
    await em.createQueryBuilder().delete().from(RepaymentEntry).where('loanId = :id', { id }).execute();
    await em.createQueryBuilder().delete().from(LoanRateSegment).where('loanId = :id', { id }).execute();
    await em.delete(Loan, { id });
  });

  return true;
}

// ---------------------------------------------------------------------------
// Portfolio aggregates
// ---------------------------------------------------------------------------

export interface PortfolioSummary {
  totalLoans: number;
  totalPrincipal: number;
  totalExpectedInterest: number;
  activeLoans: number;
  monthlyInterestTimeline: Array<{ month: string; interest: number }>;
  nextMaturity: Loan | null;
}

/**
 * Aggregate portfolio figures computed in SQL so they are correct for
 * portfolios of any size. Previously the frontend computed these over the
 * first 100 loans returned by `loans(page: 1, pageSize: 100)`, silently
 * wrong for larger portfolios.
 */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  // UTC to match every other date in the domain (loan start/end, rate
  // segments, schedule entries) which are ISO calendar dates with no timezone.
  // Using local time here made nextMaturity replica-dependent around midnight.
  const todayIso = new Date().toISOString().slice(0, 10);

  // Single transaction so all three queries see a consistent snapshot.
  // Without this, a createLoan arriving between queries produces aggregates
  // that don't add up (e.g. totalLoans counts the new loan but totalExpectedInterest
  // doesn't yet include its schedule rows).
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetches SUM(interest) grouped by loanId in a single query and attaches the
 * result (via a WeakMap) so the GraphQL field resolver can return it without
 * issuing one query per loan.
 */
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
