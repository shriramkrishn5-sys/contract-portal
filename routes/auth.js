const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Setting = require('../models/Setting');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

router.get('/login', async (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  try {
    const settings = await Setting.getAll();
    res.render('auth/login', { layout: false, error: null, title: 'Login', settings });
  } catch (error) {
    res.render('auth/login', { layout: false, error: null, title: 'Login', settings: {} });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findByEmail(email);
    if (admin && await Admin.verifyPassword(password, admin.password_hash)) {
      req.session.adminId = admin.id;
      return res.redirect('/admin');
    }
    const settings = await Setting.getAll();
    res.render('auth/login', { layout: false, error: 'Invalid credentials', title: 'Login', settings });
  } catch (error) {
    console.error(error);
    const settings = await Setting.getAll().catch(() => ({}));
    res.render('auth/login', { layout: false, error: 'Server error', title: 'Login', settings });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
