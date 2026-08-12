const { getDb, saveDb } = require('../config/database');

async function migrate() {
  try {
    const db = await getDb();
    console.log('Adding reminder tracking columns to contracts table...');
    
    try {
      db.run('ALTER TABLE contracts ADD COLUMN reminder_count INTEGER DEFAULT 0');
      console.log('Added reminder_count column');
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('Column reminder_count already exists');
      } else {
        throw e;
      }
    }

    try {
      db.run('ALTER TABLE contracts ADD COLUMN last_reminder_at TEXT');
      console.log('Added last_reminder_at column');
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('Column last_reminder_at already exists');
      } else {
        throw e;
      }
    }

    saveDb();
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
