const { getDb } = require('../config/database');

class Webhook {
  static async getAll() {
    const db = await getDb();
    return await db.all('SELECT * FROM webhooks ORDER BY created_at DESC');
  }

  static async getActiveByEventType(eventType) {
    const db = await getDb();
    return await db.all('SELECT * FROM webhooks WHERE events = ? AND is_active = true', [eventType]);
  }

  static async getById(id) {
    const db = await getDb();
    return await db.get('SELECT * FROM webhooks WHERE id = ?', [id]);
  }

  static async create(data) {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO webhooks (url, events, is_active, created_at) VALUES (?, ?, ?, ?)',
      [data.url, data.event_type || data.events, data.is_active !== undefined ? data.is_active : 1, now]
    );
  }

  static async update(id, data) {
    const db = await getDb();
    // In mysql, 'events' is the column name according to migrate.js
    await db.run(
      'UPDATE webhooks SET url = ?, events = ?, is_active = ? WHERE id = ?',
      [data.url, data.event_type || data.events, data.is_active, id]
    );
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM webhooks WHERE id = ?', [id]);
  }
}

module.exports = Webhook;
