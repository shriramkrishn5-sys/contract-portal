require('dotenv').config();
const { getDb, saveDb } = require('../config/database');

async function migrateSettings() {
  const db = await getDb();
  
  const sql = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );
  `;
  
  db.exec(sql);
  
  // Insert default values if not exists
  const defaults = {
    company_name: 'KeyQik Private Limited',
    company_short_name: 'KeyQik',
    company_email: 'info@keyqik.com',
    company_phone: '+91 9711120165',
    company_website: 'https://keyqik.com',
    company_address: 'B-112, First Floor,\nSector-63, Noida,\nUttar Pradesh - 201301, India',
    company_pan: 'AAGCK1234D',
    company_cin: 'U74999DL2025PTCXXXXXX',
    company_gst: '07AAGCK1234D1Z5',
    company_tagline: 'Results-Driven Digital Marketing for Business Growth',
    company_about: 'KeyQik is a results-driven digital marketing agency helping businesses grow online with performance marketing, SEO, social media, and creative solutions.',
    company_industry: 'Digital Marketing Agency',
    company_logo: '/images/logo.svg'
  };

  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run([key, value, now]);
  }
  stmt.free();

  saveDb();
  console.log('Settings migration completed');
}

migrateSettings().catch(console.error);
