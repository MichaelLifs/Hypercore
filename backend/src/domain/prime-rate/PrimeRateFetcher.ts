import axios from 'axios';

/**
 * One row from the FRED prime-rate history before it is persisted as loan rate
 * segments. Unlike schedule computation segments, each row has an exclusive end
 * date (or null when still current).
 */
export interface FetchedPrimeRateSegment {
  /** ISO date string: YYYY-MM-DD */
  effectiveFrom: string;
  /** ISO date string or null for the most recent segment */
  effectiveTo: string | null;
  /** Annual rate as a decimal fraction, e.g. 0.0850 */
  annualRate: number;
}

/**
 * FRED's public CSV export for the Bank Prime Loan Rate series.
 * No API key required. Returns two columns: date + PRIME (historically
 * "DATE,PRIME"; FRED may use "observation_date,PRIME").
 * PRIME is the rate in percent (e.g. 8.5 for 8.5%).
 * Missing observations are represented as ".".
 */
const FRED_CSV_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PRIME';

/**
 * FRED CSV allowed headers (uppercase). Guarded against because an HTML error
 * page from FRED (rate limit, maintenance) would otherwise silently parse to
 * "no valid observations" and surface a misleading error.
 */
const ALLOWED_HEADERS = new Set(['DATE,PRIME', 'OBSERVATION_DATE,PRIME']);

/**
 * Parses the FRED prime rate CSV into chronologically ordered rate segments.
 *
 * Exported for unit testing; this is the only stateful-free piece worth
 * testing in isolation.
 */
export function parsePrimeRateCsv(csv: string): FetchedPrimeRateSegment[] {
  const lines = csv.trim().split('\n');

  const header = lines[0]?.trim().toUpperCase();
  if (!header || !ALLOWED_HEADERS.has(header)) {
    throw new Error(
      `FRED prime rate: unexpected CSV header (got "${lines[0]?.slice(0, 80) ?? ''}", ` +
        `expected one of ${[...ALLOWED_HEADERS].join(', ')}). The upstream may have returned an error page.`,
    );
  }

  const observations: Array<{ date: string; annualRate: number }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;

    const date = line.slice(0, commaIdx).trim();
    const rateStr = line.slice(commaIdx + 1).trim();

    if (rateStr === '.' || rateStr === '') continue;

    const ratePercent = Number(rateStr);
    if (!Number.isFinite(ratePercent)) continue;

    observations.push({ date, annualRate: ratePercent / 100 });
  }

  if (observations.length === 0) {
    throw new Error('FRED prime rate: no valid observations found in response');
  }

  observations.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return observations.map((obs, i) => ({
    effectiveFrom: obs.date,
    effectiveTo: i + 1 < observations.length ? observations[i + 1].date : null,
    annualRate: obs.annualRate,
  }));
}

/**
 * In-memory cache for the FRED prime rate history.
 *
 * Motivation: every simulateLoan and createLoan used to round-trip to FRED,
 * which is both a scalability cost (spamming an external public endpoint) and
 * a reliability bomb (FRED downtime → the entire write path fails).
 *
 * Strategy:
 *   - Fresh cache (age < FRED_CACHE_TTL_MS) is served directly.
 *   - An inflight promise is shared so concurrent callers never trigger more
 *     than one outbound request.
 *   - On HTTP failure, if we have ANY previously cached value we return the
 *     last-good snapshot instead of 500-ing. The app stays usable through
 *     short FRED outages at the cost of slightly stale rates.
 */
interface FredCacheEntry {
  segments: FetchedPrimeRateSegment[];
  fetchedAt: number;
}

const FRED_CACHE_TTL_MS = 60 * 60 * 1000;
let fredCache: FredCacheEntry | null = null;
let inflight: Promise<FetchedPrimeRateSegment[]> | null = null;

/** Test-only: clear caches between runs. */
export function __resetPrimeRateCache(): void {
  fredCache = null;
  inflight = null;
}

async function fetchFromFred(): Promise<FetchedPrimeRateSegment[]> {
  const { data } = await axios.get<string>(FRED_CSV_URL, {
    responseType: 'text',
    timeout: 10_000,
    transformResponse: [(v) => v],
  });
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('FRED prime rate: empty response body');
  }
  return parsePrimeRateCsv(data);
}

/**
 * Fetches the full prime rate history from FRED and returns it as a
 * chronologically ordered array of non-overlapping rate segments.
 *
 * Rate source: FRED "Bank Prime Loan Rate" (series PRIME).
 * Approach: public CSV export (stable, machine-readable, no API key needed).
 *
 * Caches results for FRED_CACHE_TTL_MS. Falls back to the last-good snapshot
 * on transport failure so the app stays usable when FRED is unreachable.
 */
export async function fetchPrimeRateSegments(): Promise<FetchedPrimeRateSegment[]> {
  const now = Date.now();
  if (fredCache && now - fredCache.fetchedAt < FRED_CACHE_TTL_MS) {
    return fredCache.segments;
  }
  if (inflight) {
    return inflight;
  }
  inflight = (async () => {
    try {
      const segments = await fetchFromFred();
      fredCache = { segments, fetchedAt: Date.now() };
      return segments;
    } catch (cause) {
      if (fredCache) {
        // Serve stale rather than failing the request outright.
        // eslint-disable-next-line no-console
        console.warn(
          '[PrimeRateFetcher] FRED fetch failed; serving last-good snapshot ' +
            `from ${new Date(fredCache.fetchedAt).toISOString()}`,
          cause,
        );
        return fredCache.segments;
      }
      throw new Error(
        'Unable to fetch current prime rate from FRED (https://fred.stlouisfed.org). ' +
          'Check your internet connection and try again.',
        { cause: cause as Error },
      );
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
