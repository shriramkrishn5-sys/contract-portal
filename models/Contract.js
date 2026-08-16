const { getDb } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Contract {
  static async create(data) {
    const db = await getDb();
    const uuid = uuidv4();
    const now = new Date().toISOString();

    const fields = ['uuid', 'created_at', 'status'];
    const values = [uuid, now, 'draft'];
    const placeholders = ['?', '?', '?'];

    for (const [key, value] of Object.entries(data)) {
      fields.push(key);
      const val = typeof value === 'object' ? JSON.stringify(value) : value;
      values.push(val);
      placeholders.push('?');
    }

    const sql = `INSERT INTO contracts (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await db.run(sql, values);

    return this.findByUuid(uuid);
  }

  static async findByUuid(uuid) {
    const db = await getDb();
    const contract = await db.get('SELECT * FROM contracts WHERE uuid = ?', [uuid]);

    if (contract) this._parseJsonFields(contract);
    return contract;
  }

  static async findById(id) {
    const db = await getDb();
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', [id]);

    if (contract) this._parseJsonFields(contract);
    return contract;
  }

  static async findAll(filters = {}) {
    const db = await getDb();
    let query = 'SELECT * FROM contracts';
    let conditions = [];
    let params = [];

    if (filters.status) {
      if (filters.status === 'expiring') {
        const now = new Date();
        const in48h = new Date(now.getTime() + (48 * 60 * 60 * 1000));
        conditions.push("expires_at BETWEEN ? AND ?");
        params.push(now.toISOString(), in48h.toISOString());
        conditions.push("status IN ('sent', 'opened', 'filled')");
      } else {
        conditions.push('status = ?');
        params.push(filters.status);
      }
    }
    if (filters.search) {
      conditions.push('(client_name LIKE ? OR client_email LIKE ? OR company_name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.startDate) {
      conditions.push('created_at >= ?');
      params.push(`${filters.startDate} 00:00:00`);
    }
    if (filters.endDate) {
      conditions.push('created_at <= ?');
      params.push(`${filters.endDate} 23:59:59`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const contracts = await db.all(query, params);
    for (const contract of contracts) {
      this._parseJsonFields(contract);
    }
    return contracts;
  }

  static async updateStatus(id, status) {
    const db = await getDb();
    let updateField = '';
    const now = new Date().toISOString();

    if (status === 'sent') updateField = ', sent_at = ?';
    else if (status === 'opened') updateField = ', first_opened_at = COALESCE(first_opened_at, ?)';
    else if (status === 'signed') updateField = ', signed_at = ?';
    else if (status === 'declined') updateField = ', declined_at = ?';

    let sql = `UPDATE contracts SET status = ?${updateField} WHERE id = ?`;
    let params = [status];
    if (updateField) params.push(now);
    params.push(id);

    await db.run(sql, params);
  }

  static async saveVersion(id, adminId) {
    const db = await getDb();
    const contract = await this.findById(id);
    if (!contract) return;

    // Get current max version
    const maxVersionRow = await db.get('SELECT MAX(version_number) as max_version FROM contract_versions WHERE contract_id = ?', [id]);
    const nextVersion = maxVersionRow && maxVersionRow.max_version ? maxVersionRow.max_version + 1 : 1;

    const snapshot = JSON.stringify(contract);

    await db.run(
      'INSERT INTO contract_versions (contract_id, version_number, content_snapshot, changed_by_admin_id) VALUES (?, ?, ?, ?)',
      [id, nextVersion, snapshot, adminId]
    );
  }

  static async getVersions(id) {
    const db = await getDb();
    const query = `
      SELECT cv.*, a.name as admin_name 
      FROM contract_versions cv 
      LEFT JOIN admins a ON cv.changed_by_admin_id = a.id 
      WHERE cv.contract_id = ? 
      ORDER BY cv.version_number DESC
    `;
    return await db.all(query, [id]);
  }

  static async restoreVersion(contractId, versionId) {
    const db = await getDb();
    const version = await db.get('SELECT * FROM contract_versions WHERE id = ? AND contract_id = ?', [versionId, contractId]);
    if (!version || !version.content_snapshot) return false;

    let snapshot;
    try {
      snapshot = typeof version.content_snapshot === 'string' ? JSON.parse(version.content_snapshot) : version.content_snapshot;
    } catch (e) {
      return false;
    }

    const fields = [];
    const values = [];
    // Only restore data fields, not id or created_at
    const skipFields = ['id', 'uuid', 'created_at', 'template_id', 'admin_id'];
    for (const [k, v] of Object.entries(snapshot)) {
      if (skipFields.includes(k) || typeof v === 'object') continue; // Simple restore
      fields.push(`${k} = ?`);
      values.push(v);
    }

    if (snapshot.selected_clauses) {
      fields.push(`selected_clauses = ?`);
      values.push(JSON.stringify(snapshot.selected_clauses));
    }

    values.push(contractId);

    await db.run(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  }

  static async delete(id) {
    const db = await getDb();

    const row = await db.get('SELECT signed_pdf_path FROM contracts WHERE id = ?', [id]);
    const pdfPath = row ? row.signed_pdf_path : null;

    // Delete associated data
    await db.run('DELETE FROM tracking_events WHERE contract_id = ?', [id]);
    await db.run('DELETE FROM notes WHERE contract_id = ?', [id]);

    await db.run('DELETE FROM contracts WHERE id = ?', [id]);

    // Delete physical PDF if it exists
    if (pdfPath) {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(__dirname, '..', 'public', pdfPath.replace(/^\//, ''));
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error('Failed to delete physical PDF:', err);
      }
    }
  }

  static async reassignAdmin(oldAdminId, newAdminId) {
    const db = await getDb();
    const result = await db.run('UPDATE contracts SET admin_id = ? WHERE admin_id = ?', [newAdminId, oldAdminId]);
    return result.changes;
  }

  static async updateClientDetails(uuid, clientData, finalClauses = null) {
    const db = await getDb();
    const now = new Date().toISOString();
    const selections = JSON.stringify(clientData.client_selections || {});

    let updateFields = `
        client_name = ?, client_email = ?, client_company = ?, 
        client_designation = ?, client_phone = ?, client_address = ?, 
        client_region = ?, client_entity_type = ?, client_entity_type_custom = ?,
        client_selections = ?, client_filled_at = ?,
        status = 'filled'`;

    let params = [
      clientData.client_name || '',
      clientData.client_email || '',
      clientData.client_company || '',
      clientData.client_designation || '',
      clientData.client_phone || '',
      clientData.client_address || '',
      clientData.client_region || 'international',
      clientData.client_entity_type || null,
      clientData.client_entity_type_custom || null,
      selections,
      now
    ];

    if (finalClauses !== null) {
      updateFields += `, selected_clauses = ?`;
      params.push(JSON.stringify(finalClauses));
    }

    params.push(uuid);

    await db.run(`UPDATE contracts SET ${updateFields} WHERE uuid = ?`, params);
  }

  static async updateSignature(uuid, signatureData) {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      `UPDATE contracts SET 
        signature_data = ?, signature_type = ?, signature_ip = ?, 
        signature_user_agent = ?, status = 'signed', signed_at = ?
      WHERE uuid = ?`,
      [
        signatureData.data, signatureData.type, signatureData.ip,
        signatureData.userAgent, now, uuid
      ]
    );
  }

  static async updatePdfPath(id, pdfPath) {
    const db = await getDb();
    await db.run('UPDATE contracts SET signed_pdf_path = ? WHERE id = ?', [pdfPath, id]);
  }

  static async getStats() {
    const db = await getDb();
    const stats = { total: 0, byStatus: {} };

    const rows = await db.all('SELECT status, COUNT(*) as count FROM contracts GROUP BY status');
    for (const row of rows) {
      stats.byStatus[row.status] = row.count;
      stats.total += row.count;
    }

    if (stats.total > 0) {
      stats.conversionRate = ((stats.byStatus['signed'] || 0) / stats.total * 100).toFixed(2);
    } else {
      stats.conversionRate = 0;
    }
    return stats;
  }

  static async getRecent(limit = 5) {
    const db = await getDb();
    const contracts = await db.all('SELECT * FROM contracts ORDER BY created_at DESC LIMIT ?', [limit]);
    for (const contract of contracts) {
      this._parseJsonFields(contract);
    }
    return contracts;
  }

  static _parseJsonFields(contract) {
    const jsonFields = ['selected_clauses', 'payment_terms', 'client_selections'];
    jsonFields.forEach(field => {
      if (contract[field]) {
        try {
          contract[field] = JSON.parse(contract[field]);
        } catch (e) {
          // ignore parsing error
        }
      }
    });
  }
}

module.exports = Contract;
