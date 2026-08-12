const { getDb } = require('../config/database');

class AuditLog {
  /**
   * Create a new audit log entry
   * @param {number} adminId - ID of the admin who performed the action
   * @param {string} action - e.g., 'Created', 'Updated', 'Deleted', 'Viewed'
   * @param {string} type - e.g., 'Contract', 'Template', 'Clause', 'User', 'Settings'
   * @param {string} entityId - The ID/Name of the entity affected
   * @param {string} details - Human readable details of the action
   * @param {string} ip - IP address of the user
   */
  static async create(adminId, action, type, entityId, details, ip) {
    if (!adminId) return; // Fail silently if no admin (e.g., public route mistakenly triggered)
    
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO audit_logs (admin_id, action, type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, action, type, entityId, details, ip, now]
    );
  }

  /**
   * Get all audit logs with admin details, with optional filtering and pagination
   */
  static async findAll(options = {}) {
    const db = await getDb();
    const { 
      limit = 10, offset = 0, q, action, type, admin_id, startDate, endDate 
    } = options;

    let query = `
      SELECT al.*, a.name as admin_name, a.email as admin_email 
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      query += ` AND (al.details LIKE ? OR al.entity_id LIKE ? OR a.name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }
    if (type) {
      query += ` AND al.type = ?`;
      params.push(type);
    }
    if (admin_id) {
      query += ` AND al.admin_id = ?`;
      params.push(admin_id);
    }
    if (startDate) {
      query += ` AND al.created_at >= ?`;
      params.push(startDate + 'T00:00:00Z');
    }
    if (endDate) {
      query += ` AND al.created_at <= ?`;
      params.push(endDate + 'T23:59:59Z');
    }

    if (limit === null) {
      query += ` ORDER BY al.created_at DESC`;
    } else {
      query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    return await db.all(query, params);
  }

  /**
   * Count total logs for pagination
   */
  static async countAll(options = {}) {
    const db = await getDb();
    const { q, action, type, admin_id, startDate, endDate } = options;

    let query = `
      SELECT COUNT(*) as total 
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      query += ` AND (al.details LIKE ? OR al.entity_id LIKE ? OR a.name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }
    if (type) {
      query += ` AND al.type = ?`;
      params.push(type);
    }
    if (admin_id) {
      query += ` AND al.admin_id = ?`;
      params.push(admin_id);
    }
    if (startDate) {
      query += ` AND al.created_at >= ?`;
      params.push(startDate + 'T00:00:00Z');
    }
    if (endDate) {
      query += ` AND al.created_at <= ?`;
      params.push(endDate + 'T23:59:59Z');
    }

    const _row = await db.get(query, params);
    const total = _row ? _row.total : 0;
    return total;
  }
}

module.exports = AuditLog;
