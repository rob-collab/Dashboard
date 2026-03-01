/**
 * One-time migration: install a PostgreSQL trigger that prevents
 * deletion of rows from audit_logs, making the log tamper-evident.
 *
 * Run with: npx tsx prisma/protect-audit-log.ts
 */
import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

  await pool.query(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit logs are immutable: deletion is not permitted';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS trg_no_delete_audit_logs ON audit_logs;
    CREATE TRIGGER trg_no_delete_audit_logs
      BEFORE DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();
  `);

  console.log("Audit log delete-protection trigger installed.");
  await pool.end();
}

main().catch(console.error);
