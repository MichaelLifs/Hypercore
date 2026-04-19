import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { AppDataSource } from './database/dataSource';
import { loanResolvers, createContext, type GraphQLContext } from './graphql/resolvers/loan.resolver';
import { fetchPrimeRateSegments } from './domain/prime-rate/PrimeRateFetcher';

async function bootstrap() {
  await AppDataSource.initialize();
  console.log('Database connected');

  // Warm the FRED prime-rate cache before the first request arrives.
  // Fire-and-forget: a failure here is non-fatal (the fetcher has its own
  // stale-fallback logic), but it avoids a cold-start latency spike on the
  // first simulateLoan or createLoan call.
  fetchPrimeRateSegments().catch((err) =>
    console.warn('[startup] FRED prime-rate pre-fetch failed:', err),
  );

  const typeDefs = fs.readFileSync(
    path.join(__dirname, 'graphql', 'schema.graphql'),
    'utf-8',
  );

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers: loanResolvers,
  });

  const port = parseInt(process.env.PORT ?? '4000', 10);

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async () => createContext(),
  });

  console.log(`GraphQL server ready at ${url}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
