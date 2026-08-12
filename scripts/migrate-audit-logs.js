const path = require('path');
const { getDb, saveDb } = require('../config/database');

async function migrate() {
  console.log('Starting Audit Logs migration...');
  const db = await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    )
  `);
  console.log('Created audit_logs table.');

  saveDb();
  console.log('Audit Logs migration completed successfully.');
}

migrate().catch(console.error);
