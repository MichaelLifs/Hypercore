import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface LoanRow {
  id: string;
  name: string;
  principal: number;
  startDate: string;
  totalExpectedInterest: number;
}

interface LoanTableProps {
  loans: LoanRow[];
  loading: boolean;
  error?: Error;
}

export function LoanTable({ loans, loading, error }: LoanTableProps) {
  const navigate = useNavigate();

  if (loading) return <Empty>Loading loans…</Empty>;
  if (error) return <Empty>Failed to load loans. Is the backend running?</Empty>;
  if (loans.length === 0) return <Empty>No loans yet. Create your first loan.</Empty>;

  return (
    <Table>
      <thead>
        <tr>
          <Th>Loan Name</Th>
          <Th align="right">Principal</Th>
          <Th>Start Date</Th>
          <Th align="right">Total Interest</Th>
        </tr>
      </thead>
      <tbody>
        {loans.map((loan) => (
          <Row key={loan.id} onClick={() => navigate(`/loan/${loan.id}`)}>
            <Td>{loan.name}</Td>
            <Td align="right">{formatCurrency(loan.principal)}</Td>
            <Td>{formatDate(loan.startDate)}</Td>
            <Td align="right">{formatCurrency(loan.totalExpectedInterest)}</Td>
          </Row>
        ))}
      </tbody>
    </Table>
  );
}

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  overflow: hidden;
`;

const Th = styled.th<{ align?: string }>`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: ${({ align }) => align ?? 'left'};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Row = styled.tr`
  cursor: pointer;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
  }

  & + & td {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const Td = styled.td<{ align?: string }>`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: ${({ align }) => align ?? 'left'};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Empty = styled.p`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;
