# Bullet Loan Platform

A full-stack web application for managing bullet loans and their repayment schedules.

**Stack:** React · Apollo Client · Styled Components · Node.js · Apollo Server · TypeORM · SQLite

---

## Prerequisites

- Node.js 20+
- npm 10+

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd bullet-loan-manager
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
npm install
```

The `.env` file contains two variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port the GraphQL server listens on |
| `DB_PATH` | `./data/loans.db` | Path to the SQLite database file |

The `data/` directory and SQLite database are created automatically on first run via TypeORM `synchronize: true`.

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
```

The `.env` file contains one variable:

| Variable | Default | Description |
|---|---|---|
| `VITE_GRAPHQL_URL` | `http://localhost:4000/graphql` | Backend GraphQL endpoint |

---

## Running the application

Open two terminals.

**Terminal 1: Backend:**

```bash
cd backend
npm run dev
```

Server starts at `http://localhost:4000/graphql`.

**Terminal 2: Frontend:**

```bash
cd frontend
npm run dev
```

App opens at `http://localhost:3000`.

---

## Database

The database schema is managed by TypeORM with `synchronize: true`, which means:

- On first run, TypeORM automatically creates all tables.
- On subsequent runs with schema changes, TypeORM applies the diff.
- The SQLite file is written to `backend/data/loans.db` by default.

> **Note:** `synchronize: true` is appropriate for development and this assignment. For production, replace it with TypeORM migrations.

---

## Running tests

```bash
cd backend
npm test
```

Tests live in `backend/src/__tests__/`. The test suite covers:

- `dayCount30360.test.ts`: 30E/360 ISDA day count function, edge cases
- `ScheduleGenerator.test.ts`: repayment schedule generation scenarios
- `PrimeRateFetcher.test.ts`: FRED CSV parsing and segment building
- `LoanService.test.ts`: rate segment filtering for a loan period
- `createLoanInput.test.ts`: input validation for loan creation

---

## Production build

```bash
# Backend
cd backend && npm run build
node dist/index.js

# Frontend
cd frontend && npm run build
# Serve the dist/ folder with any static file server
```

---

## GraphQL API

The GraphQL playground is available at `http://localhost:4000/graphql`.

### Queries

**List loans (paginated):**
```graphql
query {
  loans(page: 1, pageSize: 20) {
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
```

**Fetch a loan with repayment schedule:**
```graphql
query {
  loan(id: "uuid-here") {
    id
    name
    principal
    startDate
    endDate
    totalExpectedInterest
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
```

### Mutations

**Create a loan:**
```graphql
mutation {
  createLoan(input: {
    name: "Acme Bridge Loan"
    principal: 1000000
    startDate: "2024-01-15"
    endDate: "2026-01-15"
  }) {
    id
    totalExpectedInterest
    repaymentSchedule {
      paymentDate
      paymentType
      total
    }
  }
}
```

---

## Project Structure

```
bullet-loan-manager/
├── backend/
│   └── src/
│       ├── __tests__/
│       │   ├── dayCount30360.test.ts
│       │   ├── ScheduleGenerator.test.ts
│       │   ├── PrimeRateFetcher.test.ts
│       │   ├── LoanService.test.ts
│       │   └── createLoanInput.test.ts
│       ├── database/
│       │   └── dataSource.ts            # TypeORM DataSource (SQLite)
│       ├── domain/
│       │   ├── loan/
│       │   │   ├── Loan.entity.ts
│       │   │   └── LoanService.ts       # createLoan orchestration
│       │   ├── prime-rate/
│       │   │   ├── LoanRateSegment.entity.ts
│       │   │   └── PrimeRateFetcher.ts  # FRED CSV fetch + parse
│       │   └── repayment/
│       │       ├── RepaymentEntry.entity.ts
│       │       ├── ScheduleGenerator.ts # pure domain logic
│       │       ├── dayCount30360.ts     # 30E/360 ISDA day count
│       │       ├── repayment.types.ts
│       │       └── paymentTypes.ts
│       ├── graphql/
│       │   ├── schema.graphql
│       │   └── resolvers/loan.resolver.ts
│       ├── utils/
│       │   └── math.ts
│       └── index.ts
└── frontend/
    └── src/
        ├── apollo/
        │   └── client.ts
        ├── components/
        │   ├── Button.tsx
        │   ├── Modal.tsx
        │   └── Pagination.tsx
        ├── graphql/operations/
        │   ├── loans.ts
        │   └── loan.ts
        ├── pages/
        │   ├── LoanList/
        │   │   ├── index.tsx
        │   │   ├── LoanTable.tsx
        │   │   └── NewLoanModal.tsx
        │   └── LoanDetail/
        │       ├── index.tsx
        │       └── ScheduleTable.tsx
        ├── styles/
        │   ├── GlobalStyles.tsx
        │   └── theme.ts
        ├── types/
        │   └── styled.d.ts
        └── utils/
            └── formatters.ts
```
