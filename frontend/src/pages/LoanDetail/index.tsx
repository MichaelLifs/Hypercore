import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { ScheduleTable, RepaymentEntry } from './ScheduleTable';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { GET_LOAN } from '../../graphql/operations/loan';

interface LoanDetail {
  id: string;
  name: string;
  principal: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  totalExpectedInterest: number;
  repaymentSchedule: RepaymentEntry[];
}

interface GetLoanData {
  loan: LoanDetail | null;
}

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery<GetLoanData>(GET_LOAN, {
    variables: { id },
    skip: !id,
  });

  const loan = data?.loan ?? null;

  if (loading) return <Container><StatusMessage>Loading…</StatusMessage></Container>;
  if (error) return <Container><StatusMessage>Failed to load loan. Is the backend running?</StatusMessage></Container>;
  if (!loan) return <Container><StatusMessage>Loan not found.</StatusMessage></Container>;

  return (
    <Container>
      <BackBar>
        <Button $variant="ghost" $size="sm" onClick={() => navigate('/loans')}>
          ← Back to Loans
        </Button>
      </BackBar>

      <LoanHeader>
        <div>
          <h1>{loan.name}</h1>
          <Meta>
            <span>Principal: {formatCurrency(loan.principal)}</span>
            <Divider>·</Divider>
            <span>
              {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
            </span>
            <Divider>·</Divider>
            <span>Total Interest: {formatCurrency(loan.totalExpectedInterest)}</span>
          </Meta>
        </div>
      </LoanHeader>

      <TableScroll>
        <ScheduleTable entries={loan.repaymentSchedule} />
      </TableScroll>
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

const TableScroll = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.lg};
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

const StatusMessage = styled.p`
  padding: ${({ theme }) => theme.spacing.xxl} 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;
