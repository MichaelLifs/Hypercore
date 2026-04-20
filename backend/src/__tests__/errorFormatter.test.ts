import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { formatGraphQLError, DOMAIN_ERROR_CODE, INTERNAL_ERROR_CODE } from '../graphql/errorFormatter';

function formatted(
  message: string,
  extensions: Record<string, unknown> = {},
): GraphQLFormattedError {
  return { message, extensions };
}

describe('formatGraphQLError', () => {
  let consoleErrSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleErrSpy.mockRestore();
  });

  it('passes domain validation messages through with DOMAIN_ERROR code', () => {
    const err = new RangeError('principal must be a finite positive amount');
    const out = formatGraphQLError(formatted('wrapped', { code: 'INTERNAL_SERVER_ERROR' }), err);
    expect(out.message).toBe('principal must be a finite positive amount');
    expect(out.extensions?.code).toBe(DOMAIN_ERROR_CODE);
  });

  it('passes no-prime-rate-data errors through (plain Error with known prefix)', () => {
    const err = new Error('No prime rate data available for loan period 2024-01-01 to 2024-06-30');
    const out = formatGraphQLError(formatted('wrapped', { code: 'INTERNAL_SERVER_ERROR' }), err);
    expect(out.message).toBe(err.message);
    expect(out.extensions?.code).toBe(DOMAIN_ERROR_CODE);
  });

  it('replaces unknown errors with the generic message and INTERNAL code', () => {
    const err = new Error('SQLITE_BUSY: database is locked: BEGIN TRANSACTION; INSERT INTO loans …');
    const out = formatGraphQLError(formatted('wrapped', { code: 'INTERNAL_SERVER_ERROR' }), err);
    expect(out.message).not.toContain('SQLITE_BUSY');
    expect(out.message).not.toContain('INSERT');
    expect(out.message).toBe('An unexpected error occurred. Please try again.');
    expect(out.extensions?.code).toBe(INTERNAL_ERROR_CODE);
  });

  it('drops path / locations / stacktrace fields from unknown errors', () => {
    const err = new Error('some deep internal crash');
    const input: GraphQLFormattedError = {
      message: 'wrapped',
      path: ['createLoan'],
      locations: [{ line: 1, column: 1 }],
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        stacktrace: ['at Object.<anonymous> (/secret/path/loan.resolver.ts:42)'],
      },
    };
    const out = formatGraphQLError(input, err);
    expect(out.path).toBeUndefined();
    expect(out.locations).toBeUndefined();
    expect(out.extensions?.stacktrace).toBeUndefined();
  });

  it('passes Apollo-layer errors through (BAD_USER_INPUT, GRAPHQL_VALIDATION_FAILED)', () => {
    const apolloErr = new GraphQLError('Field "loans" argument "page" has invalid value', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const input: GraphQLFormattedError = {
      message: apolloErr.message,
      extensions: apolloErr.extensions,
    };
    const out = formatGraphQLError(input, apolloErr);
    expect(out.message).toBe(apolloErr.message);
    expect(out.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('strips extensions.stacktrace from domain errors (Apollo injects it in dev mode)', () => {
    const err = new RangeError('principal must be a finite positive amount');
    const input: GraphQLFormattedError = {
      message: err.message,
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        stacktrace: [
          'RangeError: principal must be a finite positive amount',
          '    at assertValidPrincipal (D:\\secret\\path\\LoanService.ts:42)',
          '    at createLoan (D:\\secret\\path\\LoanService.ts:298)',
        ],
      },
    };
    const out = formatGraphQLError(input, err);
    expect(out.extensions?.code).toBe(DOMAIN_ERROR_CODE);
    expect(out.extensions?.stacktrace).toBeUndefined();
  });

  it('strips extensions.stacktrace from Apollo-layer errors too', () => {
    const apolloErr = new GraphQLError('Field argument invalid', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const input: GraphQLFormattedError = {
      message: apolloErr.message,
      extensions: {
        code: 'BAD_USER_INPUT',
        stacktrace: ['at internalSchemaValidation (/secret/path.ts:1)'],
      },
    };
    const out = formatGraphQLError(input, apolloErr);
    expect(out.extensions?.stacktrace).toBeUndefined();
    expect(out.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('sanitizes a TypeORM EntityNotFoundError style message', () => {
    const err = new Error(
      'EntityNotFoundError: Could not find any entity of type "Loan" matching: {"id":"abc"}',
    );
    const out = formatGraphQLError(formatted('wrapped', { code: 'INTERNAL_SERVER_ERROR' }), err);
    expect(out.message).not.toContain('EntityNotFoundError');
    expect(out.message).not.toContain('"id"');
    expect(out.extensions?.code).toBe(INTERNAL_ERROR_CODE);
  });
});
