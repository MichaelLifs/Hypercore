import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
});

/**
 * Surface network/GraphQL errors in the console with a single, consistent
 * shape. Components still receive `error` from useQuery/useMutation and are
 * responsible for user-facing messaging; this link is purely for diagnostics.
 */
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // eslint-disable-next-line no-console
      console.warn(
        `[GraphQL error] operation=${operation.operationName} message=${err.message}`,
      );
    }
  }
  if (networkError) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Network error] operation=${operation.operationName} message=${networkError.message}`,
    );
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      /**
       * Each (page, pageSize) combination is a distinct cache entry so that
       * paging does not overwrite the previous page under `cache-and-network`.
       */
      Query: {
        fields: {
          loans: {
            keyArgs: ['page', 'pageSize'],
          },
        },
      },
      /**
       * PaginatedLoans has no `id`, so Apollo can't normalize it. Merging by
       * replacement is correct because a new response for the same keyArgs
       * supersedes the old one.
       */
      PaginatedLoans: {
        keyFields: false,
      },
      PortfolioSummary: {
        keyFields: [],
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
