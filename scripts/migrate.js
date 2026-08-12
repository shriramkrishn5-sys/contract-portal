require('dotenv').config();
const { getDb } = require('../config/database');

async function migrate() {
  const db = await getDb();
  const pool = db.pool;
  
  try {
    const queries = [
      `CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        role VARCHAR(50),
        created_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        description TEXT,
        category VARCHAR(255),
        icon VARCHAR(50),
        content_sections TEXT,
        default_clauses TEXT,
        fields_schema TEXT,
        client_fields_schema TEXT,
        version INT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        uuid VARCHAR(255) UNIQUE,
        template_id INT,
        template_version INT,
        admin_id INT,
        status VARCHAR(50) DEFAULT 'draft',
        company_name VARCHAR(255),
        company_address TEXT,
        company_gstin VARCHAR(100),
        company_cin VARCHAR(100),
        authorized_signatory VARCHAR(255),
        signatory_designation VARCHAR(255),
        company_email VARCHAR(255),
        company_phone VARCHAR(50),
        project_name VARCHAR(255),
        scope_of_work TEXT,
        total_amount DECIMAL(15,2),
        currency VARCHAR(10) DEFAULT 'INR',
        payment_type VARCHAR(50),
        payment_terms TEXT,
        timeline VARCHAR(255),
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        preparation_period VARCHAR(50) DEFAULT '1 week',
        selected_clauses TEXT,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        client_company VARCHAR(255),
        client_designation VARCHAR(255),
        client_phone VARCHAR(50),
        client_address TEXT,
        client_region VARCHAR(50) DEFAULT 'indian',
        client_selections TEXT,
        client_filled_at TIMESTAMP,
        signature_data TEXT,
        signature_type VARCHAR(50),
        signature_ip VARCHAR(50),
        signature_user_agent TEXT,
        pre_sign_hash VARCHAR(255),
        post_sign_hash VARCHAR(255),
        signed_pdf_path VARCHAR(255),
        created_at TIMESTAMP,
        sent_at TIMESTAMP,
        first_opened_at TIMESTAMP,
        signed_at TIMESTAMP,
        expires_at TIMESTAMP,
        reminder_count INT DEFAULT 0,
        last_reminder_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS tracking_events (
        id SERIAL PRIMARY KEY,
        contract_id INT,
        event_type VARCHAR(100),
        ip_address VARCHAR(50),
        user_agent TEXT,
        referrer TEXT,
        time_on_page INT,
        metadata TEXT,
        created_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        contract_id INT,
        admin_id INT,
        content TEXT,
        created_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS inapp_notifications (
        id SERIAL PRIMARY KEY,
        admin_id INT NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INT,
        action VARCHAR(100),
        type VARCHAR(100),
        entity_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS settings (
        "key" VARCHAR(100) PRIMARY KEY,
        "value" TEXT,
        updated_at TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        url VARCHAR(255),
        events VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        secret VARCHAR(255),
        created_at TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS clauses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        content TEXT,
        category VARCHAR(100),
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        slug VARCHAR(100) UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        company VARCHAR(255),
        designation VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        region VARCHAR(50),
        total_spent DECIMAL(15,2) DEFAULT 0,
        contract_count INT DEFAULT 0,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`,
      `CREATE INDEX IF NOT EXISTS idx_contracts_client_email ON contracts(client_email)`,
      `CREATE INDEX IF NOT EXISTS idx_tracking_contract_id ON tracking_events(contract_id)`
    ];

    for (const sql of queries) {
      try {
        await pool.query(sql);
      } catch (err) {
        // Postgres duplicate object
        if (err.code !== '42P07') {
          console.error('Error executing query:', sql);
          console.error(err);
        }
      }
    }
    
    console.log('Migration completed successfully');
  } catch(e) {
    console.error("Migration error:", e);
  } finally {
    // End the pool so the process can exit
    if (db && db.pool) await db.pool.end();
    process.exit(0);
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
