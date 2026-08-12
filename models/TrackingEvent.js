const { getDb } = require('../config/database');

class TrackingEvent {
  static async create(contractId, eventType, data = {}) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    await db.run(
      `INSERT INTO tracking_events (contract_id, event_type, ip_address, user_agent, referrer, time_on_page, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractId, eventType, data.ip || '', data.userAgent || '', data.referrer || '',
        data.timeOnPage || 0, JSON.stringify(data.metadata || {}), now
      ]
    );
  }

  static async findByContractId(contractId) {
    const db = await getDb();
    const events = [];
    const _rows = await db.all('SELECT * FROM tracking_events WHERE contract_id = ? ORDER BY created_at DESC', [contractId]);
    for (const row of _rows) {
      const evt = row;
      if (evt.metadata) {
        try { evt.metadata = JSON.parse(evt.metadata); } catch(e) {}
      }
      events.push(evt);
    }
    return events;
  }

  static async getOpenCount(contractId) {
    const db = await getDb();
    const _row = await db.get("SELECT COUNT(*) as count FROM tracking_events WHERE contract_id = ? AND event_type = 'opened'", [contractId]);
    const count = _row ? _row.count : 0;
    return count;
  }
}

module.exports = TrackingEvent;
