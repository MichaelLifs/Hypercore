# Bullet Loan Manager

## Overview

A full-stack application for modeling and managing bullet loans: fixed-term loans where the principal is repaid in a single payment at maturity, with periodic interest-only coupons in between.

Interest is computed against real U.S. prime rate history (FRED), with the rate schedule snapshotted onto each loan at creation so that schedules are fully deterministic and reproducible. The backend is the source of truth for all financial logic — the frontend is a thin client that renders what the API returns.

## Tech Stack

**Frontend**
- React + TypeScript
- Apollo Client
- Styled Components

**Backend**
- Node.js + TypeScript
- Apollo Server (GraphQL)
- TypeORM + SQLite
- FRED prime rate feed

## Key Concepts

- **Bullet loans** — interest-only coupons; principal repaid in full at maturity.
- **30E/360 ISDA day count** — used for all interest accrual, including the February-maturity edge case.
- **Deterministic schedules** — the prime-rate history in effect at creation is pinned to the loan, so schedules never shift if the external feed changes later.

## Running the project

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Starts the GraphQL server on `http://localhost:4000/graphql`. Migrations run automatically on boot; a fresh checkout boots an empty database with the current schema.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Opens the app on `http://localhost:3000`.

### Tests

```bash
cd backend && npm test      # Jest
cd frontend && npm test     # Vitest
```

## Notes

- Prime rate data is fetched from the FRED public CSV feed and cached in-process with a TTL and stale-on-failure fallback.
- Money is modeled as a plain JavaScript number for simplicity. Intermediate calculations are rounded to 10 decimals and monetary outputs to 2 decimals. A production system handling real balances should switch to a decimal/bigint representation.
- SQLite is used for portability. Foreign-key cascades are enforced explicitly in `LoanService.deleteLoansByIds` rather than at the SQL level.
