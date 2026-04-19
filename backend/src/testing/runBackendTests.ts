import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/** One assertion (individual `it`) inside a test suite. */
export interface TestCaseResult {
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  failureMessages: string[];
}

/** One test file and its individual assertions. */
export interface TestSuiteResult {
  suiteName: string;
  passed: boolean;
  numPassed: number;
  numFailed: number;
  tests: TestCaseResult[];
}

export interface BackendTestResult {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTotalTestSuites: number;
  numFailedTestSuites: number;
  durationMs: number;
  failureMessages: string[];
  summary: string;
  suites: TestSuiteResult[];
}

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const JEST_BIN = path.join(BACKEND_ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
/** Absolute path used for reading; relative flag used in the CLI arg (avoids Windows backslash issues). */
const OUTPUT_FILE = path.join(BACKEND_ROOT, '.jest-output.json');
const OUTPUT_FILE_FLAG = '.jest-output.json';
const JEST_TIMEOUT_MS = 120_000;
const FAILURE_MESSAGE_MAX_CHARS = 600;

function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

function truncate(msg: string, max: number): string {
  const clean = stripAnsi(msg).trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

interface JestJsonAssertion {
  status: string;
  failureMessages?: string[];
  fullName?: string;
}

interface JestJsonTestResult {
  name: string;
  assertionResults: JestJsonAssertion[];
}

interface JestJsonOutput {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTotalTestSuites: number;
  numFailedTestSuites: number;
  testResults: JestJsonTestResult[];
}

function buildSuites(output: JestJsonOutput): TestSuiteResult[] {
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

function collectFailureMessages(output: JestJsonOutput): string[] {
  const messages: string[] = [];
  for (const suite of output.testResults) {
    for (const a of suite.assertionResults) {
      if (a.status !== 'failed') continue;
      for (const raw of a.failureMessages ?? []) {
        const header = a.fullName ? `${a.fullName}\n` : '';
        messages.push(`${header}${truncate(raw, FAILURE_MESSAGE_MAX_CHARS)}`);
        if (messages.length >= 5) return messages;
      }
    }
  }
  return messages;
}

/**
 * Spawns jest with `--outputFile` so the JSON report is written to a temp
 * file rather than captured from stdout. This is the reliable cross-platform
 * approach — stdout capture is fragile on Windows when spawning Node children.
 */
export async function runBackendTests(): Promise<BackendTestResult> {
  const startedAt = Date.now();

  // Remove stale output so we can detect a fresh write.
  try { fs.unlinkSync(OUTPUT_FILE); } catch { /* first run */ }

  return new Promise<BackendTestResult>((resolve) => {
    const child = spawn(
      process.execPath,
      [
        JEST_BIN,
        '--json',
        `--outputFile=${OUTPUT_FILE_FLAG}`,
        '--silent',
        '--ci',
      ],
      {
        cwd: BACKEND_ROOT,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const stderrChunks: Buffer[] = [];
    child.stdout.on('data', () => {}); // drain
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    const killTimer = setTimeout(() => { child.kill('SIGKILL'); }, JEST_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(killTimer);
      resolve({
        success: false,
        numTotalTests: 0, numPassedTests: 0, numFailedTests: 0,
        numPendingTests: 0, numTotalTestSuites: 0, numFailedTestSuites: 0,
        durationMs: Date.now() - startedAt,
        failureMessages: [stripAnsi(String(err.message ?? err))],
        summary: 'Failed to start jest',
        suites: [],
      });
    });

    child.on('close', () => {
      clearTimeout(killTimer);
      const durationMs = Date.now() - startedAt;

      try {
        const raw = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as JestJsonOutput;
        const suites = buildSuites(parsed);
        const failureMessages = parsed.success ? [] : collectFailureMessages(parsed);
        const summary = parsed.success
          ? `${parsed.numPassedTests}/${parsed.numTotalTests} tests passed in ${parsed.numTotalTestSuites} suites`
          : `${parsed.numFailedTests} failed, ${parsed.numPassedTests} passed (${parsed.numFailedTestSuites} failing suites)`;

        resolve({
          success: parsed.success,
          numTotalTests: parsed.numTotalTests,
          numPassedTests: parsed.numPassedTests,
          numFailedTests: parsed.numFailedTests,
          numPendingTests: parsed.numPendingTests,
          numTotalTestSuites: parsed.numTotalTestSuites,
          numFailedTestSuites: parsed.numFailedTestSuites,
          durationMs,
          failureMessages,
          summary,
          suites,
        });
      } catch (readErr) {
        const errMsg = readErr instanceof Error ? readErr.message : String(readErr);
        const tail = stripAnsi(Buffer.concat(stderrChunks).toString('utf-8')).trim().split('\n').slice(-8).join('\n');
        resolve({
          success: false,
          numTotalTests: 0, numPassedTests: 0, numFailedTests: 0,
          numPendingTests: 0, numTotalTestSuites: 0, numFailedTestSuites: 0,
          durationMs,
          failureMessages: tail ? [tail] : [errMsg],
          summary: 'Jest did not produce a JSON report',
          suites: [],
        });
      }
    });
  });
}
