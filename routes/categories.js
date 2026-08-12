const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /admin/categories - List categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.render('admin/categories', {
      title: 'Categories',
      currentPath: '/admin/categories',
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading categories');
  }
});

// POST /admin/categories - Create category
router.post('/', async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    await Category.create({ name, color, icon });
    await AuditLog.create(req.admin.id, 'Created', 'Category', name, 'Category created', req.ip);
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating category');
  }
});

// PUT /admin/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    await Category.update(req.params.id, { name, color, icon });
    await AuditLog.create(req.admin.id, 'Updated', 'Category', name, 'Category updated', req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
});

// DELETE /admin/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    await Category.delete(req.params.id);
    await AuditLog.create(req.admin.id, 'Deleted', 'Category', req.params.id, 'Category deleted', req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

module.exports = router;
