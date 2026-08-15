require('dotenv').config();
const { getDb } = require('../config/database');

async function migrate() {
  const db = await getDb();
  const pool = db.pool;
  
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS contract_versions (
        id SERIAL PRIMARY KEY,
        contract_id INT,
        version_number INT,
        content_snapshot TEXT,
        changed_by_admin_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const client = await pool.connect();
    try {
      console.log('Creating contract_versions table...');
      await client.query(query);
      console.log('contract_versions table created successfully.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
