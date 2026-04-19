import React from 'react';
import styled from 'styled-components';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Label for the counted item, e.g. "loan" → "1–20 of 47 loans" */
  itemLabel?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = 'item',
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const plural = total !== 1 ? `${itemLabel}s` : itemLabel;

  return (
    <Container>
      <Info>
        {from}–{to} of {total} {plural}
      </Info>
      <Controls>
        <PagBtn onClick={() => onPageChange(1)} disabled={page === 1} title="First">
          «
        </PagBtn>
        <PagBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} title="Previous">
          ‹
        </PagBtn>

        {buildPageRange(page, totalPages).map((item, i) =>
          item === '…' ? (
            <PagEllipsis key={`ellipsis-${i}`}>…</PagEllipsis>
          ) : (
            <PagBtn
              key={item}
              $active={item === page}
              onClick={() => onPageChange(item as number)}
            >
              {item}
            </PagBtn>
          ),
        )}

        <PagBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          title="Next"
        >
          ›
        </PagBtn>
        <PagBtn
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last"
        >
          »
        </PagBtn>
      </Controls>
    </Container>
  );
}

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

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md} 0;
`;

const Info = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Controls = styled.div`
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

  &:hover:not(:disabled) {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.primaryDark : theme.colors.background};
    color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.textPrimary)};
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
