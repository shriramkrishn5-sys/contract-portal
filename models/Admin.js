const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static async findByEmail(email) {
    const db = await getDb();
    return await db.get('SELECT * FROM admins WHERE email = ?', [email]);
  }

  static async findAll() {
    const db = await getDb();
    return await db.all('SELECT id, name, email, role, created_at FROM admins ORDER BY created_at ASC');
  }

  static async findById(id) {
    const db = await getDb();
    return await db.get('SELECT * FROM admins WHERE id = ?', [id]);
  }

  static async create(name, email, password, role = 'admin') {
    const db = await getDb();
    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    
    await db.run(
      'INSERT INTO admins (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, role, now]
    );
    
    return this.findByEmail(email);
  }

  static async update(id, { name, email, role, password }) {
    const db = await getDb();
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      await db.run(
        'UPDATE admins SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?',
        [name, email, role, hash, id]
      );
    } else {
      await db.run(
        'UPDATE admins SET name = ?, email = ?, role = ? WHERE id = ?',
        [name, email, role, id]
      );
    }
    return this.findById(id);
  }

  static async updateRole(id, role) {
    const db = await getDb();
    await db.run('UPDATE admins SET role = ? WHERE id = ?', [role, id]);
    return this.findById(id);
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM admins WHERE id = ?', [id]);
    return true;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = Admin;
