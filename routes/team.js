const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET /admin/team - View Team (Restricted to superadmin and manager)
router.get('/', requireRole(['superadmin', 'manager']), async (req, res) => {
  try {
    const team = await Admin.findAll();
    res.render('admin/team', {
      title: 'Users & Roles',
      currentPath: '/admin/team',
      team,
      currentUser: req.admin
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading team');
  }
});

// POST /admin/team - Add new user (Restricted to superadmin)
router.post('/', requireRole(['superadmin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if email already exists
    const existingUser = await Admin.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    await Admin.create(name, email, password, role);
    await AuditLog.create(req.admin.id, 'Created', 'User', name, `Added ${name} as ${role}`, req.ip);

    res.json({ success: true, message: 'User added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding user' });
  }
});

// PUT /admin/team/:id - Edit user (Restricted to superadmin)
router.put('/:id', requireRole(['superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role, password } = req.body;

    const existingUser = await Admin.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const emailUser = await Admin.findByEmail(email);
      if (emailUser && emailUser.id != userId) {
        return res.status(400).json({ success: false, message: 'Email already in use by another user' });
      }
    }

    const updatedUser = await Admin.update(userId, {
      name: name || existingUser.name,
      email: email || existingUser.email,
      role: role || existingUser.role,
      password
    });

    await AuditLog.create(
      req.admin.id,
      'Updated',
      'User',
      updatedUser.name,
      `Updated user ${updatedUser.name} (${updatedUser.role})`,
      req.ip
    );

    res.json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// DELETE /admin/team/:id - Delete user (Restricted to superadmin)
router.delete('/:id', requireRole(['superadmin']), async (req, res) => {
  try {
    const userId = req.params.id;

    if (parseInt(userId) === req.admin.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const userToDelete = await Admin.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Admin.delete(userId);
    await AuditLog.create(
      req.admin.id,
      'Deleted',
      'User',
      userToDelete.name,
      `Deleted user ${userToDelete.name} (${userToDelete.email})`,
      req.ip
    );

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

module.exports = router;
