import axios from 'axios';

export interface FetchedPrimeRateSegment {
  effectiveFrom: string;
  /** Exclusive upper bound; null for the open-ended current segment. */
  effectiveTo: string | null;
  /** Decimal fraction (0.0850 = 8.50%). */
  annualRate: number;
}

// FRED's public CSV export for the Bank Prime Loan Rate series (no API key).
// Missing observations are represented as ".". Percent values (e.g. 8.5).
const FRED_CSV_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PRIME';

// Explicit allow-list so that an HTML error page from FRED (rate limit /
// maintenance) fails loudly instead of silently yielding "no observations".
const ALLOWED_HEADERS = new Set(['DATE,PRIME', 'OBSERVATION_DATE,PRIME']);

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

// Without caching, every simulate/create would round-trip to FRED, coupling
// the write path to an external public endpoint. Concurrent callers share an
// inflight promise, and a transport failure falls back to the last-good
// snapshot so transient FRED outages don't break the app.
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
