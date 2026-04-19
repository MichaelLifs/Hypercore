import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { AppDataSource } from './database/dataSource';
import { loanResolvers } from './graphql/resolvers/loan.resolver';

async function bootstrap() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const typeDefs = fs.readFileSync(
    path.join(__dirname, 'graphql', 'schema.graphql'),
    'utf-8',
  );

  const server = new ApolloServer({
    typeDefs,
    resolvers: loanResolvers,
  });

  const port = parseInt(process.env.PORT ?? '4000', 10);

  const { url } = await startStandaloneServer(server, {
    listen: { port },
  });

  console.log(`GraphQL server ready at ${url}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
