const { getDb } = require('../config/database');

class Setting {
  static async getAll() {
    const db = await getDb();
    const rows = await db.all('SELECT "key", "value" FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  static async get(key) {
    const db = await getDb();
    const row = await db.get('SELECT "value" FROM settings WHERE "key" = ?', [key]);
    return row ? row.value : null;
  }

  static async updateAll(settingsObj) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(settingsObj)) {
        await client.query(
          'INSERT INTO settings ("key", "value", updated_at) VALUES ($1, $2, $3) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED.value, updated_at = EXCLUDED.updated_at',
          [key, value, now]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = Setting;
