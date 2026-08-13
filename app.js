require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { getDb } = require('./config/database');
const { checkAndSendReminders } = require('./services/reminderService');
const Setting = require('./models/Setting');

const app = express();

// Trust proxy for rate limiters (required when behind Cloudflare/cPanel Nginx)
app.set('trust proxy', 1);

// Vercel Cron handles reminders, no internal setInterval needed.

// Security and middleware
app.use(helmet({ contentSecurityPolicy: false })); // Allow inline scripts for now
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// Sessions
app.use(session({
  store: new pgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'secret-key-kkeyqik',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

// Make admin and config available to all views
app.use(async (req, res, next) => {
  res.locals.admin = req.session ? req.session.admin : null;
  res.locals.title = 'Contract Portal';
  res.locals.currentPath = req.originalUrl;
  res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
  try {
    res.locals.settings = await Setting.getAll();
  } catch (err) {
    res.locals.settings = {};
  }
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const contractsRoutes = require('./routes/contracts');
const publicRoutes = require('./routes/public');
const clausesRoutes = require('./routes/clauses');
const clientsRoutes = require('./routes/clients');
const teamRoutes = require('./routes/team');
const templatesRoutes = require('./routes/templates');
const webhooksRoutes = require('./routes/webhooks');
const categoriesRoutes = require('./routes/categories');

app.use('/auth', authRoutes);
app.use('/admin/contracts', contractsRoutes);
app.use('/admin/clauses', clausesRoutes);
app.use('/admin/clients', clientsRoutes);
app.use('/admin/team', teamRoutes);
app.use('/admin/templates', templatesRoutes);
app.use('/admin/webhooks', webhooksRoutes);
app.use('/admin/categories', categoriesRoutes);
app.use('/admin', dashboardRoutes);
app.use('/c', publicRoutes);
app.use('/api/internal', require('./routes/internal'));

app.get('/api/cron/reminders', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send('Unauthorized');
  }
  await checkAndSendReminders();
  res.status(200).send('Cron executed');
});

app.get('/', (req, res) => res.redirect('/auth/login'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 3000;

// Init DB then start
getDb().then(() => {
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}).catch(err => {
  console.error('Failed to initialize database', err);
});

module.exports = app; // Export for Vercel Serverless
