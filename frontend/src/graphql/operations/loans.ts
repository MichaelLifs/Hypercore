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
      rateSegments {
        effectiveFrom
        effectiveTo
        annualRate
      }
    }
  }
`;

export const GET_LOANS = gql`
  query GetLoans(
    $page: Int
    $pageSize: Int
    $filter: LoanListFilterInput
    $sortBy: LoanSortField
    $sortOrder: SortOrder
  ) {
    loans(page: $page, pageSize: $pageSize, filter: $filter, sortBy: $sortBy, sortOrder: $sortOrder) {
      loans {
        id
        name
        principal
        startDate
        endDate
        createdAt
        totalExpectedInterest
        nonWorkDayPolicy
      }
      total
      page
      pageSize
    }
  }
`;

export const GET_PORTFOLIO_SUMMARY = gql`
  query GetPortfolioSummary {
    portfolioSummary {
      totalLoans
      totalPrincipal
      totalExpectedInterest
      activeLoans
      monthlyInterestTimeline {
        month
        interest
      }
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
      nonWorkDayPolicy
    }
  }
`;

export const DELETE_LOAN = gql`
  mutation DeleteLoan($id: ID!) {
    deleteLoan(id: $id)
  }
`;
