import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { Pagination } from '../../components/Pagination';
import { LoanTable, LoanRow } from './LoanTable';
import { NewLoanModal } from './NewLoanModal';
import { GET_LOANS } from '../../graphql/operations/loans';

const PAGE_SIZE = 20;

interface GetLoansData {
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

  const { data, loading, error, refetch } = useQuery<GetLoansData>(GET_LOANS, {
    variables: { page, pageSize: PAGE_SIZE },
  });

  const loans = data?.loans.loans ?? [];
  const total = data?.loans.total ?? 0;

  return (
    <Container>
      <Header>
        <h1>Loans</h1>
        <Button onClick={() => setModalOpen(true)}>+ New Loan</Button>
      </Header>

      <LoanTable loans={loans} loading={loading} error={error} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <NewLoanModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void refetch();
        }}
      />
    </Container>
  );
}

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSize.xxl};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
  }
`;
