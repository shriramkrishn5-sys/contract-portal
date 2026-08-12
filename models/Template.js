const { getDb } = require('../config/database');

class Template {
  static async findAll() {
    const db = await getDb();
    const templates = [];
    const _rows = await db.all('SELECT * FROM templates WHERE is_active = 1 ORDER BY name');
    for (const row of _rows) {
      const tpl = row;
      this._parseJsonFields(tpl);
      templates.push(tpl);
    }
    return templates;
  }

  static async findBySlug(slug) {
    const db = await getDb();
    const template = await db.get('SELECT * FROM templates WHERE slug = ?', [slug]);
    if (template) {
      this._parseJsonFields(template);
    }
    return template;
  }

  static async findById(id) {
    const db = await getDb();
    const template = await db.get('SELECT * FROM templates WHERE id = ?', [id]);
    if (template) {
      this._parseJsonFields(template);
    }
    return template;
  }

  static async create(data) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO templates (slug, name, description, category, icon, content_sections, default_clauses, fields_schema, client_fields_schema, version, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.slug, data.name, data.description, data.category || 'Service', data.icon,
        JSON.stringify(data.content_sections || []),
        JSON.stringify(data.default_clauses || []),
        JSON.stringify(data.fields_schema || {}),
        JSON.stringify(data.client_fields_schema || {}),
        data.version || 1, data.is_active === false ? 0 : 1,
        now, now
      ]
    );

  }

  static async update(id, data) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `UPDATE templates SET 
        name = ?, description = ?, category = ?, icon = ?, content_sections = ?, default_clauses = ?, 
        fields_schema = ?, client_fields_schema = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.name, data.description, data.category || 'Service', data.icon,
        JSON.stringify(data.content_sections || []),
        JSON.stringify(data.default_clauses || []),
        JSON.stringify(data.fields_schema || {}),
        JSON.stringify(data.client_fields_schema || {}),
        now, id
      ]
    );

  }

  static _parseJsonFields(tpl) {
    const fields = ['content_sections', 'default_clauses', 'fields_schema', 'client_fields_schema'];
    fields.forEach(f => {
      if (tpl[f]) {
        try { tpl[f] = JSON.parse(tpl[f]); } catch(e) {}
      }
    });
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM templates WHERE id = ?', [id]);
  }
}

module.exports = Template;
