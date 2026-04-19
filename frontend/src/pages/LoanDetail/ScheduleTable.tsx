import React, { useState, useEffect } from 'react';
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
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function ScheduleTable({
  entries,
  variant = 'default',
  pageSize = DEFAULT_PAGE_SIZE,
}: ScheduleTableProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [entries]);

  if (entries.length === 0) {
    return <Empty>No repayment schedule found.</Empty>;
  }

  const isSimulation = variant === 'simulation';
  const totalPages = Math.ceil(entries.length / pageSize);
  const pageEntries = entries.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            {!isSimulation && <Th>#</Th>}
            <Th>Payment Date</Th>
            {!isSimulation && <Th>Type</Th>}
            <Th $numeric>Principal</Th>
            <Th $numeric>Interest</Th>
            <Th $numeric>Total</Th>
            <Th $numeric $role={isSimulation ? 'secondary' : 'default'}>
              {isSimulation ? 'Remaining Principal' : 'Remaining Balance'}
            </Th>
          </tr>
        </thead>
        <tbody>
          {pageEntries.map((entry) => (
            <tr key={entry.id ?? entry.sequenceNumber}>
              {!isSimulation && <Td $muted>{entry.sequenceNumber}</Td>}
              <Td>{formatDate(entry.paymentDate)}</Td>
              {!isSimulation && (
                <Td>
                  <Badge type={entry.paymentType}>
                    {entry.paymentType === 'INTEREST' ? 'Interest' : 'Principal + Interest'}
                  </Badge>
                </Td>
              )}
              <Td $numeric>{formatCurrency(entry.principal)}</Td>
              <Td $numeric>{formatCurrency(entry.interest)}</Td>
              <Td $numeric $bold>
                {formatCurrency(entry.total)}
              </Td>
              <Td $numeric $role={isSimulation ? 'secondary' : 'default'}>
                {formatCurrency(entry.remainingBalance)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <PaginationBar>
          <PagInfo>
            Rows {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, entries.length)} of{' '}
            {entries.length}
          </PagInfo>
          <PagControls>
            <PagBtn onClick={() => setPage(1)} disabled={page === 1} title="First">
              «
            </PagBtn>
            <PagBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1} title="Previous">
              ‹
            </PagBtn>

            {buildPageRange(page, totalPages).map((item, i) =>
              item === '…' ? (
                <PagEllipsis key={`ellipsis-${i}`}>…</PagEllipsis>
              ) : (
                <PagBtn
                  key={item}
                  $active={item === page}
                  onClick={() => setPage(item as number)}
                >
                  {item}
                </PagBtn>
              ),
            )}

            <PagBtn
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              title="Next"
            >
              ›
            </PagBtn>
            <PagBtn
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              title="Last"
            >
              »
            </PagBtn>
          </PagControls>
        </PaginationBar>
      )}
    </Wrapper>
  );
}

/** Builds a compact page-number list with ellipsis, e.g. 1 … 4 5 6 … 12 */
function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];

  if (current > 3) pages.push('…');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push('…');
  pages.push(total);

  return pages;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  direction: ltr;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  overflow: hidden;
`;

const Th = styled.th<{ $numeric?: boolean; $role?: 'default' | 'secondary' }>`
  padding: 13px ${({ theme }) => theme.spacing.md};
  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $role, theme }) =>
    $role === 'secondary' ? theme.colors.textMuted : theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  letter-spacing: 0.01em;
  ${({ $numeric }) => $numeric && 'font-variant-numeric: tabular-nums;'}
`;

const Td = styled.td<{
  $numeric?: boolean;
  $muted?: boolean;
  $bold?: boolean;
  $role?: 'default' | 'secondary';
}>`
  padding: 15px ${({ theme }) => theme.spacing.md};
  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ $bold, theme }) =>
    $bold ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.regular};
  color: ${({ $muted, $role, theme }) =>
    $role === 'secondary'
      ? theme.colors.textSecondary
      : $muted
        ? theme.colors.textMuted
        : theme.colors.textPrimary};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  ${({ $numeric }) =>
    $numeric &&
    `
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  `}
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

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} 0;
`;

const PagInfo = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PagControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const PagBtn = styled.button<{ $active?: boolean }>`
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1.5px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.textSecondary)};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover:not(:disabled):not([data-active='true']) {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const PagEllipsis = styled.span`
  min-width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;
