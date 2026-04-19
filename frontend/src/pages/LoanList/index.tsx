import React, { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { Pagination } from '../../components/Pagination';
import { LoanTable } from './LoanTable';
import { NewLoanModal } from './NewLoanModal';
import { GET_LOANS } from '../../graphql/operations/loans';
import type { LoanRow } from './LoanTable';

interface LoansQueryData {
  loans: {
    loans: LoanRow[];
    total: number;
    page: number;
    pageSize: number;
  };
}

const PAGE_SIZE = 20;

export function LoanListPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false);
  const apolloClient = useApolloClient();

  const { data, loading, error, refetch } = useQuery<LoansQueryData>(GET_LOANS, {
    variables: { page, pageSize: PAGE_SIZE },
  });

  const loans = data?.loans.loans ?? [];
  const total = data?.loans.total ?? 0;

  const handleCreated = () => {
    setModalOpen(false);
    setPage(1);
    refetch({ page: 1, pageSize: PAGE_SIZE });
    void apolloClient.refetchQueries({ include: ['GetPortfolioSummary', 'GetLoans'] });
  };

  return (
    <Container>
      <Toolbar>
        <div>
          <PageTitle>Loans</PageTitle>
          <PageSubtitle>Manage your loan portfolio and repayment schedules.</PageSubtitle>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ New Loan</Button>
      </Toolbar>

      <TableScroll>
        <LoanTable loans={loans} loading={loading} error={error} />
      </TableScroll>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

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
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
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

const TableScroll = styled.div`
  overflow-x: auto;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.radius.lg};
`;
