const InAppNotification = require('../models/InAppNotification');
const Setting = require('../models/Setting');
const Admin = require('../models/Admin');

async function triggerInAppNotification(eventType, contract, message) {
  try {
    const settings = await Setting.getAll();
    
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
    if (!mappedKey) return;

    const link = `/admin/contracts/${contract.id}`;

    // 1. Check if the creator/owner should be notified
    if (settings[`inapp_${mappedKey}`] !== 'false') {
      await InAppNotification.create(contract.admin_id, message, link);
    }

    // 2. Check if others should be notified (if we decide to support inapp_others in future)
    // Currently, settings only have `inapp_signed`, etc. which is global for the admin.
    // If the contract.admin_id is not the current admin, we still send it to the contract owner.
    
  } catch (error) {
    console.error('Error triggering in-app notification:', error);
  }
}

module.exports = { triggerInAppNotification };
