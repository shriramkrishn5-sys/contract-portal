require('dotenv').config();
const { getDb } = require('../config/database');

async function migrate() {
  const db = await getDb();
  try {
    console.log('Adding urgent_reminder_sent column to contracts table...');
    if (process.env.DATABASE_URL) {
      await db.run('ALTER TABLE contracts ADD COLUMN urgent_reminder_sent BOOLEAN DEFAULT false');
    } else {
      await db.run('ALTER TABLE contracts ADD COLUMN urgent_reminder_sent BOOLEAN DEFAULT 0');
    }
    console.log('Migration successful.');
  } catch (err) {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      console.log('Column already exists. Skipping.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
