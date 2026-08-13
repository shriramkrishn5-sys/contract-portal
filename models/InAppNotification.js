const { getDb } = require('../config/database');

class InAppNotification {
  static async create(adminId, message, link) {
    if (!adminId) return;
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO inapp_notifications (admin_id, message, link, created_at)
       VALUES (?, ?, ?, ?)`,
      [adminId, message, link, now]
    );
  }

  static async getUnreadForAdmin(adminId, limit = 5) {
    const db = await getDb();
    const notifications = [];
    const _rows = await db.all(
      `SELECT * FROM inapp_notifications 
       WHERE admin_id = ? AND is_read = false 
       ORDER BY created_at DESC 
       LIMIT ?`
    , [adminId, limit]);
    for (const row of _rows) {
      notifications.push(row);
    }
    
    // Also get total unread count
    const row = await db.get('SELECT COUNT(*) as count FROM inapp_notifications WHERE admin_id = ? AND is_read = false', [adminId]);
    let unreadCount = row ? row.count : 0;
    
    return { notifications, unreadCount };
  }

  static async markAsRead(id, adminId) {
    const db = await getDb();
    await db.run(
      `UPDATE inapp_notifications SET is_read = true WHERE id = ? AND admin_id = ?`,
      [id, adminId]
    );
  }

  static async markAllAsRead(adminId) {
    const db = await getDb();
    await db.run(
      `UPDATE inapp_notifications SET is_read = true WHERE admin_id = ?`,
      [adminId]
    );
  }
}

module.exports = InAppNotification;
