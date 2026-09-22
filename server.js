const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const Category = require('./models/Category');
const { money } = require('./services/helpers');
const { requireAdmin } = require('./middleware/adminAuth');
const { createAdminAuthRouter } = require('./routes/adminAuth');
const { createAdminDashboardRouter } = require('./routes/adminDashboard');
const { createAdminProductsRouter } = require('./routes/adminProducts');
const { createAdminCategoriesRouter } = require('./routes/adminCategories');
const { createAdminOrdersRouter } = require('./routes/adminOrders');
const { createStorefrontRouter } = require('./routes/storefront');

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) throw new Error('SESSION_SECRET must be set to a strong value (16+ characters).');

async function start() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProduction ? '7d' : 0 }));

  app.use(session({
    name: 'glow_lite.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ client: mongoose.connection.getClient(), collectionName: 'sessions', ttl: 60 * 60 * 12 }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 1000 * 60 * 60 * 12 }
  }));

  app.locals.money = money;
  app.locals.currentYear = new Date().getFullYear();
  app.use(async (req, res, next) => {
    try {
      res.locals.currentPath = req.path;
      res.locals.cartCount = 0;
      res.locals.navCategories = await Category.find({}).sort({ name: 1 }).lean();
      next();
    } catch (error) { next(error); }
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
  app.use('/admin/login', authLimiter);
  app.use('/admin/setup', authLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, edition: 'lite' }));
  app.use('/admin', createAdminAuthRouter());
  app.use('/admin', createAdminDashboardRouter(requireAdmin));
  app.use('/admin', createAdminProductsRouter(requireAdmin));
  app.use('/admin', createAdminCategoriesRouter(requireAdmin));
  app.use('/admin', createAdminOrdersRouter(requireAdmin));
  app.use(createStorefrontRouter());

  app.use((req, res) => res.status(404).render('store/not-found', { title: 'Page Not Found', metaDescription: '' }));
  app.use((error, req, res, _next) => {
    console.error(error);
    if (error instanceof multer.MulterError || /image/i.test(error.message || '')) {
      return res.status(400).send(error.message || 'Image upload failed.');
    }
    res.status(error.statusCode || 500).render('store/error', {
      title: 'Something Went Wrong', metaDescription: '',
      message: error.expose ? error.message : 'The request could not be completed.'
    });
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Glow Beauty CMS Lite → http://localhost:${port}`));
}

start().catch(error => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
