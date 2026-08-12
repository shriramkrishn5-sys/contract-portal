/**
 * Log a tracking event
 * @param {Object} db - The database instance (mysql via wrapper)
 * @param {Function} saveDb - Function to persist the DB (legacy arg, unused)
 * @param {string} contractId - The contract ID
 * @param {string} eventType - The event type
 * @param {Object} req - The Express request object
 * @param {Object} metadata - Additional metadata JSON
 * @returns {Promise<void>}
 */
async function logEvent(db, saveDb, contractId, eventType, req, metadata = {}) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    const timestamp = new Date().toISOString();
    const metaString = JSON.stringify(metadata);

    await db.run(
      `INSERT INTO tracking_events (contract_id, event_type, ip_address, user_agent, referrer, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [contractId, eventType, ip, userAgent, referrer, metaString, timestamp]
    );
  } catch (error) {
    console.error('Error logging event:', error);
    // Non-fatal error, shouldn't crash the app
  }
}

/**
 * Get analytics for a specific contract
 * @param {Object} db - The database instance
 * @param {string} contractId - The contract ID
 * @returns {Promise<Object>}
 */
async function getContractAnalytics(db, contractId) {
  try {
    const events = await db.all(`SELECT * FROM tracking_events WHERE contract_id = ? ORDER BY created_at DESC`, [contractId]);

    let totalOpens = 0;
    const uniqueIps = new Set();
    let firstOpened = null;
    let lastOpened = null;

    events.forEach(event => {
      if (event.event_type === 'opened') {
        totalOpens++;
        uniqueIps.add(event.ip_address);
        if (!firstOpened || new Date(event.created_at) < new Date(firstOpened)) {
          firstOpened = event.created_at;
        }
        if (!lastOpened || new Date(event.created_at) > new Date(lastOpened)) {
          lastOpened = event.created_at;
        }
      }
    });

    // Simple time spent aggregation logic (if time_tracking events exist)
    const timeRow = await db.get(`SELECT SUM(seconds) as total FROM time_tracking WHERE contract_id = ?`, [contractId]);
    const totalTimeSpent = timeRow ? (timeRow.total || 0) : 0;

    return {
      totalOpens,
      uniqueIps: uniqueIps.size,
      firstOpened,
      lastOpened,
      totalTimeSpent,
      events
    };
  } catch (error) {
    console.error('Error getting contract analytics:', error);
    throw error;
  }
}

/**
 * Get aggregate dashboard statistics
 * @param {Object} db - The database instance
 * @returns {Promise<Object>}
 */
async function getDashboardStats(db) {
  try {
    let stats = {
      totalSent: 0,
      totalSigned: 0,
      conversionRate: 0,
      averageTimeSpent: 0
    };

    // Get total sent and signed
    const sentRow = await db.get(`SELECT COUNT(*) as count FROM tracking_events WHERE event_type = 'sent'`);
    if (sentRow) stats.totalSent = sentRow.count;

    const signedRow = await db.get(`SELECT COUNT(*) as count FROM tracking_events WHERE event_type = 'signed'`);
    if (signedRow) stats.totalSigned = signedRow.count;

    if (stats.totalSent > 0) {
      stats.conversionRate = ((stats.totalSigned / stats.totalSent) * 100).toFixed(2);
    }

    // Get average time spent
    const timeRow = await db.get(`SELECT AVG(seconds) as avg FROM time_tracking`);
    if (timeRow) {
      stats.averageTimeSpent = (timeRow.avg || 0).toFixed(2);
    }

    return stats;
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}

/**
 * Update time tracked for a contract
 * @param {Object} db - Database instance
 * @param {Function} saveDb - Function to persist DB
 * @param {string} contractId - Contract ID
 * @param {number} seconds - Seconds to add
 * @returns {Promise<void>}
 */
async function updateTimeOnPage(db, saveDb, contractId, seconds) {
  try {
    await db.run(
      `INSERT INTO time_tracking (contract_id, seconds, recorded_at) VALUES (?, ?, ?)`,
      [contractId, seconds, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Error updating time on page:', error);
  }
}

module.exports = {
  logEvent,
  getContractAnalytics,
  getDashboardStats,
  updateTimeOnPage
};
