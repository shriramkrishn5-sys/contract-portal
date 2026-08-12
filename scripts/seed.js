require('dotenv').config();
const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function seed() {
  const db = await getDb();
  
  // Create admin
  const hash = await bcrypt.hash('Kanha@211410', 10);
  const now = new Date().toISOString();
  
  // Check if admin exists
  const adminExists = await db.get('SELECT id FROM admins WHERE email = ?', ['kanha@kkeyqik.com']);

  if (!adminExists) {
    await db.run(
      'INSERT INTO admins (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      ['Kanha', 'kanha@kkeyqik.com', hash, 'superadmin', now]
    );
    console.log('✅ Admin user created: kanha@kkeyqik.com');
  } else {
    console.log('ℹ️  Admin already exists, skipping');
  }

  // Load templates
  const templatesDir = path.join(__dirname, '../templates');
  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const tpl = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
        const slug = tpl.slug || file.replace('.json', '');
        
        // Check if template exists
        const exists = await db.get('SELECT id FROM templates WHERE slug = ?', [slug]);

        if (!exists) {
          await db.run(
            `INSERT INTO templates (slug, name, description, category, icon, content_sections, default_clauses, fields_schema, client_fields_schema, version, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              slug,
              tpl.name || file.replace('.json', ''),
              tpl.description || '',
              tpl.category || 'Service',
              tpl.icon || 'document',
              JSON.stringify(tpl.sections || tpl.content_sections || []),
              JSON.stringify(tpl.clauses || tpl.default_clauses || []),
              JSON.stringify(tpl.adminFields || tpl.fields_schema || []),
              JSON.stringify(tpl.clientFields || tpl.client_fields_schema || []),
              tpl.version || 1,
              1,
              now,
              now
            ]
          );
          console.log(`✅ Template loaded: ${tpl.name || file}`);
        } else {
          console.log(`ℹ️  Template "${slug}" already exists, skipping`);
        }
      } catch (err) {
        console.error(`❌ Template ${file} failed:`, err.message);
      }
    }
  }
  
  console.log('\n🎉 Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
