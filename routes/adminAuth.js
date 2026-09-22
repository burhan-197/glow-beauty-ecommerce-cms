const express = require('express');
const AdminUser = require('../models/AdminUser');
const { hashPassword, verifyPassword } = require('../services/password');
const { safeReturnTo } = require('../services/helpers');

function createAdminAuthRouter() {
  const router = express.Router();

  router.get('/setup', async (req, res, next) => {
    try {
      if (await AdminUser.exists({})) return res.redirect('/admin/login');
      res.render('admin/setup', { title: 'Admin Setup', error: '', setupTokenRequired: Boolean(process.env.ADMIN_SETUP_TOKEN) });
    } catch (error) { next(error); }
  });

  router.post('/setup', async (req, res, next) => {
    try {
      if (await AdminUser.exists({})) return res.redirect('/admin/login');
      const username = String(req.body.username || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const confirmPassword = String(req.body.confirmPassword || '');
      const token = String(req.body.setupToken || '');
      let error = '';
      if (process.env.ADMIN_SETUP_TOKEN && token !== process.env.ADMIN_SETUP_TOKEN) error = 'Invalid setup token.';
      else if (username.length < 3) error = 'Username must be at least 3 characters.';
      else if (password.length < 8) error = 'Password must be at least 8 characters.';
      else if (password !== confirmPassword) error = 'Passwords do not match.';
      if (error) return res.status(400).render('admin/setup', { title: 'Admin Setup', error, setupTokenRequired: Boolean(process.env.ADMIN_SETUP_TOKEN) });

      const admin = await AdminUser.create({ username, passwordHash: await hashPassword(password) });
      req.session.adminId = String(admin._id);
      res.redirect('/admin');
    } catch (error) { next(error); }
  });

  router.get('/login', async (req, res, next) => {
    try {
      if (!await AdminUser.exists({})) return res.redirect('/admin/setup');
      if (req.session?.adminId) return res.redirect('/admin');
      res.render('admin/login', { title: 'Admin Login', error: '', returnTo: safeReturnTo(req.query.returnTo, '/admin') });
    } catch (error) { next(error); }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const username = String(req.body.username || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const admin = await AdminUser.findOne({ username }).select('+passwordHash');
      const valid = admin && await verifyPassword(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).render('admin/login', { title: 'Admin Login', error: 'Invalid username or password.', returnTo: safeReturnTo(req.body.returnTo, '/admin') });
      }
      req.session.regenerate(error => {
        if (error) return next(error);
        req.session.adminId = String(admin._id);
        res.redirect(safeReturnTo(req.body.returnTo, '/admin'));
      });
    } catch (error) { next(error); }
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('glow_lite.sid');
      res.redirect('/admin/login');
    });
  });

  return router;
}

module.exports = { createAdminAuthRouter };
