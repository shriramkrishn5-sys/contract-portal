require('dotenv').config();
const { getDb, saveDb } = require('../config/database');

async function migratePhase3() {
  const db = await getDb();
  
  const sql = `
    CREATE TABLE IF NOT EXISTS clauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      title TEXT,
      content TEXT,
      category TEXT DEFAULT 'General',
      is_global INTEGER DEFAULT 1,
      default_enabled INTEGER DEFAULT 0,
      client_toggleable INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      company TEXT,
      designation TEXT,
      phone TEXT,
      address TEXT,
      region TEXT DEFAULT 'indian',
      total_spent REAL DEFAULT 0,
      contract_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_clauses_uuid ON clauses(uuid);
    CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
  `;
  
  db.exec(sql);

  // If there are no clauses, maybe we can seed them from the template JSON files?
  // Let's just create the tables for now. We can manually seed or use the GUI.

  saveDb();
  console.log('Phase 3 Migration completed: created clauses and clients tables.');
}

migratePhase3().catch(console.error);
