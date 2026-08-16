// Vercel Cron handles scheduling, node-cron is removed
const { getDb } = require('../config/database');
const Setting = require('../models/Setting');
const { sendReminderEmail } = require('./emailService');
const AuditLog = require('../models/AuditLog');

async function checkAndSendReminders() {
  console.log('[ReminderService] Running scheduled reminder and expiration check...');
  try {
    const db = await getDb();
    const settings = await Setting.getAll();
    const now = new Date();
    
    // Get all in-flight contracts
    const contracts = await db.all("SELECT * FROM contracts WHERE status IN ('sent', 'opened', 'filled')");
    
    let expiredCount = 0;
    let reminderCountTotal = 0;
    let urgentCount = 0;

    for (const contract of contracts) {
      const expiresAt = contract.expires_at ? new Date(contract.expires_at) : null;
      
      // Sweep 1: Mark as Expired
      if (expiresAt && expiresAt < now) {
        console.log(`[ReminderService] Contract ${contract.uuid} has expired.`);
        await db.run("UPDATE contracts SET status = 'expired' WHERE id = ?", [contract.id]);
        await AuditLog.create(contract.admin_id, 'Expired', 'Contract', contract.uuid, `Contract automatically expired`, 'system');
        expiredCount++;
        continue;
      }
      
      // If we made it here, contract is not expired.
      if (settings.reminders_enabled !== 'true') continue;

      const sentAt = new Date(contract.sent_at);
      const reminderCount = contract.reminder_count || 0;
      const lastReminderAt = contract.last_reminder_at ? new Date(contract.last_reminder_at) : null;

      // Sweep 2: Urgent 24-hour reminder
      const urgentSent = contract.urgent_reminder_sent === 1 || contract.urgent_reminder_sent === true;
      if (expiresAt && !urgentSent) {
        const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
        if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 24) {
          console.log(`[ReminderService] Sending URGENT 24h reminder for contract ${contract.uuid}`);
          
          const emailResult = await sendReminderEmail(contract, 'urgent');
          
          if (emailResult.success) {
            await db.run("UPDATE contracts SET urgent_reminder_sent = ? WHERE id = ?", [true, contract.id]);
            await AuditLog.create(contract.admin_id, 'Reminder Sent', 'Contract', contract.uuid, `Sent URGENT 24h reminder to ${contract.client_email}`, 'system');
            urgentCount++;
          }
          continue; // Don't send normal reminder
        }
      }

      // Sweep 3: Normal Reminders
      const firstDays = parseInt(settings.reminder_first_days) || 3;
      const intervalDays = parseInt(settings.reminder_interval_days) || 2;
      const maxCount = parseInt(settings.reminder_max_count) || 3;

      if (reminderCount >= maxCount) continue;

      let shouldSend = false;
      if (reminderCount === 0) {
        const daysSinceSent = (now - sentAt) / (1000 * 60 * 60 * 24);
        if (daysSinceSent >= firstDays) shouldSend = true;
      } else if (reminderCount < maxCount) {
        if (lastReminderAt) {
          const daysSinceLast = (now - lastReminderAt) / (1000 * 60 * 60 * 24);
          if (daysSinceLast >= intervalDays) shouldSend = true;
        }
      }

      if (shouldSend) {
        console.log(`[ReminderService] Sending reminder ${reminderCount + 1} for contract ${contract.uuid}`);
        const emailResult = await sendReminderEmail(contract);
        
        if (emailResult.success) {
          await db.run("UPDATE contracts SET reminder_count = reminder_count + 1, last_reminder_at = ? WHERE id = ?", [now.toISOString(), contract.id]);
          await AuditLog.create(contract.admin_id, 'Reminder Sent', 'Contract', contract.uuid, `Sent automated reminder #${reminderCount + 1} to ${contract.client_email}`, 'system');
          reminderCountTotal++;
        }
      }
    }
    
    console.log(`[ReminderService] Done. Expired: ${expiredCount}. Urgent Reminders: ${urgentCount}. Normal Reminders: ${reminderCountTotal}.`);
  } catch (err) {
    console.error('[ReminderService] Error during reminder check:', err);
  }
}

module.exports = {
  checkAndSendReminders
};
