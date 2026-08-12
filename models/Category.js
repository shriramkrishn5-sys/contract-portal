const { getDb } = require('../config/database');

class Category {
  static async findAll() {
    const db = await getDb();
    return await db.all('SELECT * FROM categories ORDER BY name');
  }

  static async findById(id) {
    const db = await getDb();
    return await db.get('SELECT * FROM categories WHERE id = ?', [id]);
  }

  static async create(data) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO categories (name, color, icon, created_at) VALUES (?, ?, ?, ?)`,
      [data.name, data.color || '#000000', data.icon || '📁', now]
    );
    const { saveDb } = require('../config/database');
  }

  static async update(id, data) {
    const db = await getDb();
    
    await db.run(
      `UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?`,
      [data.name, data.color, data.icon, id]
    );
    const { saveDb } = require('../config/database');
  }

  static async delete(id) {
    const db = await getDb();
    
    await db.run(`DELETE FROM categories WHERE id = ?`, [id]);
    const { saveDb } = require('../config/database');
  }
}

module.exports = Category;
