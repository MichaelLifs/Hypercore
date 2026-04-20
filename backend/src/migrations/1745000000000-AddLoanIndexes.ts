import { MigrationInterface, QueryRunner } from 'typeorm';

// endDate supports the portfolio nextMaturity scan; createdAt supports the
// default ORDER BY in getLoans. Both degrade to full-table scans at scale.
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
