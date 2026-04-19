import { gql } from '@apollo/client';

export const GET_LOANS = gql`
  query GetLoans($page: Int, $pageSize: Int) {
    loans(page: $page, pageSize: $pageSize) {
      loans {
        id
        name
        principal
        startDate
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
