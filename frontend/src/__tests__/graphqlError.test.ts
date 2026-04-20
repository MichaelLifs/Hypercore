/**
 * Frontend's `userFacingErrorMessage` helper. The backend's
 * `formatGraphQLError` does the real sanitization; this helper is the
 * belt-and-suspenders layer that covers the two failure modes the backend
 * cannot: no-network errors and empty-message payloads.
 */

import { describe, expect, it } from 'vitest';
import type { ApolloError } from '@apollo/client';
import { userFacingErrorMessage } from '../utils/graphqlError';

function makeError(partial: Partial<ApolloError>): ApolloError {
  return {
    message: '',
    graphQLErrors: [],
    networkError: null,
    ...partial,
  } as unknown as ApolloError;
}

describe('userFacingErrorMessage', () => {
  it('returns an empty string for null / undefined (loading state)', () => {
    expect(userFacingErrorMessage(null)).toBe('');
    expect(userFacingErrorMessage(undefined)).toBe('');
  });

  it('returns the first graphQLError message when present (server-sanitized)', () => {
    const err = makeError({
      message: 'Whatever Apollo composed',
      graphQLErrors: [
        {
          message: 'principal must be a finite positive amount',
          extensions: { code: 'DOMAIN_ERROR' },
        } as unknown as ApolloError['graphQLErrors'][number],
      ],
    });
    expect(userFacingErrorMessage(err)).toBe('principal must be a finite positive amount');
  });

  it('returns a network fallback message when the request did not reach the server', () => {
    const err = makeError({
      message: 'Failed to fetch',
      networkError: new Error('offline') as unknown as ApolloError['networkError'],
    });
    expect(userFacingErrorMessage(err)).toMatch(/could not reach the server/i);
  });

  it('falls back to a generic message when there is no usable text', () => {
    const err = makeError({ message: '' });
    expect(userFacingErrorMessage(err)).toMatch(/unexpected error/i);
  });

  it('falls back to the apollo top-level message when graphQLErrors is empty', () => {
    const err = makeError({ message: 'An unexpected error occurred. Please try again.' });
    expect(userFacingErrorMessage(err)).toBe('An unexpected error occurred. Please try again.');
  });
});
