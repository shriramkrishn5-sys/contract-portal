require('dotenv').config();
const { getDb } = require('../config/database');

async function up() {
  try {
    const db = await getDb();
    console.log('Adding contract_versions table...');
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS contract_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT NOT NULL,
        version_number INT NOT NULL,
        content_snapshot JSON,
        changed_by_admin_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
      )
    `);
    
    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

up();
