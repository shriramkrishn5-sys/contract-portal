const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: "postgresql://postgres.zzpbqnikimgwrkvryibv:Kanha%40211410@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT id, name, created_at FROM templates ORDER BY created_at DESC LIMIT 5');
    console.log("--- LATEST TEMPLATES ---");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
