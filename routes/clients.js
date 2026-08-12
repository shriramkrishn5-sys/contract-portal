const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /admin/clients - List all clients (CRM)
router.get('/', async (req, res) => {
  try {
    const clients = await Client.findAll();
    res.render('admin/clients', {
      title: 'Client Directory',
      currentPath: '/admin/clients',
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
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
