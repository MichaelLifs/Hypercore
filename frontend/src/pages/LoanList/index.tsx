import React, { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { Pagination } from '../../components/Pagination';
import { LoanTable } from './LoanTable';
import type { LoanSortField, SortOrder } from './LoanTable';
import type { LoanRow } from './LoanTable';
import { NewLoanModal } from './NewLoanModal';
import { GET_LOANS } from '../../graphql/operations/loans';
import {
  LoanListFilters,
  defaultLoanListFilterValues,
  type LoanListFilterValues,
} from './LoanListFilters';

const PAGE_SIZE = 20;

const DEFAULT_SORT_ORDER: Record<LoanSortField, SortOrder> = {
  CREATED_AT: 'DESC',
  NAME: 'ASC',
  PRINCIPAL: 'DESC',
  START_DATE: 'DESC',
  END_DATE: 'DESC',
  TOTAL_EXPECTED_INTEREST: 'DESC',
};

function parseOptionalNumber(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function buildFilterInput(
  values: LoanListFilterValues,
  searchApplied: string,
): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = {};
  const q = searchApplied.trim();
  if (q) next.search = q;
  if (values.startDateFrom) next.startDateFrom = values.startDateFrom;
  if (values.startDateTo) next.startDateTo = values.startDateTo;
  const pmin = parseOptionalNumber(values.principalMin);
  const pmax = parseOptionalNumber(values.principalMax);
  const imin = parseOptionalNumber(values.interestMin);
  const imax = parseOptionalNumber(values.interestMax);
  if (pmin !== undefined) next.principalMin = pmin;
  if (pmax !== undefined) next.principalMax = pmax;
  if (imin !== undefined) next.interestMin = imin;
  if (imax !== undefined) next.interestMax = imax;
  return Object.keys(next).length > 0 ? next : undefined;
}

function hasActiveFilterState(values: LoanListFilterValues, searchApplied: string): boolean {
  return buildFilterInput(values, searchApplied) != null;
}

interface LoansQueryData {
  loans: {
    loans: LoanRow[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export function LoanListPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false);
  const [filterValues, setFilterValues] = useState(defaultLoanListFilterValues);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<LoanSortField>('CREATED_AT');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const apolloClient = useApolloClient();

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(filterValues.search.trim()), 400);
    return () => window.clearTimeout(id);
  }, [filterValues.search]);

  const filter = useMemo(
    () => buildFilterInput(filterValues, debouncedSearch),
    [filterValues, debouncedSearch],
  );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filterValues.startDateFrom,
    filterValues.startDateTo,
    filterValues.principalMin,
    filterValues.principalMax,
    filterValues.interestMin,
    filterValues.interestMax,
    sortBy,
    sortOrder,
  ]);

  const { data, loading, error, refetch } = useQuery<LoansQueryData>(GET_LOANS, {
    variables: {
      page,
      pageSize: PAGE_SIZE,
      filter: filter ?? null,
      sortBy,
      sortOrder,
    },
    notifyOnNetworkStatusChange: true,
  });

  const loans = data?.loans.loans ?? [];
  const total = data?.loans.total ?? 0;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [total, page]);

  const handleSort = (field: LoanSortField) => {
    if (field === sortBy) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder(DEFAULT_SORT_ORDER[field]);
    }
  };

  const handleClearFilters = () => {
    setFilterValues(defaultLoanListFilterValues());
    setDebouncedSearch('');
  };

  const handleCreated = () => {
    setModalOpen(false);
    setPage(1);
    void refetch({
      page: 1,
      pageSize: PAGE_SIZE,
      filter: buildFilterInput(filterValues, debouncedSearch) ?? null,
      sortBy,
      sortOrder,
    });
    void apolloClient.refetchQueries({ include: ['GetPortfolioSummary', 'GetLoans'] });
  };

  const filtersActive = hasActiveFilterState(filterValues, debouncedSearch);

  return (
    <Container>
      <Toolbar>
        <div>
          <PageTitle>Loans</PageTitle>
          <PageSubtitle>Manage your loan portfolio and repayment schedules.</PageSubtitle>
        </div>
        <NewLoanButton onClick={() => setModalOpen(true)}>+ New Loan</NewLoanButton>
      </Toolbar>

      <LoanListFilters
        values={filterValues}
        onChange={setFilterValues}
        onClear={handleClearFilters}
        hasActiveFilters={filtersActive}
      />

      <TableScroll>
        <LoanTable
          loans={loans}
          loading={loading}
          error={error}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          emptyHint={filtersActive ? 'filtered' : 'none'}
        />
      </TableScroll>

      {total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} itemLabel="loan" />
      )}

      <NewLoanModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
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

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 4px;
  letter-spacing: -0.02em;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const NewLoanButton = styled(Button)`
  padding: 10px 22px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  box-shadow: ${({ theme }) => theme.shadow.sm};

  &:hover:not(:disabled) {
    box-shadow: ${({ theme }) => theme.shadow.md};
  }
`;

const TableScroll = styled.div`
  overflow-x: auto;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.radius.lg};
`;
