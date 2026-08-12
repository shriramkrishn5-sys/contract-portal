require('dotenv').config();
const { getDb, saveDb } = require('../config/database');

async function migrate() {
  const db = await getDb();
  
  const sql = `
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      event_type TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
  `;
  
  db.exec(sql);
  saveDb();
  console.log('Webhooks migration completed');
}

migrate().catch(console.error);
