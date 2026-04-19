import { gql } from '@apollo/client';

export const SIMULATE_LOAN = gql`
  query SimulateLoan($input: SimulateLoanInput!) {
    simulateLoan(input: $input) {
      principal
      startDate
      endDate
      totalExpectedInterest
      numberOfPayments
      firstPaymentDate
      repaymentSchedule {
        sequenceNumber
        paymentDate
        paymentType
        principal
        interest
        total
        remainingBalance
      }
    }
  }
`;

export const GET_LOANS = gql`
  query GetLoans($page: Int, $pageSize: Int) {
    loans(page: $page, pageSize: $pageSize) {
      loans {
        id
        name
        principal
        startDate
        endDate
        totalExpectedInterest
      }
      total
      page
      pageSize
    }
  }
`;

export const CREATE_LOAN = gql`
  mutation CreateLoan($input: CreateLoanInput!) {
    createLoan(input: $input) {
      id
      name
      principal
      startDate
      endDate
      totalExpectedInterest
    }
  }
`;
