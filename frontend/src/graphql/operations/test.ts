import { gql } from '@apollo/client';

export const SEED_TEST_LOANS = gql`
  mutation SeedTestLoans($clearFirst: Boolean) {
    seedTestLoans(clearFirst: $clearFirst) {
      created
      skipped
      cleared
      createdLabels
    }
  }
`;

export const CLEAR_TEST_LOANS = gql`
  mutation ClearTestLoans {
    clearTestLoans
  }
`;

export const RUN_BACKEND_TESTS = gql`
  mutation RunBackendTests {
    runBackendTests {
      success
      numTotalTests
      numPassedTests
      numFailedTests
      numPendingTests
      numTotalTestSuites
      numFailedTestSuites
      durationMs
      failureMessages
      summary
      suites {
        suiteName
        passed
        numPassed
        numFailed
        tests {
          fullName
          status
          failureMessages
        }
      }
    }
  }
`;

export const RUN_FRONTEND_TESTS = gql`
  mutation RunFrontendTests {
    runFrontendTests {
      success
      numTotalTests
      numPassedTests
      numFailedTests
      durationMs
      summary
      failureMessages
      suites {
        suiteName
        passed
        numPassed
        numFailed
        tests {
          fullName
          status
          failureMessages
        }
      }
    }
  }
`;
