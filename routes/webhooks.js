const express = require('express');
const router = express.Router();
const Webhook = require('../models/Webhook');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// List webhooks
router.get('/', async (req, res) => {
  try {
    const webhooks = await Webhook.getAll();
    res.render('admin/webhooks/index', { webhooks, title: 'Webhooks' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add webhook form
router.get('/add', (req, res) => {
  res.render('admin/webhooks/add', { title: 'Add Webhook' });
});

// Create webhook
router.post('/add', async (req, res) => {
  try {
    const { url, event_type, is_active } = req.body;
    await Webhook.create({ 
      url, 
      event_type, 
      is_active: is_active === 'on' || is_active === '1' || is_active === 1 ? 1 : 0 
    });
    res.redirect('/admin/webhooks');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Edit webhook form
router.get('/edit/:id', async (req, res) => {
  try {
    const webhook = await Webhook.getById(req.params.id);
    if (!webhook) return res.status(404).send('Not Found');
    res.render('admin/webhooks/edit', { webhook, title: 'Edit Webhook' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update webhook
router.post('/edit/:id', async (req, res) => {
  try {
    const { url, event_type, is_active } = req.body;
    await Webhook.update(req.params.id, { 
      url, 
      event_type, 
      is_active: is_active === 'on' || is_active === '1' || is_active === 1 ? 1 : 0 
    });
    res.redirect('/admin/webhooks');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete webhook
router.post('/delete/:id', async (req, res) => {
  try {
    await Webhook.delete(req.params.id);
    res.redirect('/admin/webhooks');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
