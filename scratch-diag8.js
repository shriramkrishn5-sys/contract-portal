require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: "postgresql://postgres.zzpbqnikimgwrkvryibv:Kanha%40211410@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid::regclass::text IN ('audit_logs', 'contracts')
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
