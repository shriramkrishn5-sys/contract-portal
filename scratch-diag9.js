require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: "postgresql://postgres.zzpbqnikimgwrkvryibv:Kanha%40211410@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`DELETE FROM admins WHERE deleted_at IS NOT NULL`);
    console.log(`Deleted ${res.rowCount} soft-deleted admins.`);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
