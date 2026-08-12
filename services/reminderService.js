const cron = require('node-cron');
const { getDb } = require('../config/database');
const Setting = require('../models/Setting');
const { sendReminderEmail } = require('./emailService');
const AuditLog = require('../models/AuditLog');

async function checkAndSendReminders() {
  console.log('[ReminderService] Running scheduled reminder check...');
  try {
    const settings = await Setting.getAll();
    
    if (settings.reminders_enabled !== 'true') {
      console.log('[ReminderService] Reminders are disabled in settings. Skipping.');
      return;
    }

    const firstDays = parseInt(settings.reminder_first_days) || 3;
    const intervalDays = parseInt(settings.reminder_interval_days) || 2;
    const maxCount = parseInt(settings.reminder_max_count) || 3;

    const db = await getDb();
    
    // Get all contracts that are currently 'sent'
    const contracts = await db.all("SELECT * FROM contracts WHERE status = 'sent'");

    const now = new Date();
    let sentCount = 0;

    for (const contract of contracts) {
      const sentAt = new Date(contract.sent_at);
      const reminderCount = contract.reminder_count || 0;
      const lastReminderAt = contract.last_reminder_at ? new Date(contract.last_reminder_at) : null;

      if (reminderCount >= maxCount) {
        continue; // Reached max limit
      }

      let shouldSend = false;

      if (reminderCount === 0) {
        // First reminder
        const daysSinceSent = (now - sentAt) / (1000 * 60 * 60 * 24);
        if (daysSinceSent >= firstDays) {
          shouldSend = true;
        }
      } else {
        // Subsequent reminders
        if (lastReminderAt) {
          const daysSinceLast = (now - lastReminderAt) / (1000 * 60 * 60 * 24);
          if (daysSinceLast >= intervalDays) {
            shouldSend = true;
          }
        }
      }

      if (shouldSend) {
        console.log(`[ReminderService] Sending reminder ${reminderCount + 1} for contract ${contract.uuid}`);
        
        // Send email
        const emailResult = await sendReminderEmail(contract);
        
        if (emailResult.success) {
          const newNow = new Date().toISOString();
          
          // Update database
          await db.run(
            `UPDATE contracts SET reminder_count = reminder_count + 1, last_reminder_at = ? WHERE id = ?`,
            [newNow, contract.id]
          );
          
          // Log to audit log
          await AuditLog.create(
            contract.admin_id,
            'Reminder Sent',
            'Contract',
            contract.uuid,
            `Sent automated reminder #${reminderCount + 1} to ${contract.client_email || contract.clientEmail}`,
            'system'
          );
          
          sentCount++;
        }
      }
    }
    
    if (sentCount > 0) {
      console.log(`[ReminderService] Successfully sent ${sentCount} reminders.`);
    } else {
      console.log('[ReminderService] No reminders needed at this time.');
    }

  } catch (err) {
    console.error('[ReminderService] Error during reminder check:', err);
  }
}

// Start the cron job
function initReminderService() {
  // Run every day at 09:00 AM server time (adjust expression as needed)
  // '0 9 * * *' = 9 AM daily
  cron.schedule('0 9 * * *', () => {
    checkAndSendReminders();
  });
  console.log('[ReminderService] Scheduled background worker initialized (Daily at 9:00 AM).');
}

module.exports = {
  initReminderService,
  checkAndSendReminders // Exported for manual trigger testing
};
