require('dotenv').config();
const { getDb, saveDb } = require('../config/database');

async function migrate() {
  const db = await getDb();
  
  const sql = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      color TEXT,
      icon TEXT,
      created_at TEXT
    );
  `;
  
  db.exec(sql);

  try {
    db.exec(`ALTER TABLE templates ADD COLUMN category_id INTEGER;`);
    console.log('Added category_id to templates');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.log('Column category_id might already exist or error:', err.message);
    }
  }

  saveDb();
  console.log('Phase 4 Migration completed');
}

migrate().catch(console.error);
