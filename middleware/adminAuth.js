const AdminUser = require('../models/AdminUser');

async function requireAdmin(req, res, next) {
  try {
    if (!req.session?.adminId) {
      return res.redirect(`/admin/login?returnTo=${encodeURIComponent(req.originalUrl || '/admin')}`);
    }
    const admin = await AdminUser.findById(req.session.adminId).lean();
    if (!admin) {
      req.session.destroy(() => {});
      return res.redirect('/admin/login');
    }
    res.locals.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAdmin };
