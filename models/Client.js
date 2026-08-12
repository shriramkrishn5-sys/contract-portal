const { getDb } = require('../config/database');

class Client {
  static async findAll() {
    const db = await getDb();
    return await db.all('SELECT * FROM clients ORDER BY created_at DESC');
  }

  static async findByEmail(email) {
    const db = await getDb();
    return await db.get('SELECT * FROM clients WHERE email = ?', [email]);
  }

  static async upsertFromContract(contractData) {
    // contractData is the Contract object just signed
    if (!contractData.client_email) return;

    const db = await getDb();
    const now = new Date().toISOString();
    const existing = await this.findByEmail(contractData.client_email);

    if (existing) {
      // Update totals
      const newTotal = existing.total_spent + (contractData.total_amount || 0);
      const newCount = existing.contract_count + 1;
      
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
    
    // Fetch the email first
    const row = await db.get('SELECT email FROM clients WHERE id = ?', [id]);
    const email = row ? row.email : null;

    if (email) {
      // Find all contracts for this email
      const Contract = require('./Contract');
      const contractIds = [];
    const _rows = await db.all('SELECT id FROM contracts WHERE client_email = ?', [email]);
    for (const row of _rows) {
      contractIds.push(row.id);
    }

      // Delete all associated contracts (which will trigger cascade deletion of events/notes/pdfs)
      for (const cId of contractIds) {
        await Contract.delete(cId);
      }
    }

    await db.run('DELETE FROM clients WHERE id = ?', [id]);
  }
}

module.exports = Client;
