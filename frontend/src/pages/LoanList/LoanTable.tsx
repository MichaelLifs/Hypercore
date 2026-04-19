import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { formatCurrency, formatDate } from '../../utils/formatters';

export type LoanSortField =
  | 'CREATED_AT'
  | 'NAME'
  | 'PRINCIPAL'
  | 'START_DATE'
  | 'END_DATE'
  | 'TOTAL_EXPECTED_INTEREST';
export type SortOrder = 'ASC' | 'DESC';

export interface LoanRow {
  id: string;
  name: string;
  principal: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  totalExpectedInterest: number;
}

interface LoanTableProps {
  loans: LoanRow[];
  loading: boolean;
  error?: Error;
  sortBy: LoanSortField;
  sortOrder: SortOrder;
  onSort: (field: LoanSortField) => void;
  emptyHint?: 'none' | 'filtered';
}

const SORT_LABEL: Record<LoanSortField, string> = {
  CREATED_AT: 'Created',
  NAME: 'Loan Name',
  PRINCIPAL: 'Principal',
  START_DATE: 'Start Date',
  END_DATE: 'End Date',
  TOTAL_EXPECTED_INTEREST: 'Total Interest',
};

export function LoanTable({
  loans,
  loading,
  error,
  sortBy,
  sortOrder,
  onSort,
  emptyHint = 'none',
}: LoanTableProps) {
  const navigate = useNavigate();

  if (loading) return <Empty>Loading loans…</Empty>;
  if (error) return <Empty>Failed to load loans. Is the backend running?</Empty>;
  if (loans.length === 0) {
    return (
      <Empty>
        {emptyHint === 'filtered'
          ? 'No loans match your filters. Try adjusting or clearing filters.'
          : 'No loans yet. Create your first loan.'}
      </Empty>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <SortTh $active={sortBy === 'NAME'} $order={sortOrder} onClick={() => onSort('NAME')}>
            {SORT_LABEL.NAME}
          </SortTh>
          <SortTh $numeric $active={sortBy === 'PRINCIPAL'} $order={sortOrder} onClick={() => onSort('PRINCIPAL')}>
            {SORT_LABEL.PRINCIPAL}
          </SortTh>
          <SortTh $active={sortBy === 'START_DATE'} $order={sortOrder} onClick={() => onSort('START_DATE')}>
            {SORT_LABEL.START_DATE}
          </SortTh>
          <SortTh $active={sortBy === 'END_DATE'} $order={sortOrder} onClick={() => onSort('END_DATE')}>
            {SORT_LABEL.END_DATE}
          </SortTh>
          <SortTh $numeric $active={sortBy === 'TOTAL_EXPECTED_INTEREST'} $order={sortOrder} onClick={() => onSort('TOTAL_EXPECTED_INTEREST')}>
            {SORT_LABEL.TOTAL_EXPECTED_INTEREST}
          </SortTh>
          <SortTh
            $meta
            $active={sortBy === 'CREATED_AT'}
            $order={sortOrder}
            onClick={() => onSort('CREATED_AT')}
          >
            {SORT_LABEL.CREATED_AT}
          </SortTh>
        </tr>
      </thead>
      <tbody>
        {loans.map((loan) => (
          <Row key={loan.id} onClick={() => navigate(`/loan/${loan.id}`)}>
            <Td>{loan.name}</Td>
            <TdNumeric>{formatCurrency(loan.principal)}</TdNumeric>
            <Td>{formatDate(loan.startDate)}</Td>
            <Td>{formatDate(loan.endDate)}</Td>
            <TdInterest>{formatCurrency(loan.totalExpectedInterest)}</TdInterest>
            <TdCreated>{formatDate(loan.createdAt.slice(0, 10))}</TdCreated>
          </Row>
        ))}
      </tbody>
    </Table>
  );
}

/* ─── Table shell ─── */

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  direction: ltr;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  overflow: hidden;
`;

/* ─── Headers ─── */

const Th = styled.th<{ $numeric?: boolean }>`
  padding: 14px ${({ theme }) => theme.spacing.md};
  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  letter-spacing: 0.01em;
  ${({ $numeric }) => $numeric && 'font-variant-numeric: tabular-nums;'}
`;

const SortTh = styled(Th)<{ $active?: boolean; $order?: SortOrder; $meta?: boolean }>`
  cursor: pointer;
  user-select: none;
  color: ${({ theme, $active, $meta }) =>
    $active ? theme.colors.primary : $meta ? theme.colors.textMuted : theme.colors.textSecondary};
  font-weight: ${({ theme, $active, $meta }) =>
    $meta && !$active ? theme.typography.fontWeight.medium : theme.typography.fontWeight.semibold};
  transition: background 0.12s ease, color 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }

  &::after {
    display: inline-block;
    margin-left: 4px;
    font-size: 10px;
    line-height: 1;
    opacity: ${({ $active }) => ($active ? 1 : 0.3)};
    transition: opacity 0.1s ease;
    content: ${({ $active, $order }) =>
      $active ? ($order === 'ASC' ? '"\u2191"' : '"\u2193"') : '"\u2195"'};
  }

  &:hover::after {
    opacity: 1;
  }
`;

/* ─── Rows ─── */

const Row = styled.tr`
  cursor: pointer;
  transition: background 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:hover td:first-child {
    box-shadow: inset 3px 0 0 0 ${({ theme }) => theme.colors.primary};
  }

  &:active {
    background: ${({ theme }) => theme.colors.primaryLight};
  }

  & + & td {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

/* ─── Cells ─── */

const Td = styled.td`
  padding: 17px ${({ theme }) => theme.spacing.md};
  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.textPrimary};
  transition: box-shadow 0.15s ease;
`;

/* Money / numeric: same alignment as other columns; tabular figures for digits */
const TdNumeric = styled(Td)`
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  letter-spacing: -0.01em;
`;

/* Total Interest: further emphasized */
const TdInterest = styled(TdNumeric)`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

/* Created: secondary metadata (lighter than body text, still readable) */
const TdCreated = styled(Td)`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  opacity: 0.92;
`;

const Empty = styled.p`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;
