import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds indexes on loans.endDate and loans.createdAt.
 *
 * loans.endDate  — used by getPortfolioSummary nextMaturity query (range scan)
 * loans.createdAt — used by getLoans ORDER BY createdAt DESC (sort scan)
 *
 * Both become full-table scans without these at 100k+ rows.
 * IF NOT EXISTS makes this safe to re-run or apply against a database
 * that already had these indexes added manually.
 */
export class AddLoanIndexes1745000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_loan_end_date"
        ON "loans" ("endDate")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_loan_created_at"
        ON "loans" ("createdAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_loan_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_loan_end_date"`);
  }
}
