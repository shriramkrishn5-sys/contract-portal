const { getDb } = require('../config/database');

class Client {
  static async findAll() {
    const db = await getDb();
    return await db.all('SELECT * FROM clients WHERE deleted_at IS NULL ORDER BY created_at DESC');
  }

  static async findDeleted() {
    const db = await getDb();
    return await db.all('SELECT * FROM clients WHERE deleted_at IS NOT NULL ORDER BY created_at DESC');
  }

  static async findByEmail(email) {
    const db = await getDb();
    return await db.get('SELECT * FROM clients WHERE email = ? AND deleted_at IS NULL', [email]);
  }

  static async findByEmailWithDeleted(email) {
    const db = await getDb();
    return await db.get('SELECT * FROM clients WHERE email = ?', [email]);
  }

  static async upsertFromContract(contractData) {
    // contractData is the Contract object just signed
    if (!contractData.client_email) return;

    const db = await getDb();
    const now = new Date().toISOString();
    const existing = await this.findByEmailWithDeleted(contractData.client_email);

    if (existing) {
      // Update totals
      const newTotal = parseFloat(existing.total_spent || 0) + parseFloat(contractData.total_amount || 0);
      const newCount = parseInt(existing.contract_count || 0, 10) + 1;
      
      await db.run(
        `UPDATE clients SET 
          name = ?, company = ?, designation = ?, phone = ?, address = ?, region = ?,
          total_spent = ?, contract_count = ?, updated_at = ?
         WHERE email = ?`,
        [
          contractData.client_name,
          contractData.client_company,
          contractData.client_designation,
          contractData.client_phone,
          contractData.client_address,
          contractData.client_region,
          newTotal,
          newCount,
          now,
          contractData.client_email
        ]
      );
    } else {
      // Insert new
      await db.run(
        `INSERT INTO clients (name, email, company, designation, phone, address, region, total_spent, contract_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contractData.client_name,
          contractData.client_email,
          contractData.client_company,
          contractData.client_designation,
          contractData.client_phone,
          contractData.client_address,
          contractData.client_region,
          contractData.total_amount || 0,
          1,
          now,
          now
        ]
      );
    }
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }

  static async restore(id) {
    const db = await getDb();
    await db.run('UPDATE clients SET deleted_at = NULL WHERE id = ?', [id]);
  }
}

module.exports = Client;
