const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static async findByEmail(email) {
    const db = await getDb();
    return await db.get('SELECT * FROM admins WHERE email = ? AND deleted_at IS NULL', [email]);
  }

  static async findAll() {
    const db = await getDb();
    return await db.all('SELECT id, name, email, role, created_at FROM admins WHERE deleted_at IS NULL ORDER BY created_at ASC');
  }

  static async findById(id) {
    const db = await getDb();
    return await db.get('SELECT * FROM admins WHERE id = ? AND deleted_at IS NULL', [id]);
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

  static async deleteAndReassign(oldAdminId, newAdminId) {
    const db = await getDb();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query('UPDATE contracts SET admin_id = $1 WHERE admin_id = $2', [newAdminId, oldAdminId]);
      await client.query('UPDATE admins SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [oldAdminId]);
      await client.query('COMMIT');
      return res.rowCount;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = Admin;
