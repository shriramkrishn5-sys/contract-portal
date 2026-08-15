const Admin = require('../models/Admin');
const InAppNotification = require('../models/InAppNotification');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/auth/login');
  }

  try {
    const admin = await Admin.findById(req.session.adminId);
    if (!admin) {
      req.session.destroy();
      return res.redirect('/auth/login');
    }
    req.admin = admin;
    res.locals.admin = admin; // For templates
    
    // Inject notifications globally
    const { notifications, unreadCount } = await InAppNotification.getUnreadForAdmin(admin.id);
    res.locals.inappNotifications = notifications;
    res.locals.inappUnreadCount = unreadCount;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.session.destroy();
    res.redirect('/auth/login');
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      if (req.method === 'GET') {
        return res.status(403).render('error', {
          message: 'Access Denied: You do not have permission to view this page.',
          error: { status: '403 Forbidden' }
        });
      } else {
        return res.status(403).json({ success: false, error: 'Access Denied: Insufficient Permissions' });
      }
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
