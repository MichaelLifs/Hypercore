import { gql } from '@apollo/client';

export const GET_LOAN = gql`
  query GetLoan($id: ID!) {
    loan(id: $id) {
      id
      name
      principal
      startDate
      endDate
      createdAt
      totalExpectedInterest
      repaymentSchedule {
        id
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
