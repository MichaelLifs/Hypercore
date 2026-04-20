import type { ApolloError } from '@apollo/client';

// The backend formatter is the actual sanitizer; this helper covers the two
// cases it can't (network failures never hit the server, and empty/undefined
// messages would render as blank UI).
export function userFacingErrorMessage(error: ApolloError | undefined | null): string {
  if (!error) return '';

  if (error.networkError) {
    return 'We could not reach the server. Please check your connection and try again.';
  }

  const first = error.graphQLErrors?.[0];
  const message = first?.message ?? error.message;
  if (!message || !message.trim()) {
    return 'An unexpected error occurred. Please try again.';
  }
  return message;
}
