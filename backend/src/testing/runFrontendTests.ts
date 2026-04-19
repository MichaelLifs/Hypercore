import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { TestSuiteResult, TestCaseResult } from './runBackendTests';

export interface FrontendTestResult {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  durationMs: number;
  summary: string;
  suites: TestSuiteResult[];
  failureMessages: string[];
}

const FRONTEND_ROOT = path.resolve(__dirname, '..', '..', '..', 'frontend');
/** Use vitest.mjs directly — avoids .cmd shim / shell:true issues on Windows. */
const VITEST_BIN = path.join(FRONTEND_ROOT, 'node_modules', 'vitest', 'vitest.mjs');
const OUTPUT_FILE = path.join(FRONTEND_ROOT, '.vitest-output.json');
/** Relative flag passed to vitest CLI — avoids Windows backslash issues. */
const OUTPUT_FILE_FLAG = '.vitest-output.json';
const VITEST_TIMEOUT_MS = 120_000;
const FAILURE_MESSAGE_MAX_CHARS = 600;

function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

function truncate(msg: string, max: number): string {
  const clean = stripAnsi(msg).trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/**
 * Vitest v2 JSON reporter emits the same shape as Jest's --json:
 *   testResults[].name          – file path
 *   testResults[].assertionResults[]  – individual test cases
 */
interface JestCompatAssertion {
  fullName?: string;
  status: string;
  failureMessages?: string[];
}

interface JestCompatSuite {
  name: string;
  assertionResults: JestCompatAssertion[];
}

interface JestCompatOutput {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: JestCompatSuite[];
}

function buildSuites(output: JestCompatOutput): TestSuiteResult[] {
  return output.testResults.map((suite) => {
    const suiteName = path.basename(suite.name);
    const tests: TestCaseResult[] = suite.assertionResults.map((a) => ({
      fullName: a.fullName ?? '(unnamed)',
      status: (a.status as TestCaseResult['status']) ?? 'skipped',
      failureMessages: (a.failureMessages ?? []).map((m) =>
        truncate(m, FAILURE_MESSAGE_MAX_CHARS),
      ),
    }));
    const numPassed = tests.filter((t) => t.status === 'passed').length;
    const numFailed = tests.filter((t) => t.status === 'failed').length;
    return { suiteName, passed: numFailed === 0, numPassed, numFailed, tests };
  });
}

/**
 * Spawns `node vitest.mjs run` from the frontend directory using the same
 * --outputFile pattern as the backend Jest runner — reliable cross-platform.
 */
export async function runFrontendTests(): Promise<FrontendTestResult> {
  const startedAt = Date.now();

  try { fs.unlinkSync(OUTPUT_FILE); } catch { /* first run */ }

  return new Promise<FrontendTestResult>((resolve) => {
    const child = spawn(
      process.execPath,
      [
        VITEST_BIN,
        'run',
        '--reporter=json',
        `--outputFile=${OUTPUT_FILE_FLAG}`,
        '--config',
        'vitest.config.ts',
      ],
      {
        cwd: FRONTEND_ROOT,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const stderrChunks: Buffer[] = [];
    child.stdout.on('data', () => {}); // drain
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    const killTimer = setTimeout(() => { child.kill('SIGKILL'); }, VITEST_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(killTimer);
      resolve({
        success: false,
        numTotalTests: 0, numPassedTests: 0, numFailedTests: 0,
        durationMs: Date.now() - startedAt,
        failureMessages: [stripAnsi(String(err.message ?? err))],
        summary: 'Failed to start Vitest',
        suites: [],
      });
    });

    child.on('close', () => {
      clearTimeout(killTimer);
      const durationMs = Date.now() - startedAt;
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');

      try {
        const raw = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        const report = JSON.parse(raw) as JestCompatOutput;
        const suites = buildSuites(report);
        const numTotalTests = suites.reduce((s, f) => s + f.tests.length, 0);
        const numPassedTests = suites.reduce((s, f) => s + f.numPassed, 0);
        const numFailedTests = suites.reduce((s, f) => s + f.numFailed, 0);
        const summary = report.success
          ? `${numPassedTests}/${numTotalTests} tests passed in ${suites.length} suites`
          : `${numFailedTests} failed, ${numPassedTests} passed`;

        resolve({
          success: report.success,
          numTotalTests,
          numPassedTests,
          numFailedTests,
          durationMs,
          summary,
          suites,
          failureMessages: suites
            .flatMap((s) => s.tests)
            .filter((t) => t.status === 'failed')
            .flatMap((t) => t.failureMessages)
            .slice(0, 5),
        });
      } catch {
        const tail = stripAnsi(stderr).trim().split('\n').slice(-8).join('\n');
        resolve({
          success: false,
          numTotalTests: 0, numPassedTests: 0, numFailedTests: 0,
          durationMs,
          summary: 'Vitest did not produce a JSON report',
          suites: [],
          failureMessages: tail ? [tail] : ['Vitest did not produce a JSON report'],
        });
      }
    });
  });
}
