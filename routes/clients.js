const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /admin/clients - List all clients (CRM)
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'active';
    let clients = status === 'removed' ? await Client.findDeleted() : await Client.findAll();
    
    res.render('admin/clients', {
      title: 'Client Directory',
      currentPath: '/admin/clients',
      status,
      clients
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading clients directory');
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await Client.delete(req.params.id);
    await AuditLog.create(req.admin.id, 'Client Soft Deleted', 'Client', req.params.id, 'Client soft deleted', req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    await Client.restore(req.params.id);
    await AuditLog.create(req.admin.id, 'Client Restored', 'Client', req.params.id, 'Client restored from soft delete', req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
