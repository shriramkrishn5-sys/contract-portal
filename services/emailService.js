const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const Setting = require('../models/Setting');
const Admin = require('../models/Admin');
async function getEmailConfig() {
  const settings = await Setting.getAll();
  const host = settings.smtp_host || process.env.SMTP_HOST || 'mail.kkeyqik.com';
  const port = parseInt(settings.smtp_port || process.env.SMTP_PORT) || 465;
  const secure = port === 465;
  const user = settings.smtp_user || process.env.SMTP_USER;
  const pass = settings.smtp_pass || process.env.SMTP_PASS;
  
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const fromEmail = settings.smtp_from_email || user || 'contracts@kkeyqik.com';
  const companyName = settings.company_name || 'KKeyQik Contracts';

  return { transporter, fromEmail, companyName, settings };
}

/**
 * Send a contract link to the client
 * @param {Object} contract - Contract data
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendContractLink(contract) {
  try {
    const { transporter, fromEmail, companyName, settings } = await getEmailConfig();
    const templatePath = path.join(__dirname, '../views/emails/contract-link.ejs');
    const html = await ejs.renderFile(templatePath, { contract, settings });

    const info = await transporter.sendMail({
      from: `"${companyName}" <${fromEmail}>`,
      to: contract.clientEmail,
      subject: `Action Required: Review & Sign Contract - ${contract.projectName || contract.title}`,
      html: html
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending contract link:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a reminder email to the client
 */
async function sendReminderEmail(contract) {
  try {
    const { transporter, fromEmail, companyName, settings } = await getEmailConfig();
    
    // Build the public link for the client
    const portalUrl = process.env.APP_URL || 'http://localhost:3000';
    contract.linkUrl = `${portalUrl}/contract/${contract.uuid}`;

    const templatePath = path.join(__dirname, '../views/emails/reminder.ejs');
    const html = await ejs.renderFile(templatePath, { contract, settings });

    const info = await transporter.sendMail({
      from: `"${companyName}" <${fromEmail}>`,
      to: contract.clientEmail || contract.client_email,
      subject: `Reminder: Action Required on ${contract.projectName || contract.project_name || 'Contract'}`,
      html
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a signed copy of the contract to the client
 * @param {Object} contract - Contract data
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSignedCopy(contract, pdfBuffer) {
  try {
    const { transporter, fromEmail, companyName, settings } = await getEmailConfig();
    const templatePath = path.join(__dirname, '../views/emails/signed-copy.ejs');
    const html = await ejs.renderFile(templatePath, { contract, settings });

    const info = await transporter.sendMail({
      from: `"${companyName}" <${fromEmail}>`,
      to: contract.clientEmail,
      subject: `Contract Signed: ${contract.projectName || contract.title}`,
      html: html,
      attachments: [
        {
          filename: `Contract_${contract.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending signed copy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to the admin
 * @param {string} eventType - Event type (e.g., 'opened', 'signed')
 * @param {Object} contract - Contract data
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendAdminNotification(eventType, contract) {
  try {
    const { transporter, fromEmail, companyName, settings } = await getEmailConfig();
    
    // Map eventType to setting keys
    const eventKey = eventType.toLowerCase();
    const settingMap = {
      'created': 'created',
      'sent': 'sent',
      'viewed': 'viewed',
      'opened': 'viewed', // normalize
      'signed': 'signed',
      'rejected': 'rejected',
      'cancelled': 'cancelled',
      'expired': 'expired',
      'updated': 'updated'
    };
    
    const mappedKey = settingMap[eventKey];
    if (mappedKey) {
      if (settings[`notify_me_${mappedKey}`] === 'false') {
        console.log(`Admin notification for ${eventType} bypassed (disabled in settings).`);
        return { success: true, bypassed: true };
      }
    }

    const templatePath = path.join(__dirname, '../views/emails/admin-notification.ejs');
    const html = await ejs.renderFile(templatePath, { eventType, contract, settings });

    const adminEmail = process.env.ADMIN_EMAIL || fromEmail;
    
    // Check if notify_others is enabled for this event
    let ccEmails = [];
    if (mappedKey && settings[`notify_others_${mappedKey}`] === 'true') {
      const allAdmins = await Admin.findAll();
      ccEmails = allAdmins
        .map(a => a.email)
        .filter(e => e !== adminEmail && e !== fromEmail);
    }

    // Trigger In-App Notification (new feature)
    const { triggerInAppNotification } = require('./notificationService');
    const message = `Contract ${contract.clientName || contract.client_name || contract.project_name} was ${eventType.toLowerCase()}`;
    triggerInAppNotification(eventType, contract, message).catch(e => console.error(e));

    const info = await transporter.sendMail({
      from: `"${companyName} System" <${fromEmail}>`,
      to: adminEmail,
      cc: ccEmails.length > 0 ? ccEmails.join(',') : undefined,
      subject: `Contract Notification: ${contract.clientName || contract.client_name || contract.project_name} - ${eventType}`,
      html: html
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendContractLink,
  sendReminderEmail,
  sendSignedCopy,
  sendAdminNotification
};
