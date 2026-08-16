require('dotenv').config();
const { getDb } = require('../config/database');

async function migrate() {
  console.log('Running migration: Adding client_entity_type and client_entity_type_custom to contracts table...');
  try {
    const db = await getDb();
    
    // Add client_entity_type column if it doesn't exist
    await db.run(`
      ALTER TABLE contracts 
      ADD COLUMN IF NOT EXISTS client_entity_type VARCHAR(100) DEFAULT NULL
    `);

    // Add client_entity_type_custom column if it doesn't exist
    await db.run(`
      ALTER TABLE contracts 
      ADD COLUMN IF NOT EXISTS client_entity_type_custom VARCHAR(100) DEFAULT NULL
    `);

    console.log('Migration successful: client_entity_type & client_entity_type_custom columns added.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
