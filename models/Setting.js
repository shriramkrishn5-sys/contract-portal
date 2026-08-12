const { getDb } = require('../config/database');

class Setting {
  static async getAll() {
    const db = await getDb();
    const rows = await db.all('SELECT `key`, `value` FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  static async get(key) {
    const db = await getDb();
    const row = await db.get('SELECT `value` FROM settings WHERE `key` = ?', [key]);
    return row ? row.value : null;
  }

  static async updateAll(settingsObj) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    // Begin transaction for safety since we are updating multiple rows
    // In MySQL, we must get a dedicated connection for transactions
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();
    try {
      for (const [key, value] of Object.entries(settingsObj)) {
        // Use REPLACE INTO which is MySQL syntax (Settings table must have `key` as Primary Key/Unique)
        await connection.execute('REPLACE INTO settings (`key`, `value`, updated_at) VALUES (?, ?, ?)', [key, value, now]);
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = Setting;
