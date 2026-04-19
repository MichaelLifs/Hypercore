import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { Pagination } from '../../components/Pagination';
import { LoanTable } from './LoanTable';
import { NewLoanModal } from './NewLoanModal';

export function LoanListPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <Container>
      <Header>
        <h1>Loans</h1>
        <Button onClick={() => setModalOpen(true)}>+ New Loan</Button>
      </Header>

      <LoanTable page={page} />

      {/* Pagination — wired up in Phase 3 with real data */}
      <Pagination page={page} pageSize={20} total={0} onPageChange={setPage} />

      <NewLoanModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => setModalOpen(false)}
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
