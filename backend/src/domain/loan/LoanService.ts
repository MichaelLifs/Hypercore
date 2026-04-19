import { AppDataSource } from '../../database/dataSource';
import { compareIso, parseIsoDateStrict } from '../repayment/dayCount30360';
import { generateSchedule } from '../repayment/ScheduleGenerator';
import { Loan } from './Loan.entity';
import { LoanRateSegment } from '../prime-rate/LoanRateSegment.entity';
import { RepaymentEntry } from '../repayment/RepaymentEntry.entity';
import { fetchPrimeRateSegments, FetchedPrimeRateSegment } from '../prime-rate/PrimeRateFetcher';
import { roundMoney } from '../../utils/math';

export interface CreateLoanInput {
  name: string;
  principal: number;
  startDate: string;
  endDate: string;
}

export interface PaginatedLoans {
  loans: Loan[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Domain validation for loan creation inputs (GraphQL validation is not sufficient).
 * Call before persisting or building rate/schedule data.
 */
export function assertValidCreateLoanInput(input: CreateLoanInput): void {
  if (input.name.trim().length === 0) {
    throw new RangeError('Loan name must not be empty');
  }
  if (!Number.isFinite(input.principal) || input.principal <= 0) {
    throw new RangeError('principal must be a finite positive amount');
  }
  parseIsoDateStrict(input.startDate);
  parseIsoDateStrict(input.endDate);
  if (compareIso(input.endDate, input.startDate) <= 0) {
    throw new RangeError('endDate must be after startDate');
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

  // The first (earliest) segment must cover startDate; if it starts after
  // startDate there is a gap and the schedule generator cannot proceed.
  if (compareIso(relevant[0].effectiveFrom, startDate) > 0) {
    throw new Error(
      `No prime rate in effect on loan start date ${startDate}; ` +
        `earliest available segment starts ${relevant[0].effectiveFrom}`,
    );
  }

  return relevant;
}

/**
 * Validates input, fetches the current prime rate history, generates the full
 * repayment schedule, and persists the loan, its rate snapshot, and the
 * repayment entries in a single transaction.
 *
 * The rate snapshot stored in loan_rate_segments is immutable after creation;
 * it is never re-fetched when reading a loan later.
 */
export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  assertValidCreateLoanInput(input);

  const allSegments = await fetchPrimeRateSegments();
  const relevant = filterSegmentsForLoan(allSegments, input.startDate, input.endDate);

  const rateSegmentsForGenerator = relevant.map((seg) => ({
    effectiveFrom: seg.effectiveFrom,
    annualRate: seg.annualRate,
  }));

  const schedule = generateSchedule(
    input.principal,
    input.startDate,
    input.endDate,
    rateSegmentsForGenerator,
  );

  const totalExpectedInterest = roundMoney(
    schedule.reduce((sum, entry) => sum + entry.interest, 0),
  );

  const loan = await AppDataSource.transaction(async (em) => {
    const saved = em.create(Loan, {
      name: input.name.trim(),
      principal: input.principal,
      startDate: input.startDate,
      endDate: input.endDate,
    });
    await em.save(saved);

    const segmentEntities = relevant.map((seg) =>
      em.create(LoanRateSegment, {
        loanId: saved.id,
        effectiveFrom: seg.effectiveFrom,
        effectiveTo: seg.effectiveTo,
        annualRate: seg.annualRate,
      }),
    );
    await em.save(segmentEntities);

    const entryEntities = schedule.map((entry) =>
      em.create(RepaymentEntry, {
        loanId: saved.id,
        sequenceNumber: entry.sequenceNumber,
        paymentDate: entry.paymentDate,
        paymentType: entry.paymentType,
        principal: entry.principal,
        interest: entry.interest,
        total: entry.total,
        remainingBalance: entry.remainingBalance,
      }),
    );
    await em.save(entryEntities);

    return saved;
  });

  // Attach the pre-computed value so the Loan.totalExpectedInterest field
  // resolver can return it without an extra DB round-trip.
  (loan as LoanWithPrecomputedInterest).totalExpectedInterest = totalExpectedInterest;
  return loan;
}

/**
 * Returns a paginated list of loans, with totalExpectedInterest pre-computed
 * for all loans on the page in a single aggregation query (avoids N+1).
 */
export async function getLoans(page: number, pageSize: number): Promise<PaginatedLoans> {
  const [loans, total] = await AppDataSource.getRepository(Loan).findAndCount({
    order: { createdAt: 'DESC' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  if (loans.length > 0) {
    await precomputeTotalInterest(loans);
  }

  return { loans, total, page, pageSize };
}

export async function getLoanById(id: string): Promise<Loan | null> {
  return AppDataSource.getRepository(Loan).findOne({ where: { id } });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetches SUM(interest) grouped by loanId in a single query and attaches the
 * result to each loan so the GraphQL field resolver can return it without
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
    (loan as LoanWithPrecomputedInterest).totalExpectedInterest = byId.get(loan.id) ?? 0;
  }
}

/**
 * Augmented shape used internally to pass pre-computed interest from the
 * service to the resolver without leaking it into the entity definition.
 */
export interface LoanWithPrecomputedInterest extends Loan {
  totalExpectedInterest: number;
}
