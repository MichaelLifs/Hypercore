import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Captures the schema that was previously maintained by synchronize:true.
 * All statements use IF NOT EXISTS so this is safe to run against an
 * existing database that was set up under synchronize:true.
 */
export class InitialSchema1714000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loans" (
        "id"         varchar(36)  PRIMARY KEY NOT NULL,
        "name"       text         NOT NULL,
        "principal"  real         NOT NULL,
        "startDate"  text         NOT NULL,
        "endDate"    text         NOT NULL,
        "createdAt"  datetime     NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_rate_segments" (
        "id"            varchar(36) PRIMARY KEY NOT NULL,
        "loanId"        text        NOT NULL,
        "effectiveFrom" text        NOT NULL,
        "effectiveTo"   text,
        "annualRate"    real        NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rate_segment_loan"
        ON "loan_rate_segments" ("loanId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "repayment_entries" (
        "id"               varchar(36) PRIMARY KEY NOT NULL,
        "loanId"           text        NOT NULL,
        "sequenceNumber"   integer     NOT NULL,
        "paymentDate"      text        NOT NULL,
        "paymentType"      text        NOT NULL,
        "principal"        real        NOT NULL,
        "interest"         real        NOT NULL,
        "total"            real        NOT NULL,
        "remainingBalance" real        NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_repayment_loan_seq"
        ON "repayment_entries" ("loanId", "sequenceNumber")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_repayment_loan_seq"
        ON "repayment_entries" ("loanId", "sequenceNumber")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "repayment_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_rate_segments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loans"`);
  }
}
