const { getDb, saveDb } = require('../config/database');

async function migrate() {
  try {
    const db = await getDb();
    console.log('Creating inapp_notifications table...');
    
    db.run(`
      CREATE TABLE IF NOT EXISTS inapp_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    saveDb();
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
