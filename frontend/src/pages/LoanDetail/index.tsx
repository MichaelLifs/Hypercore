import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { ScheduleTable } from './ScheduleTable';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Loan detail page — data fetching wired up in Phase 3 via useQuery(GET_LOAN).
 */
export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Placeholder — replaced with useQuery(GET_LOAN, { variables: { id } }) in Phase 3
  const loan = null;
  const loading = false;

  if (loading) return <Container>Loading…</Container>;
  if (!loan) return <Container>Loan not found.</Container>;

  return (
    <Container>
      <BackBar>
        <Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>
          ← Back to Loans
        </Button>
      </BackBar>

      <LoanHeader>
        <div>
          <h1>{(loan as any).name}</h1>
          <Meta>
            <span>Principal: {formatCurrency((loan as any).principal)}</span>
            <Divider>·</Divider>
            <span>{formatDate((loan as any).startDate)} → {formatDate((loan as any).endDate)}</span>
            <Divider>·</Divider>
            <span>Total Interest: {formatCurrency((loan as any).totalExpectedInterest)}</span>
          </Meta>
        </div>
      </LoanHeader>

      <ScheduleTable entries={(loan as any).repaymentSchedule ?? []} />
    </Container>
  );
}

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const BackBar = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const LoanHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSize.xxl};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0 0 ${({ theme }) => theme.spacing.xs};
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-wrap: wrap;
`;

const Divider = styled.span`
  color: ${({ theme }) => theme.colors.border};
`;
