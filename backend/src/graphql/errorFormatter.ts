import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';

// Signal the frontend uses to decide "show message" vs "show generic fallback".
export const DOMAIN_ERROR_CODE = 'DOMAIN_ERROR';
export const INTERNAL_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

const GENERIC_MESSAGE = 'An unexpected error occurred. Please try again.';

// Domain validation throws RangeError by convention
// (`assertValidCreateLoanInput` etc.); rate-coverage failures throw plain
// Error with hand-written user text and are recognized by prefix.
const DOMAIN_MESSAGE_PREFIXES: readonly string[] = [
  'principal must',
  'Loan name must',
  'endDate must',
  'Loan term may not exceed',
  'rateSegments may not',
  'rateSegments must',
  'rateSegment',
  'each rateSegment',
  'No prime rate',
  'Invalid date',
  'Invalid ISO date',
];

function isSafeDomainMessage(err: unknown): boolean {
  if (err instanceof RangeError) return true;
  if (err instanceof Error && typeof err.message === 'string') {
    return DOMAIN_MESSAGE_PREFIXES.some((prefix) => err.message.startsWith(prefix));
  }
  return false;
}

// Drop Apollo / graphql-js debug fields (`stacktrace`, `exception`,
// `originalError`) from the outgoing payload. `stacktrace` leaks source paths
// and internal call graphs and must never reach a client, even in dev.
function safeExtensions(
  ext: GraphQLFormattedError['extensions'] | undefined,
  code: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { code };
  if (ext && typeof ext === 'object') {
    for (const key of ['http'] as const) {
      if (key in ext) out[key] = (ext as Record<string, unknown>)[key];
    }
  }
  return out;
}

/**
 * Splits errors into three buckets:
 *   1. Apollo / graphql-js protocol errors (BAD_USER_INPUT, etc.) — pass
 *      through, but still scrub debug fields from extensions.
 *   2. Domain errors (RangeError or prefix-matched Error) — tagged with
 *      DOMAIN_ERROR_CODE so the frontend shows the message verbatim.
 *   3. Everything else (DB/ORM internals, unexpected throws) — logged
 *      server-side and replaced with a generic message so implementation
 *      details never reach the UI.
 */
export function formatGraphQLError(
  formatted: GraphQLFormattedError,
  rawError: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(rawError);

  const existingCode = formatted.extensions?.code;
  if (
    typeof existingCode === 'string' &&
    existingCode !== INTERNAL_ERROR_CODE &&
    existingCode !== 'UNKNOWN'
  ) {
    return {
      ...formatted,
      extensions: safeExtensions(formatted.extensions, existingCode),
    };
  }

  if (isSafeDomainMessage(original)) {
    const message = original instanceof Error ? original.message : formatted.message;
    return {
      ...formatted,
      message,
      extensions: safeExtensions(formatted.extensions, DOMAIN_ERROR_CODE),
    };
  }

  console.error('[graphql] unhandled resolver error:', original);

  // Deliberately drop `path`, `locations`, `stacktrace`: their presence alone
  // can leak schema and resolver structure.
  return {
    message: GENERIC_MESSAGE,
    extensions: { code: INTERNAL_ERROR_CODE },
  } satisfies GraphQLFormattedError;
}

export const __test__ = { isSafeDomainMessage, GENERIC_MESSAGE };

export type { GraphQLError, GraphQLFormattedError };
