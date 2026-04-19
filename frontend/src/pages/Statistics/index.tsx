import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { GET_LOANS, GET_PORTFOLIO_SUMMARY } from '../../graphql/operations/loans';
import { formatCurrency, formatDate } from '../../utils/formatters';

const RECENT_LIMIT = 5;

interface PortfolioSummaryData {
  portfolioSummary: {
    totalLoans: number;
    totalPrincipal: number;
    totalExpectedInterest: number;
    nextMaturity: { id: string; name: string; endDate: string } | null;
  };
}

interface RecentLoan {
  id: string;
  name: string;
  principal: number;
  startDate: string;
  endDate: string;
  totalExpectedInterest: number;
}

interface GetLoansData {
  loans: {
    loans: RecentLoan[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export function StatisticsPage() {
  const navigate = useNavigate();

  const { data: summaryData, loading: summaryLoading } = useQuery<PortfolioSummaryData>(
    GET_PORTFOLIO_SUMMARY,
    { fetchPolicy: 'cache-and-network' },
  );

  const {
    data: loansData,
    loading: loansLoading,
    error: loansError,
    refetch: refetchLoans,
  } = useQuery<GetLoansData>(GET_LOANS, {
    variables: { page: 1, pageSize: RECENT_LIMIT },
    fetchPolicy: 'cache-and-network',
  });

  const summary = summaryData?.portfolioSummary ?? null;

  const stats = useMemo(
    () => [
      {
        id: 'total-loans',
        label: 'Total Loans',
        value: summary === null ? '-' : summary.totalLoans.toLocaleString(),
        hint: 'Active portfolio',
      },
      {
        id: 'total-principal',
        label: 'Total Principal',
        value: summary === null ? '-' : formatCurrency(summary.totalPrincipal),
        hint: 'Outstanding across all loans',
      },
      {
        id: 'expected-interest',
        label: 'Expected Interest',
        value: summary === null ? '-' : formatCurrency(summary.totalExpectedInterest),
        hint: 'Accrued over loan terms',
      },
      {
        id: 'next-maturity',
        label: 'Next Maturity',
        value: summary?.nextMaturity ? formatDate(summary.nextMaturity.endDate) : '-',
        hint: summary?.nextMaturity ? summary.nextMaturity.name : 'No upcoming payments',
      },
    ],
    [summary],
  );

  const showStatPlaceholders = summaryLoading && !summaryData;
  const loans = loansData?.loans.loans ?? [];
  const recent = loans.slice(0, RECENT_LIMIT);
  const hasLoans = loans.length > 0;
  const loansBlockLoading = loansLoading && !loansData;

  return (
    <Container>
      <PageHeader>
        <div>
          <PageTitle>Statistics</PageTitle>
          <PageSubtitle>Portfolio snapshot and recent loan activity.</PageSubtitle>
        </div>
      </PageHeader>

      <Section>
        <SectionEyebrow>Portfolio snapshot</SectionEyebrow>
        <SectionHeading>Your current position.</SectionHeading>
        <StatsGrid>
          {stats.map((stat) => (
            <StatCard key={stat.id}>
              <StatLabel>{stat.label}</StatLabel>
              <StatValue>{showStatPlaceholders ? <Shimmer /> : stat.value}</StatValue>
              <StatHint>{stat.hint}</StatHint>
            </StatCard>
          ))}
        </StatsGrid>
      </Section>

      <RecentSection>
        <RecentHeader>
          <div>
            <RecentTitle>Recent Loans</RecentTitle>
            <RecentSubtitle>Latest activity in your portfolio</RecentSubtitle>
          </div>
          {hasLoans && (
            <Button $variant="ghost" $size="sm" onClick={() => navigate('/loans')}>
              View all →
            </Button>
          )}
        </RecentHeader>

        {loansBlockLoading ? (
          <LoadingState>Loading loans…</LoadingState>
        ) : loansError ? (
          <ErrorState>
            <ErrorTitle>Couldn’t load loans</ErrorTitle>
            <ErrorDescription>
              The backend didn’t respond. Check your connection and try again.
            </ErrorDescription>
            <Button $variant="secondary" $size="sm" onClick={() => void refetchLoans()}>
              Retry
            </Button>
          </ErrorState>
        ) : hasLoans ? (
          <RecentList>
            {recent.map((loan) => (
              <RecentRow key={loan.id} type="button" onClick={() => navigate(`/loan/${loan.id}`)}>
                <RecentPrimary>
                  <RecentName>{loan.name}</RecentName>
                  <RecentMeta>
                    {formatDate(loan.startDate)} → {formatDate(loan.endDate)}
                  </RecentMeta>
                </RecentPrimary>
                <RecentNumbers>
                  <RecentAmount>{formatCurrency(loan.principal)}</RecentAmount>
                  <RecentInterest>
                    + {formatCurrency(loan.totalExpectedInterest)} interest
                  </RecentInterest>
                </RecentNumbers>
              </RecentRow>
            ))}
          </RecentList>
        ) : (
          <EmptyState>
            <EmptyIconWrap aria-hidden="true">
              <DocumentIcon />
            </EmptyIconWrap>
            <EmptyTitle>No loans yet</EmptyTitle>
            <EmptyDescription>
              Create your first bullet loan to generate a repayment schedule and start tracking
              principal and interest.
            </EmptyDescription>
            <Button onClick={() => navigate('/loans')}>Go to Loans</Button>
          </EmptyState>
        )}
      </RecentSection>
    </Container>
  );
}

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
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionEyebrow = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SectionHeading = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 108px;
`;

const StatLabel = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const StatValue = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  min-height: 28px;
  display: flex;
  align-items: center;
  margin: 0;
`;

const Shimmer = styled.span`
  display: inline-block;
  width: 60%;
  height: 18px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.background} 0%,
    ${({ theme }) => theme.colors.border} 50%,
    ${({ theme }) => theme.colors.background} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
`;

const StatHint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
`;

const RecentSection = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  overflow: hidden;
`;

const RecentHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const RecentTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 2px;
`;

const RecentSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
`;

const RecentRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
  font-family: inherit;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing.xs};
  }
`;

const RecentPrimary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const RecentName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecentMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const RecentNumbers = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    align-items: flex-start;
  }
`;

const RecentAmount = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-variant-numeric: tabular-nums;
`;

const RecentInterest = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  gap: ${({ theme }) => theme.spacing.xs};
`;

const EmptyIconWrap = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const EmptyTitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 360px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const LoadingState = styled.div`
  padding: ${({ theme }) => theme.spacing.xxl};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ErrorTitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const ErrorDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 360px;
  margin: 0;
`;

function DocumentIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="7" y="5" width="26" height="30" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <line x1="13" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="13" y1="20" x2="27" y2="20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="13" y1="26" x2="21" y2="26" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
