require('dotenv').config();
const { getDb } = require('../config/database');

async function migrate() {
  try {
    const db = await getDb();
    console.log('Adding client_type column to contracts table...');
    
    // Add column if it doesn't exist
    // Using a try-catch for the specific ALTER TABLE since it might already exist
    try {
      await db.run('ALTER TABLE contracts ADD COLUMN client_type VARCHAR(50) DEFAULT \'company\'');
      console.log('Migration successful: client_type column added.');
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log('Column client_type already exists.');
      } else {
        throw err;
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
