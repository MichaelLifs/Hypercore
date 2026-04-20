import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
});

// Diagnostics only; components still surface user-facing messages from the
// hook-level error object.
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
      // Each (page, pageSize) is a distinct cache entry so paging doesn't
      // overwrite the previous page under cache-and-network.
      Query: {
        fields: {
          loans: {
            keyArgs: ['page', 'pageSize'],
          },
        },
      },
      // PaginatedLoans has no id; replace on every response.
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
