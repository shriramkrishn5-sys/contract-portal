const { getDb } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Clause {
  static async findAll() {
    const db = await getDb();
    return await db.all('SELECT * FROM clauses ORDER BY created_at DESC');
  }

  static async findById(id) {
    const db = await getDb();
    return await db.get('SELECT * FROM clauses WHERE id = ?', [id]);
  }

  static async create(data) {
    const db = await getDb();
    const now = new Date().toISOString();
    const uuid = uuidv4();
    
    await db.run(
      `INSERT INTO clauses (uuid, title, content, category, is_global, default_enabled, client_toggleable, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        data.title,
        data.content,
        data.category || 'General',
        data.is_global !== undefined ? data.is_global : 1,
        data.default_enabled ? 1 : 0,
        data.client_toggleable ? 1 : 0,
        now,
        now
      ]
    );
  }

  static async update(id, data) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `UPDATE clauses SET 
        title = ?, content = ?, category = ?, is_global = ?, 
        default_enabled = ?, client_toggleable = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.title,
        data.content,
        data.category || 'General',
        data.is_global !== undefined ? data.is_global : 1,
        data.default_enabled ? 1 : 0,
        data.client_toggleable ? 1 : 0,
        now,
        id
      ]
    );
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM clauses WHERE id = ?', [id]);
  }
}

module.exports = Clause;
