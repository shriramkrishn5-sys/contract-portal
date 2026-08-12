const express = require('express');
const router = express.Router();
const Clause = require('../models/Clause');
const AuditLog = require('../models/AuditLog');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /admin/clauses - List all clauses
router.get('/', async (req, res) => {
  try {
    const clauses = await Clause.findAll();
    res.render('admin/clauses', {
      title: 'Clause Library',
      currentPath: '/admin/clauses',
      clauses
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading clauses');
  }
});

// POST /admin/clauses - Create a new clause
router.post('/', async (req, res) => {
  try {
    const newClauseId = await Clause.create(req.body);
    await AuditLog.create(req.admin.id, 'Created', 'Clause', req.body.title, 'New standard clause created', req.ip);
    res.json({ success: true, message: 'Clause created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creating clause' });
  }
});

// PUT /admin/clauses/:id - Update a clause
router.put('/:id', async (req, res) => {
  try {
    await Clause.update(req.params.id, req.body);
    await AuditLog.create(req.admin.id, 'Updated', 'Clause', req.body.title || req.params.id, 'Clause updated', req.ip);
    res.json({ success: true, message: 'Clause updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating clause' });
  }
});

// DELETE /admin/clauses/:id - Delete a clause
router.delete('/:id', async (req, res) => {
  try {
    await Clause.delete(req.params.id);
    await AuditLog.create(req.admin.id, 'Deleted', 'Clause', `Clause #${req.params.id}`, 'Clause deleted from library', req.ip);
    res.json({ success: true, message: 'Clause deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error deleting clause' });
  }
});

module.exports = router;
