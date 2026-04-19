import React from 'react';
import styled from 'styled-components';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface RepaymentEntry {
  id?: string;
  sequenceNumber: number;
  paymentDate: string;
  paymentType: 'INTEREST' | 'PRINCIPAL_AND_INTEREST';
  principal: number;
  interest: number;
  total: number;
  remainingBalance: number;
}

interface ScheduleTableProps {
  entries: RepaymentEntry[];
  /** Simulation view: fewer columns, remaining principal de-emphasized */
  variant?: 'default' | 'simulation';
}

export function ScheduleTable({ entries, variant = 'default' }: ScheduleTableProps) {
  if (entries.length === 0) {
    return <Empty>No repayment schedule found.</Empty>;
  }

  const isSimulation = variant === 'simulation';

  return (
    <Table>
      <thead>
        <tr>
          {!isSimulation && <Th>#</Th>}
          <Th>Payment Date</Th>
          {!isSimulation && <Th>Type</Th>}
          <Th align="right">Principal</Th>
          <Th align="right">Interest</Th>
          <Th align="right">Total</Th>
          <Th align="right" $role={isSimulation ? 'secondary' : 'default'}>
            {isSimulation ? 'Remaining Principal' : 'Remaining Balance'}
          </Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id ?? entry.sequenceNumber}>
            {!isSimulation && <Td muted>{entry.sequenceNumber}</Td>}
            <Td>{formatDate(entry.paymentDate)}</Td>
            {!isSimulation && (
              <Td>
                <Badge type={entry.paymentType}>
                  {entry.paymentType === 'INTEREST' ? 'Interest' : 'Principal + Interest'}
                </Badge>
              </Td>
            )}
            <Td align="right">{formatCurrency(entry.principal)}</Td>
            <Td align="right">{formatCurrency(entry.interest)}</Td>
            <Td align="right" bold>
              {formatCurrency(entry.total)}
            </Td>
            <Td align="right" $role={isSimulation ? 'secondary' : 'default'}>
              {formatCurrency(entry.remainingBalance)}
            </Td>
          </tr>
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

const Th = styled.th<{ align?: string; $role?: 'default' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: ${({ align }) => align ?? 'left'};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $role, theme }) =>
    $role === 'secondary' ? theme.colors.textMuted : theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td<{
  align?: string;
  muted?: boolean;
  bold?: boolean;
  $role?: 'default' | 'secondary';
}>`
  padding: 12px ${({ theme }) => theme.spacing.md};
  text-align: ${({ align }) => align ?? 'left'};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ bold, theme }) =>
    bold ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.regular};
  color: ${({ muted, $role, theme }) =>
    $role === 'secondary'
      ? theme.colors.textSecondary
      : muted
        ? theme.colors.textMuted
        : theme.colors.textPrimary};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Badge = styled.span<{ type: 'INTEREST' | 'PRINCIPAL_AND_INTEREST' }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ type, theme }) =>
    type === 'INTEREST' ? theme.colors.primaryLight : theme.colors.successMuted};
  color: ${({ type, theme }) =>
    type === 'INTEREST' ? theme.colors.primary : theme.colors.success};
`;

const Empty = styled.p`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
`;
