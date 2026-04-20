// Guards the dev-only mutations (spawn processes, bulk delete) from showing
// up in the production resolver map.

import { buildResolvers, isDevToolsEnabled } from '../graphql/resolvers/loan.resolver';

const DEV_MUTATION_NAMES = [
  'seedTestLoans',
  'clearTestLoans',
  'runBackendTests',
  'runFrontendTests',
] as const;

const CORE_MUTATION_NAMES = ['createLoan', 'deleteLoan'] as const;

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const snapshot: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) snapshot[k] = process.env[k];
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    for (const [k, v] of Object.entries(snapshot)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe('isDevToolsEnabled', () => {
  it('defaults to enabled when NODE_ENV is not production', () => {
    withEnv({ NODE_ENV: 'development', BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      expect(isDevToolsEnabled()).toBe(true);
    });
    withEnv({ NODE_ENV: 'test', BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      expect(isDevToolsEnabled()).toBe(true);
    });
    withEnv({ NODE_ENV: undefined, BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      expect(isDevToolsEnabled()).toBe(true);
    });
  });

  it('defaults to DISABLED when NODE_ENV is production', () => {
    withEnv({ NODE_ENV: 'production', BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      expect(isDevToolsEnabled()).toBe(false);
    });
  });

  it('can be forced off in development via BLM_ENABLE_DEV_TOOLS=false', () => {
    withEnv({ NODE_ENV: 'development', BLM_ENABLE_DEV_TOOLS: 'false' }, () => {
      expect(isDevToolsEnabled()).toBe(false);
    });
  });

  it('can be forced on in production via BLM_ENABLE_DEV_TOOLS=true (self-hosted only)', () => {
    withEnv({ NODE_ENV: 'production', BLM_ENABLE_DEV_TOOLS: 'true' }, () => {
      expect(isDevToolsEnabled()).toBe(true);
    });
  });

  it('treats unrelated values as a miss and falls back to NODE_ENV default', () => {
    withEnv({ NODE_ENV: 'production', BLM_ENABLE_DEV_TOOLS: 'yes' }, () => {
      expect(isDevToolsEnabled()).toBe(false);
    });
    withEnv({ NODE_ENV: 'development', BLM_ENABLE_DEV_TOOLS: '1' }, () => {
      expect(isDevToolsEnabled()).toBe(true);
    });
  });
});

describe('buildResolvers', () => {
  it('omits every dev-only mutation in production mode', () => {
    withEnv({ NODE_ENV: 'production', BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      const resolvers = buildResolvers();
      const names = Object.keys(resolvers.Mutation);
      for (const dev of DEV_MUTATION_NAMES) {
        expect(names).not.toContain(dev);
      }
      for (const core of CORE_MUTATION_NAMES) {
        expect(names).toContain(core);
      }
    });
  });

  it('includes every dev mutation in development mode', () => {
    withEnv({ NODE_ENV: 'development', BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      const resolvers = buildResolvers();
      const names = Object.keys(resolvers.Mutation);
      for (const dev of DEV_MUTATION_NAMES) {
        expect(names).toContain(dev);
      }
      for (const core of CORE_MUTATION_NAMES) {
        expect(names).toContain(core);
      }
    });
  });

  it('core production resolvers remain intact regardless of gate', () => {
    withEnv({ NODE_ENV: 'production', BLM_ENABLE_DEV_TOOLS: undefined }, () => {
      const prod = buildResolvers();
      expect(Object.keys(prod.Query)).toEqual(
        expect.arrayContaining(['loans', 'loan', 'simulateLoan', 'portfolioSummary']),
      );
      expect(typeof prod.Mutation.createLoan).toBe('function');
      expect(typeof prod.Mutation.deleteLoan).toBe('function');
    });
  });
});
