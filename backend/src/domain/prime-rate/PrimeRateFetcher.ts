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
 * No API key required. Returns two columns: DATE,PRIME
 * where PRIME is the rate in percent (e.g. 8.5 for 8.5%).
 * Missing observations are represented as ".".
 */
const FRED_CSV_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PRIME';

/**
 * Parses the FRED prime rate CSV into chronologically ordered rate segments.
 *
 * Exported for unit testing — this is the only stateful-free piece worth
 * testing in isolation.
 */
export function parsePrimeRateCsv(csv: string): FetchedPrimeRateSegment[] {
  const lines = csv.trim().split('\n');

  // First line is the header (DATE,PRIME) — skip it.
  const observations: Array<{ date: string; annualRate: number }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;

    const date = line.slice(0, commaIdx).trim();
    const rateStr = line.slice(commaIdx + 1).trim();

    // FRED marks missing observations with "."; skip them.
    if (rateStr === '.' || rateStr === '') continue;

    const ratePercent = Number(rateStr);
    if (!Number.isFinite(ratePercent)) continue;

    observations.push({ date, annualRate: ratePercent / 100 });
  }

  if (observations.length === 0) {
    throw new Error('FRED prime rate: no valid observations found in response');
  }

  // FRED data is chronologically ordered, but sort defensively.
  observations.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Build segments: each observation is effective from its date until the next
  // observation's date (exclusive). The final observation is open-ended (null).
  return observations.map((obs, i) => ({
    effectiveFrom: obs.date,
    effectiveTo: i + 1 < observations.length ? observations[i + 1].date : null,
    annualRate: obs.annualRate,
  }));
}

/**
 * Fetches the full prime rate history from FRED and returns it as a
 * chronologically ordered array of non-overlapping rate segments.
 *
 * Rate source: FRED "Bank Prime Loan Rate" (series PRIME).
 * Approach: public CSV export — stable, machine-readable, no API key needed.
 */
export async function fetchPrimeRateSegments(): Promise<FetchedPrimeRateSegment[]> {
  const { data } = await axios.get<string>(FRED_CSV_URL, {
    responseType: 'text',
    timeout: 10_000,
  });
  return parsePrimeRateCsv(data);
}
