import 'reflect-metadata';

import fs from 'fs';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { AppDataSource } from './database/dataSource';
import {
  buildResolvers,
  createContext,
  isDevToolsEnabled,
  type GraphQLContext,
} from './graphql/resolvers/loan.resolver';
import { formatGraphQLError } from './graphql/errorFormatter';
import { fetchPrimeRateSegments } from './domain/prime-rate/PrimeRateFetcher';

async function bootstrap() {
  await AppDataSource.initialize();
  console.log('Database connected');

  // Fire-and-forget cache warm so the first simulate/create doesn't pay the
  // FRED cold-start. Non-fatal: the fetcher has its own stale-fallback.
  fetchPrimeRateSegments().catch((err) =>
    console.warn('[startup] FRED prime-rate pre-fetch failed:', err),
  );

  const coreSchema = fs.readFileSync(
    path.join(__dirname, 'graphql', 'schema.graphql'),
    'utf-8',
  );

  // Dev-only schema shares the same gate as the resolver merge so the two
  // can't drift (a mutation declared in the schema but missing from resolvers
  // would crash Apollo at boot).
  const devSchemaPath = path.join(__dirname, 'graphql', 'schema.devtools.graphql');
  const devToolsEnabled = isDevToolsEnabled();
  const typeDefs: string[] = [coreSchema];
  if (devToolsEnabled) {
    typeDefs.push(fs.readFileSync(devSchemaPath, 'utf-8'));
  }

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers: buildResolvers(),
    formatError: formatGraphQLError,
  });

  const port = parseInt(process.env.PORT ?? '4000', 10);

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async () => createContext(),
  });

  console.log(`GraphQL server ready at ${url}`);
  console.log(
    devToolsEnabled
      ? '[dev-tools] ENABLED - seedTestLoans / clearTestLoans / run*Tests mutations are exposed'
      : '[dev-tools] disabled (set BLM_ENABLE_DEV_TOOLS=true to enable)',
  );
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
