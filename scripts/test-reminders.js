const { getDb } = require('../config/database');
const { checkAndSendReminders } = require('../services/reminderService');
const Contract = require('../models/Contract');
const crypto = require('crypto');

async function testReminders() {
  console.log('--- TEST: Forcing Reminders ---');
  try {
    const db = await getDb();
    
    // Create a mock contract for testing
    const mockUuid = crypto.randomUUID();
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    console.log('Inserting a dummy contract sent 4 days ago...');
    
    db.run(`
      INSERT INTO contracts (uuid, status, sent_at, client_email, reminder_count)
      VALUES (?, 'sent', ?, 'testclient@example.com', 0)
    `, [mockUuid, fourDaysAgo.toISOString()]);

    console.log('Force enabling reminders setting in DB...');
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('reminders_enabled', 'true')`);

    console.log('Running Reminder Service with mocked email sender...');
    
    // Mock the emailService to prevent real SMTP failures
    const emailService = require('../services/emailService');
    emailService.sendReminderEmail = async () => ({ success: true, messageId: 'mock-id' });
    
    await checkAndSendReminders();

    console.log('Checking database to see if reminder count was updated...');
    const stmt = db.prepare('SELECT reminder_count, last_reminder_at FROM contracts WHERE uuid = ?');
    stmt.bind([mockUuid]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`Result: reminder_count = ${row.reminder_count}, last_reminder_at = ${row.last_reminder_at}`);
      if (row.reminder_count === 1) {
        console.log('✅ TEST PASSED: Reminder count was incremented!');
      } else {
        console.log('❌ TEST FAILED: Reminder count is still 0!');
      }
    }
    stmt.free();

    // Clean up
    db.run('DELETE FROM contracts WHERE uuid = ?', [mockUuid]);
    console.log('Test cleanup complete.');
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

testReminders();
