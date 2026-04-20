import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
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
  onDeleteLoan?: (id: string) => Promise<void>;
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

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M6 1a.5.5 0 0 0-.5.5V2H3a.5.5 0 0 0 0 1h.5v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V3H13a.5.5 0 0 0 0-1h-2.5v-.5A.5.5 0 0 0 10 1H6zm1 4a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6A.5.5 0 0 1 7 5zm2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6A.5.5 0 0 1 9 5z" />
    </svg>
  );
}

export function LoanTable({
  loans,
  loading,
  error,
  sortBy,
  sortOrder,
  onSort,
  onDeleteLoan,
  emptyHint = 'none',
}: LoanTableProps) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pendingLoan = loans.find((loan) => loan.id === pendingDeleteId) ?? null;

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const handleKebabClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeletingId(id);
    setOpenMenuId(null);
    setPendingDeleteId(null);
    try {
      await onDeleteLoan?.(id);
    } finally {
      setDeletingId(null);
    }
  };

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
    <>
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
          <ThActions aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {loans.map((loan) => (
          <Row
            key={loan.id}
            onClick={() => navigate(`/loan/${loan.id}`)}
            $deleting={deletingId === loan.id}
          >
            <Td>{loan.name}</Td>
            <TdNumeric>{formatCurrency(loan.principal)}</TdNumeric>
            <Td>{formatDate(loan.startDate)}</Td>
            <Td>{formatDate(loan.endDate)}</Td>
            <TdInterest>{formatCurrency(loan.totalExpectedInterest)}</TdInterest>
            <TdCreated>{formatDate(loan.createdAt.slice(0, 10))}</TdCreated>

            <TdActions onClick={(e) => e.stopPropagation()}>
              <KebabButton
                type="button"
                aria-label="Row actions"
                $isOpen={openMenuId === loan.id}
                onClick={(e) => handleKebabClick(e, loan.id)}
                disabled={deletingId === loan.id}
              >
                <KebabIcon />
              </KebabButton>

              {openMenuId === loan.id && (
                <DropdownMenu ref={menuRef} onMouseDown={(e) => e.stopPropagation()}>
                  <DropdownItem
                    $destructive
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setPendingDeleteId(loan.id);
                    }}
                  >
                    <TrashIcon />
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              )}
            </TdActions>
          </Row>
        ))}
      </tbody>
      </Table>
      <Modal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title={pendingLoan ? `Delete "${pendingLoan.name}"?` : 'Delete loan?'}
      >
        <ConfirmLead>You are about to permanently delete this loan.</ConfirmLead>
        {pendingLoan && (
          <LoanPreviewCard>
            <LoanName>{pendingLoan.name}</LoanName>
            <LoanMetaLine>
              {formatCurrency(pendingLoan.principal)} · {formatDate(pendingLoan.startDate)} -{' '}
              {formatDate(pendingLoan.endDate)}
            </LoanMetaLine>
          </LoanPreviewCard>
        )}
        <WarningHint role="note">
          <WarningIcon
            aria-hidden="true"
            title="This action cannot be undone."
          />
          <span>Cannot be undone</span>
        </WarningHint>
        <ModalActions>
          <Button
            type="button"
            $variant="ghost"
            onClick={() => setPendingDeleteId(null)}
            $size="sm"
          >
            Cancel
          </Button>
          <DangerButton
            type="button"
            onClick={handleConfirmDelete}
            $size="sm"
            disabled={deletingId !== null}
          >
            {deletingId !== null ? 'Deleting...' : 'Delete'}
          </DangerButton>
        </ModalActions>
      </Modal>
    </>
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

const ThActions = styled(Th)`
  width: 48px;
  min-width: 48px;
  padding: 14px 8px;
`;

/* ─── Rows ─── */

const Row = styled.tr<{ $deleting?: boolean }>`
  cursor: pointer;
  transition: background 0.18s ease, opacity 0.18s ease;
  opacity: ${({ $deleting }) => ($deleting ? 0.4 : 1)};
  pointer-events: ${({ $deleting }) => ($deleting ? 'none' : 'auto')};

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

const TdNumeric = styled(Td)`
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  letter-spacing: -0.01em;
`;

const TdInterest = styled(TdNumeric)`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const TdCreated = styled(Td)`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  opacity: 0.92;
`;

const TdActions = styled.td`
  padding: 0 8px;
  width: 48px;
  min-width: 48px;
  text-align: center;
  vertical-align: middle;
  position: relative;
`;

/* ─── Kebab button ─── */

const KebabButton = styled.button<{ $isOpen?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 auto;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $isOpen }) => ($isOpen ? theme.colors.primaryLight : 'transparent')};
  color: ${({ theme, $isOpen }) => ($isOpen ? theme.colors.primary : theme.colors.textMuted)};
  cursor: pointer;
  opacity: 0;
  transition: background 0.12s ease, color 0.12s ease, opacity 0.12s ease;

  tr:hover & {
    opacity: 1;
  }

  ${({ $isOpen }) => $isOpen && 'opacity: 1 !important;'}

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
    opacity: 1;
  }

  &:disabled {
    cursor: default;
    opacity: 0.3 !important;
  }
`;

/* ─── Dropdown menu ─── */

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% - 2px);
  right: 4px;
  z-index: 100;
  min-width: 160px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  overflow: hidden;
`;

const DropdownItem = styled.button<{ $destructive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  border: none;
  background: transparent;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $destructive }) => ($destructive ? theme.colors.error : theme.colors.textPrimary)};
  cursor: pointer;
  text-align: left;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ theme, $destructive }) =>
      $destructive ? 'rgba(222, 53, 11, 0.08)' : theme.colors.background};
  }
`;

const ConfirmLead = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const LoanPreviewCard = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.background};
`;

const LoanName = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const LoanMetaLine = styled.p`
  margin: 4px 0 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
`;

const WarningHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: help;
`;

const WarningIcon = styled.span`
  width: 14px;
  height: 14px;
  display: inline-block;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid currentColor;
  position: relative;

  &::before {
    content: '!';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    line-height: 1;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const DangerButton = styled(Button)`
  background: ${({ theme }) => theme.colors.error};
  border-color: transparent;
  color: #fff;

  &:hover:not(:disabled) {
    opacity: 0.9;
    background: ${({ theme }) => theme.colors.error};
  }
`;

const Empty = styled.p`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;
