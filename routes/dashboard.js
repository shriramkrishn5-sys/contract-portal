const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Setting = require('../models/Setting');
const AuditLog = require('../models/AuditLog');
const Admin = require('../models/Admin');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const allContracts = await Contract.findAll();
    
    let total = allContracts.length;
    let active = 0;
    let completed = 0;
    let expiringSoon = 0;
    let declined = 0;
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    let upcomingExpirations = [];

    allContracts.forEach(c => {
      if (c.status === 'signed' || c.status === 'active') active++;
      if (c.status === 'completed') completed++;
      if (c.status === 'declined') declined++;
      
      const createdAt = new Date(c.created_at);
      const expiryDate = new Date(createdAt.getTime());
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      if (expiryDate > now && expiryDate <= thirtyDaysFromNow) {
        expiringSoon++;
        c.expires_at_calculated = expiryDate;
        upcomingExpirations.push(c);
      }
    });

    // Sort by expiration date ascending
    upcomingExpirations.sort((a, b) => a.expires_at_calculated - b.expires_at_calculated);
    upcomingExpirations = upcomingExpirations.slice(0, 5);

    const stats = { total, active, completed, expiringSoon, declined };
    const recentContracts = await Contract.getRecent(5);
    
    res.render('admin/dashboard', { 
      stats, 
      contracts: recentContracts, 
      upcomingExpirations, 
      title: 'Dashboard' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading dashboard');
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.render('admin/settings', {
      title: 'Settings',
      currentPath: '/admin/settings',
      settings
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading settings');
  }
});

router.post('/settings', async (req, res) => {
  try {
    // req.body now dynamically contains all fields submitted from any form on the settings page.
    await Setting.updateAll(req.body);
    
    await AuditLog.create(req.admin.id, 'Updated', 'Settings', 'Global Settings', 'Company settings updated', req.ip);

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error saving settings' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.render('admin/notifications', {
      title: 'Notifications',
      currentPath: '/admin/notifications',
      settings
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading notifications');
  }
});

router.post('/notifications', async (req, res) => {
  try {
    await Setting.updateAll(req.body);
    await AuditLog.create(req.admin.id, 'Updated', 'Settings', 'Notifications', 'Notification preferences updated', req.ip);
    res.json({ success: true, message: 'Notifications saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error saving notifications' });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      q: req.query.q || '',
      action: req.query.action || '',
      type: req.query.type || '',
      admin_id: req.query.user || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      limit,
      offset
    };

    const rawLogs = await AuditLog.findAll(filters);
    const totalLogs = await AuditLog.countAll(filters);
    const totalPages = Math.ceil(totalLogs / limit);
    const admins = await Admin.findAll();
    
    const logs = rawLogs.map(log => {
      const d = new Date(log.created_at);
      const timeStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}\n${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      const adminName = log.admin_name || (log.admin_id ? 'Deleted User' : 'System');
      const initials = adminName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      let actionColor = 'blue';
      if (log.action === 'Created') actionColor = 'green';
      else if (log.action === 'Deleted' || log.action === 'Cancelled') actionColor = 'orange';
      else if (log.action === 'Sent') actionColor = 'purple';
      else if (log.action === 'Viewed') actionColor = 'yellow';

      return {
        time: timeStr,
        user: { name: adminName, email: log.admin_email || '', avatar: initials },
        action: log.action,
        actionColor: actionColor,
        type: log.type,
        id: log.entity_id || '-',
        details: log.details || '-',
        ip: log.ip_address || '-'
      };
    });

    res.render('admin/audit-logs', {
      title: 'Audit Logs',
      currentPath: '/admin/audit-logs',
      logs,
      admins,
      filters,
      pagination: { page, limit, totalPages, totalLogs }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading audit logs');
  }
});

router.get('/audit-logs/export', async (req, res) => {
  try {
    const filters = {
      q: req.query.q || '',
      action: req.query.action || '',
      type: req.query.type || '',
      admin_id: req.query.user || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      limit: null // Fetch all matching
    };

    const rawLogs = await AuditLog.findAll(filters);
    
    let csv = 'Date,Time,User,Email,Action,Entity Type,Entity ID,Details,IP Address\n';
    rawLogs.forEach(log => {
      const d = new Date(log.created_at);
      const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
      const adminName = (log.admin_name || 'System').replace(/"/g, '""');
      const email = (log.admin_email || '').replace(/"/g, '""');
      const details = (log.details || '').replace(/"/g, '""');
      const entityId = (log.entity_id || '').replace(/"/g, '""');

      csv += `"${dateStr}","${timeStr}","${adminName}","${email}","${log.action}","${log.type}","${entityId}","${details}","${log.ip_address}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=\"audit-logs.csv\"');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error exporting audit logs');
  }
});

router.post('/notifications/read', async (req, res) => {
  try {
    const InAppNotification = require('../models/InAppNotification');
    if (req.body.id) {
      await InAppNotification.markAsRead(req.body.id, req.admin.id);
    } else {
      await InAppNotification.markAllAsRead(req.admin.id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

module.exports = router;
