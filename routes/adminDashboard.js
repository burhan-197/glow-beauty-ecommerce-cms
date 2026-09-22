const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');

function createAdminDashboardRouter(requireAdmin) {
  const router = express.Router();
  router.get('/', requireAdmin, async (req, res, next) => {
    try {
      const [products, categories, orders, pending, lowStock] = await Promise.all([
        Product.countDocuments(), Category.countDocuments(), Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }), Product.countDocuments({ stock: { $lte: 5 }, isActive: true })
      ]);
      const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(6).lean();
      res.render('admin/dashboard', { title: 'Dashboard', stats: { products, categories, orders, pending, lowStock }, recentOrders });
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createAdminDashboardRouter };
