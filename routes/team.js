const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Contract = require('../models/Contract');
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
    
    // Check if email already exists (including soft-deleted)
    const db = await require('../config/database').getDb();
    const existingUser = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
    
    if (existingUser) {
      if (existingUser.deleted_at === null) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      } else {
        // User was soft-deleted, restore them
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(password, 10);
        await db.run(
          'UPDATE admins SET name = ?, password_hash = ?, role = ?, deleted_at = NULL WHERE email = ?',
          [name, hash, role, email]
        );
        await AuditLog.create(req.admin.id, 'Created', 'User', name, `Restored and added ${name} as ${role}`, req.ip);
        return res.json({ success: true, message: 'User added successfully' });
      }
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
    const { reassign_to_admin_id } = req.body;

    if (!reassign_to_admin_id) {
      return res.status(400).json({ success: false, message: 'reassign_to_admin_id is required' });
    }

    if (parseInt(userId) === req.admin.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    if (parseInt(userId) === parseInt(reassign_to_admin_id)) {
      return res.status(400).json({ success: false, message: 'Cannot reassign contracts to the admin being deleted' });
    }

    const userToDelete = await Admin.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'User not found or already deleted' });
    }

    if (userToDelete.role === 'superadmin') {
      const activeAdmins = await Admin.findAll();
      const activeSuperadmins = activeAdmins.filter(a => a.role === 'superadmin');
      if (activeSuperadmins.length <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last active superadmin' });
      }
    }

    const targetAdmin = await Admin.findById(reassign_to_admin_id);
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Target admin for reassignment not found or inactive' });
    }

    const reassignedCount = await Admin.deleteAndReassign(userId, reassign_to_admin_id);
    
    await AuditLog.create(
      req.admin.id,
      'Admin Reassigned & Deactivated',
      'User',
      userToDelete.name,
      `Deleted user ${userToDelete.name} (${userToDelete.email}) and reassigned ${reassignedCount} contracts to ${targetAdmin.name}`,
      req.ip
    );

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

module.exports = router;
