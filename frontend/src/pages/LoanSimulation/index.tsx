import React, { useRef, useState } from 'react';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import toast from 'react-hot-toast';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { ScheduleTable } from '../LoanDetail/ScheduleTable';
import { NewLoanModal } from '../LoanList/NewLoanModal';
import { SIMULATE_LOAN } from '../../graphql/operations/loans';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RateSegmentSnapshot {
  effectiveFrom: string;
  effectiveTo: string | null;
  annualRate: number;
}

interface SimulationResult {
  principal: number;
  startDate: string;
  endDate: string;
  totalExpectedInterest: number;
  numberOfPayments: number;
  firstPaymentDate: string | null;
  repaymentSchedule: Array<{
    sequenceNumber: number;
    paymentDate: string;
    paymentType: 'INTEREST' | 'PRINCIPAL_AND_INTEREST';
    principal: number;
    interest: number;
    total: number;
    remainingBalance: number;
  }>;
  rateSegments: RateSegmentSnapshot[];
}

interface FormState {
  principal: string;
  startDate: string;
  endDate: string;
}

interface FieldErrors {
  principal?: string;
  startDate?: string;
  endDate?: string;
}

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const principal = Number(form.principal.replace(/,/g, ''));

  if (!form.principal.trim()) {
    errors.principal = 'Principal is required';
  } else if (!Number.isFinite(principal) || principal <= 0) {
    errors.principal = 'Enter a positive amount';
  }

  if (!form.startDate) errors.startDate = 'Start date is required';
  if (!form.endDate) {
    errors.endDate = 'End date is required';
  } else if (form.startDate && form.endDate <= form.startDate) {
    errors.endDate = 'End date must be after start date';
  }

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function LoanSimulationPage() {
  const apolloClient = useApolloClient();
  const [form, setForm] = useState<FormState>({ principal: '', startDate: '', endDate: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const [runSimulation, { data, loading, error }] = useLazyQuery<{
    simulateLoan: SimulationResult;
  }>(SIMULATE_LOAN, {
    fetchPolicy: 'network-only',
    onCompleted: () => {
      toast.success('Simulation updated', { id: 'loan-simulation' });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    },
  });

  const result = data?.simulateLoan ?? null;
  const resultsRef = useRef<HTMLDivElement>(null);

  // The earliest valid end date is one day after the selected start date.
  const minEndDate = React.useMemo(() => {
    if (!form.startDate) return undefined;
    const d = new Date(form.startDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [form.startDate]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear end date when start date moves past it to avoid a silently invalid range.
      if (field === 'startDate' && prev.endDate && value >= prev.endDate) {
        next.endDate = '';
      }
      return next;
    });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Strip non-numeric characters while typing; format on blur.
  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, '');
    setForm((prev) => ({ ...prev, principal: raw }));
    if (fieldErrors.principal) {
      setFieldErrors((prev) => ({ ...prev, principal: undefined }));
    }
  };

  const handlePrincipalBlur = () => {
    const num = parseFloat(form.principal);
    if (!isNaN(num)) {
      setForm((prev) => ({ ...prev, principal: num.toLocaleString('en-US') }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (hasErrors(errors)) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    runSimulation({
      variables: {
        input: {
          principal: Number(form.principal.replace(/,/g, '')),
          startDate: form.startDate,
          endDate: form.endDate,
        },
      },
    });
  };

  return (
    <Page>
      <Container>
        <PageHeader>
          <PageTitle>Loan Simulation</PageTitle>
          <PageSubtitle>
            Enter a principal amount and term dates to instantly preview a full repayment
            schedule interest calculated using current prime-rate data, no loan created.
          </PageSubtitle>
        </PageHeader>

        <InputCard>
          <FormHint>
            All fields are required. Dates must form a valid future range; the schedule
            updates immediately on each run.
          </FormHint>
          <Form onSubmit={handleSubmit}>
            <Fields>
              <Field>
                <Label htmlFor="sim-principal">Principal</Label>
                <InputGroup>
                  <CurrencyPrefix aria-hidden>$</CurrencyPrefix>
                  <Input
                    id="sim-principal"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="1,000,000"
                    value={form.principal}
                    onChange={handlePrincipalChange}
                    onBlur={handlePrincipalBlur}
                    $hasError={!!fieldErrors.principal}
                    aria-invalid={!!fieldErrors.principal}
                    aria-describedby={
                      fieldErrors.principal ? 'err-principal' : 'hint-principal'
                    }
                  />
                </InputGroup>
                {fieldErrors.principal ? (
                  <FieldError id="err-principal" role="alert">{fieldErrors.principal}</FieldError>
                ) : (
                  <FieldHint id="hint-principal">Loan amount in USD</FieldHint>
                )}
              </Field>

              <Field>
                <Label htmlFor="sim-start">Start Date</Label>
                <Input
                  id="sim-start"
                  type="date"
                  value={form.startDate}
                  onChange={set('startDate')}
                  $hasError={!!fieldErrors.startDate}
                  aria-invalid={!!fieldErrors.startDate}
                  aria-describedby={fieldErrors.startDate ? 'err-start' : 'hint-start'}
                />
                {fieldErrors.startDate ? (
                  <FieldError id="err-start" role="alert">{fieldErrors.startDate}</FieldError>
                ) : (
                  <FieldHint id="hint-start">Loan disbursement date</FieldHint>
                )}
              </Field>

              <Field>
                <Label htmlFor="sim-end">End Date</Label>
                <Input
                  id="sim-end"
                  type="date"
                  value={form.endDate}
                  min={minEndDate}
                  onChange={set('endDate')}
                  $hasError={!!fieldErrors.endDate}
                  aria-invalid={!!fieldErrors.endDate}
                  aria-describedby={fieldErrors.endDate ? 'err-end' : 'hint-end'}
                />
                {fieldErrors.endDate ? (
                  <FieldError id="err-end" role="alert">{fieldErrors.endDate}</FieldError>
                ) : (
                  <FieldHint id="hint-end">Maturity / bullet-repayment date</FieldHint>
                )}
              </Field>
            </Fields>

            <FormFooter>
              <Button type="submit" disabled={loading}>
                {loading && <SpinnerIcon />}
                {loading ? 'Running simulation…' : 'Run Simulation'}
              </Button>
            </FormFooter>
          </Form>
        </InputCard>

        {error && !loading && (
          <ErrorBanner role="alert">
            <ErrorIcon aria-hidden />
            <div>
              <strong>Simulation failed.</strong> {error.message}
            </div>
          </ErrorBanner>
        )}

        {result && !loading && (
          <div ref={resultsRef}>
            <PreviewBanner role="note">
              <InfoIcon aria-hidden />
              <span>
                <strong>Simulation preview.</strong> This schedule reflects current prime-rate data.
              </span>
            </PreviewBanner>

            <SummaryGrid>
              <SummaryCard>
                <SummaryLabel>Total Expected Interest</SummaryLabel>
                <SummaryValue accent>{formatCurrency(result.totalExpectedInterest)}</SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Number of Payments</SummaryLabel>
                <SummaryValue>{result.numberOfPayments}</SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>First Payment Date</SummaryLabel>
                <SummaryValue>
                  {result.firstPaymentDate ? formatDate(result.firstPaymentDate) : 'N/A'}
                </SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Maturity Date</SummaryLabel>
                <SummaryValue>{formatDate(result.endDate)}</SummaryValue>
              </SummaryCard>
            </SummaryGrid>

            <ScheduleSection>
              <SectionHeader>
                <SectionTitle>Repayment Schedule</SectionTitle>
                <SectionSubtitle>
                  {result.numberOfPayments} payment
                  {result.numberOfPayments !== 1 ? 's' : ''} · principal{' '}
                  {formatCurrency(result.principal)}
                </SectionSubtitle>
              </SectionHeader>
              <TableScroll>
                <ScheduleTable variant="simulation" entries={result.repaymentSchedule} />
              </TableScroll>
            </ScheduleSection>

            <CreateCta>
              <CtaCopy>
                <strong>Ready to create this loan?</strong> Save it to your portfolio to start tracking principal and interest.
              </CtaCopy>
              <Button $variant="primary" onClick={() => setCreateModalOpen(true)}>
                Create Loan
              </Button>
            </CreateCta>
          </div>
        )}
      </Container>

      <NewLoanModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          void apolloClient.refetchQueries({ include: ['GetPortfolioSummary', 'GetLoans'] });
        }}
        initialValues={
          result
            ? {
                principal: String(result.principal),
                startDate: result.startDate,
                endDate: result.endDate,
                rateSegments: result.rateSegments,
              }
            : undefined
        }
      />
    </Page>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 10v6M12 7h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <SpinnerSvg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </SpinnerSvg>
  );
}

const Page = styled.div`
  background: ${({ theme }) => theme.colors.background};
  min-height: calc(100vh - 64px);
  padding-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  }
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  max-width: 60ch;
`;

const InputCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const CurrencyPrefix = styled.span<{ $hasError?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid
    ${({ $hasError, theme }) => ($hasError ? theme.colors.error : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md} 0 0 ${({ theme }) => theme.radius.md};
  border-right: none;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  user-select: none;
  flex-shrink: 0;
  transition: border-color 0.15s ease;
`;

const InputGroup = styled.div`
  display: flex;
  align-items: stretch;

  &:focus-within ${CurrencyPrefix} {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:has(input[aria-invalid='true']) ${CurrencyPrefix} {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const Input = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid
    ${({ $hasError, theme }) => ($hasError ? theme.colors.error : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  /* When rendered inside InputGroup the left radius is owned by the CurrencyPrefix */
  ${InputGroup} & {
    border-radius: 0 ${({ theme }) => theme.radius.md} ${({ theme }) => theme.radius.md} 0;
    border-left: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${({ $hasError, theme }) =>
      $hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ $hasError, theme }) =>
        $hasError
          ? `color-mix(in srgb, ${theme.colors.error} 15%, transparent)`
          : theme.colors.primaryLight};
  }
`;

const FieldError = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.error};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const FieldHint = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const FormHint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SpinnerSvg = styled.svg`
  flex-shrink: 0;
  animation: sim-spin 0.75s linear infinite;

  @keyframes sim-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

const FormFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.xs};
`;

const Banner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const PreviewBanner = styled(Banner)`
  background: ${({ theme }) => theme.colors.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.primary};
`;

const ErrorBanner = styled(Banner)`
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.colors.error} 10%, transparent)`};
  border: 1px solid ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.colors.error};
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const SummaryLabel = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SummaryValue = styled.p<{ accent?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ accent, theme }) => (accent ? theme.colors.primary : theme.colors.textPrimary)};
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
`;

const ScheduleSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  margin-bottom: 2px;
`;

const SectionSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TableScroll = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.lg};
`;

const CreateCta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.colors.primary} 5%, ${theme.colors.surface})`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const CtaCopy = styled.p`
  margin: 0;
  max-width: 40ch;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;
