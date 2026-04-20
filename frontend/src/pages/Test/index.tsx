import React, { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import {
  CLEAR_TEST_LOANS,
  RUN_BACKEND_TESTS,
  RUN_FRONTEND_TESTS,
  SEED_TEST_LOANS,
} from '../../graphql/operations/test';
import { GET_LOANS, GET_PORTFOLIO_SUMMARY } from '../../graphql/operations/loans';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCaseResult {
  fullName: string;
  status: string;
  failureMessages: string[];
}

interface TestSuiteResult {
  suiteName: string;
  passed: boolean;
  numPassed: number;
  numFailed: number;
  tests: TestCaseResult[];
}

interface SeedTestLoansData {
  seedTestLoans: {
    created: number;
    skipped: number;
    cleared: number;
    createdLabels: string[];
  };
}

interface ClearTestLoansData {
  clearTestLoans: number;
}

interface BackendTestResultData {
  runBackendTests: {
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
  };
}

interface FrontendTestResultData {
  runFrontendTests: {
    success: boolean;
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    durationMs: number;
    summary: string;
    failureMessages: string[];
    suites: TestSuiteResult[];
  };
}

// ─── Suite breakdown ──────────────────────────────────────────────────────────

/**
 * Renders suites as collapsible sections open by default, each test on its own
 * row with an inline PASS / FAIL badge. Clicking the header toggles it.
 * The test name IS the description — it comes directly from the `it('...')` string.
 */
function SuiteBreakdown({ suites }: { suites: TestSuiteResult[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <SuiteList>
      {suites.map((suite) => {
        const isOpen = !collapsed.has(suite.suiteName);
        return (
          <SuiteItem key={suite.suiteName}>
            {/* ── Suite header ── */}
            <SuiteHeader
              type="button"
              $passed={suite.passed}
              onClick={() => toggle(suite.suiteName)}
              aria-expanded={isOpen}
            >
              <SuiteStatusDot $passed={suite.passed} />
              <SuiteFileName>{suite.suiteName}</SuiteFileName>
              <SuiteCount>
                {suite.numPassed} / {suite.numPassed + suite.numFailed}
              </SuiteCount>
              <ChevronIcon $open={isOpen} aria-hidden>›</ChevronIcon>
            </SuiteHeader>

            {/* ── Per-test rows ── */}
            {isOpen && (
              <TestList>
                {suite.tests.map((test, idx) => {
                  const passed = test.status === 'passed';
                  const skipped = test.status === 'pending' || test.status === 'skipped';
                  return (
                    <TestRow key={idx} $failed={test.status === 'failed'}>
                      <TestRowTop>
                        <TestBadge $passed={passed} $skipped={skipped}>
                          {passed ? 'PASS' : skipped ? 'SKIP' : 'FAIL'}
                        </TestBadge>
                        <TestName>{test.fullName}</TestName>
                      </TestRowTop>
                      {test.failureMessages.map((msg, mi) => (
                        <FailurePre key={mi}>{msg}</FailurePre>
                      ))}
                    </TestRow>
                  );
                })}
              </TestList>
            )}
          </SuiteItem>
        );
      })}
    </SuiteList>
  );
}

// ─── Shared test result panel ─────────────────────────────────────────────────

interface TestResultPanelProps {
  success: boolean;
  passed: number;
  total: number;
  durationMs: number;
  suites: TestSuiteResult[];
  failureMessages: string[];
}

function TestResultPanel({
  success,
  passed,
  total,
  durationMs,
  suites,
  failureMessages,
}: TestResultPanelProps) {
  return (
    <ResultBlock>
      <ResultHeader>
        <StatusPill $success={success}>
          {success ? '✓ All tests passed' : '✗ Tests failed'}
        </StatusPill>
        <ResultMeta>
          <ResultMetaItem>
            <strong>{passed}</strong>/{total} passed
          </ResultMetaItem>
          <ResultMetaDivider>·</ResultMetaDivider>
          <ResultMetaItem>{(durationMs / 1000).toFixed(2)}s</ResultMetaItem>
        </ResultMeta>
      </ResultHeader>

      {suites.length > 0 && <SuiteBreakdown suites={suites} />}

      {failureMessages.length > 0 && (
        <ExtraFailures>
          {failureMessages.map((msg, idx) => (
            <FailurePre key={idx}>{msg}</FailurePre>
          ))}
        </ExtraFailures>
      )}
    </ResultBlock>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TestPage() {
  const apolloClient = useApolloClient();

  const [seedLoans, { loading: seeding }] = useMutation<SeedTestLoansData>(SEED_TEST_LOANS);
  const [clearLoans, { loading: clearing }] = useMutation<ClearTestLoansData>(CLEAR_TEST_LOANS);
  const [runBackendTests, { loading: testingBackend }] =
    useMutation<BackendTestResultData>(RUN_BACKEND_TESTS);
  const [runFrontendTests, { loading: testingFrontend }] =
    useMutation<FrontendTestResultData>(RUN_FRONTEND_TESTS);

  const [seedResult, setSeedResult] = useState<SeedTestLoansData['seedTestLoans'] | null>(null);
  const [backendResult, setBackendResult] =
    useState<BackendTestResultData['runBackendTests'] | null>(null);
  const [frontendResult, setFrontendResult] =
    useState<FrontendTestResultData['runFrontendTests'] | null>(null);

  const refreshLoanCaches = async () => {
    await Promise.allSettled([
      apolloClient.refetchQueries({ include: [GET_LOANS, GET_PORTFOLIO_SUMMARY] }),
    ]);
  };

  const handleSeed = async (clearFirst: boolean) => {
    try {
      const { data } = await seedLoans({ variables: { clearFirst } });
      if (!data) return;
      setSeedResult(data.seedTestLoans);
      await refreshLoanCaches();
      const { created, skipped, cleared } = data.seedTestLoans;
      if (created === 0 && skipped > 0) {
        toast.success(`No new loans (${skipped} already present)`, { id: 'seed-loans' });
      } else {
        const parts = [`Created ${created} loan${created === 1 ? '' : 's'}`];
        if (skipped > 0) parts.push(`skipped ${skipped}`);
        if (cleared > 0) parts.push(`cleared ${cleared}`);
        toast.success(parts.join(' · '), { id: 'seed-loans' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to seed test loans', { id: 'seed-loans' });
    }
  };

  const handleClear = async () => {
    try {
      const { data } = await clearLoans();
      if (!data) return;
      setSeedResult(null);
      await refreshLoanCaches();
      toast.success(
        data.clearTestLoans === 0
          ? 'No test loans to clear'
          : `Cleared ${data.clearTestLoans} test loan${data.clearTestLoans === 1 ? '' : 's'}`,
        { id: 'clear-loans' },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear test loans', { id: 'clear-loans' });
    }
  };

  const handleRunBackendTests = async () => {
    setBackendResult(null);
    try {
      const { data } = await runBackendTests();
      if (!data) return;
      setBackendResult(data.runBackendTests);
      if (data.runBackendTests.success) {
        toast.success(data.runBackendTests.summary, { id: 'backend-tests' });
      } else {
        toast.error(data.runBackendTests.summary, { id: 'backend-tests' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to run backend tests', { id: 'backend-tests' });
    }
  };

  const handleRunFrontendTests = async () => {
    setFrontendResult(null);
    try {
      const { data } = await runFrontendTests();
      if (!data) return;
      setFrontendResult(data.runFrontendTests);
      if (data.runFrontendTests.success) {
        toast.success(data.runFrontendTests.summary, { id: 'frontend-tests' });
      } else {
        toast.error(data.runFrontendTests.summary, { id: 'frontend-tests' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to run frontend tests', { id: 'frontend-tests' });
    }
  };

  return (
    <Container>
      <PageHeader>
        <PageTitle>Test</PageTitle>
        <PageSubtitle>
          Internal dev utilities: seed edge-case loans and run backend + frontend test suites.
        </PageSubtitle>
      </PageHeader>

      <Grid>
        {/* ── Section 1: Seed data ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardEyebrow>Section 1</CardEyebrow>
            <CardTitle>Generate Loan Test Data</CardTitle>
            <CardDescription>
              Inserts a curated set of loans through the real <code>createLoan</code> pipeline.
              Every scenario mirrors an edge case from the backend test suite  mid-month start,
              leap-year Feb 29, rate change on coupon date, zero-rate, start on the 31st, and more.
              Loans are prefixed with <code>TEST</code> so they can be cleared in one click.
            </CardDescription>
          </CardHeader>

          <ButtonRow>
            <Button onClick={() => handleSeed(false)} disabled={seeding || clearing}>
              {seeding ? 'Creating…' : 'Create test loan'}
            </Button>
            <Button $variant="secondary" onClick={handleClear} disabled={seeding || clearing}>
              {clearing ? 'Clearing…' : 'Clear test loans'}
            </Button>
          </ButtonRow>

          {seedResult && (
            <ResultBlock>
              <ResultHeader>
                <StatusPill $success={seedResult.created > 0 || seedResult.skipped > 0}>
                  {seedResult.created > 0
                    ? `✓ ${seedResult.created} loan${seedResult.created === 1 ? '' : 's'} created`
                    : `Already seeded`}
                </StatusPill>
                {seedResult.cleared > 0 && (
                  <ResultMeta>
                    <ResultMetaItem>{seedResult.cleared} cleared first</ResultMetaItem>
                  </ResultMeta>
                )}
              </ResultHeader>
              {seedResult.createdLabels.length > 0 && (
                <LabelList>
                  {seedResult.createdLabels.map((label) => (
                    <LabelChip key={label}>{label}</LabelChip>
                  ))}
                </LabelList>
              )}
            </ResultBlock>
          )}
        </Card>

        {/* ── Section 2: Backend tests ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardEyebrow>Section 2</CardEyebrow>
            <CardTitle>Run Backend Tests</CardTitle>
            <CardDescription>
              Spawns the backend Jest suite out-of-process and parses the JSON report for backend
              tests.
            </CardDescription>
          </CardHeader>

          <ButtonRow>
            <Button onClick={handleRunBackendTests} disabled={testingBackend}>
              {testingBackend ? 'Running jest…' : 'Run backend tests'}
            </Button>
          </ButtonRow>

          {testingBackend && !backendResult && (
            <RunningNote>Running ... this usually takes a few seconds…</RunningNote>
          )}

          {backendResult && (
            <TestResultPanel
              success={backendResult.success}
              passed={backendResult.numPassedTests}
              total={backendResult.numTotalTests}
              durationMs={backendResult.durationMs}
              suites={backendResult.suites}
              failureMessages={backendResult.failureMessages}
            />
          )}
        </Card>

        {/* ── Section 3: Frontend tests ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardEyebrow>Section 3</CardEyebrow>
            <CardTitle>Run Frontend Tests</CardTitle>
            <CardDescription>
              Runs the Vitest suite and parses the JSON report for frontend tests.
            </CardDescription>
          </CardHeader>

          <ButtonRow>
            <Button onClick={handleRunFrontendTests} disabled={testingFrontend}>
              {testingFrontend ? 'Running Vitest…' : 'Run frontend tests'}
            </Button>
          </ButtonRow>

          {testingFrontend && !frontendResult && (
            <RunningNote>Running ... this usually takes a few seconds…</RunningNote>
          )}

          {frontendResult && (
            <TestResultPanel
              success={frontendResult.success}
              passed={frontendResult.numPassedTests}
              total={frontendResult.numTotalTests}
              durationMs={frontendResult.durationMs}
              suites={frontendResult.suites}
              failureMessages={frontendResult.failureMessages}
            />
          )}
        </Card>
      </Grid>
    </Container>
  );
}

// ─── Styled components ────────────────────────────────────────────────────────

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.md};
  }
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 2px;
  letter-spacing: -0.01em;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const CardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CardEyebrow = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin: 0;
`;

const CardTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  margin: 0;
`;

const CardDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin: 0;

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.92em;
    padding: 1px 5px;
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const RunningNote = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

// ─── Result block ─────────────────────────────────────────────────────────────

const ResultBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const StatusPill = styled.span<{ $success: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $success, theme }) => ($success ? theme.colors.success : theme.colors.error)};
  background: ${({ $success, theme }) =>
    $success
      ? theme.colors.successMuted
      : `color-mix(in srgb, ${theme.colors.error} 14%, ${theme.colors.surface})`};
  border: 1px solid
    ${({ $success, theme }) =>
      $success
        ? `color-mix(in srgb, ${theme.colors.success} 28%, transparent)`
        : `color-mix(in srgb, ${theme.colors.error} 30%, transparent)`};
`;

const ResultMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ResultMetaItem = styled.span`
  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

const ResultMetaDivider = styled.span`
  opacity: 0.4;
`;

const ExtraFailures = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LabelList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const LabelChip = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

// ─── Suite breakdown ──────────────────────────────────────────────────────────

const SuiteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const SuiteItem = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const SuiteHeader = styled.button<{ $passed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  width: 100%;
  padding: 7px 10px;
  background: ${({ $passed, theme }) =>
    $passed
      ? `color-mix(in srgb, ${theme.colors.success} 7%, ${theme.colors.surface})`
      : `color-mix(in srgb, ${theme.colors.error} 8%, ${theme.colors.surface})`};
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ $passed, theme }) =>
      $passed
        ? `color-mix(in srgb, ${theme.colors.success} 14%, ${theme.colors.surface})`
        : `color-mix(in srgb, ${theme.colors.error} 14%, ${theme.colors.surface})`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`;

const SuiteStatusDot = styled.span<{ $passed: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $passed, theme }) => ($passed ? theme.colors.success : theme.colors.error)};
`;

const SuiteFileName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuiteCount = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`;

const ChevronIcon = styled.span<{ $open: boolean }>`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
  transition: transform 0.15s ease;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  flex-shrink: 0;
  line-height: 1;
`;

const TestList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const TestRow = styled.div<{ $failed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 10px 5px 10px;
  background: ${({ $failed, theme }) =>
    $failed
      ? `color-mix(in srgb, ${theme.colors.error} 4%, ${theme.colors.surface})`
      : theme.colors.surface};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const TestRowTop = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.xs};
`;

/** Inline pill badge: PASS (green) · FAIL (red) · SKIP (grey) */
const TestBadge = styled.span<{ $passed: boolean; $skipped: boolean }>`
  display: inline-block;
  flex-shrink: 0;
  padding: 0px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  letter-spacing: 0.4px;
  line-height: 16px;
  color: ${({ $passed, $skipped, theme }) =>
    $passed ? theme.colors.success : $skipped ? theme.colors.textMuted : theme.colors.error};
  background: ${({ $passed, $skipped, theme }) =>
    $passed
      ? theme.colors.successMuted
      : $skipped
      ? theme.colors.background
      : `color-mix(in srgb, ${theme.colors.error} 12%, ${theme.colors.surface})`};
  border: 1px solid
    ${({ $passed, $skipped, theme }) =>
      $passed
        ? `color-mix(in srgb, ${theme.colors.success} 30%, transparent)`
        : $skipped
        ? theme.colors.border
        : `color-mix(in srgb, ${theme.colors.error} 30%, transparent)`};
`;

const TestName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
`;

const FailurePre = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow: auto;
`;
