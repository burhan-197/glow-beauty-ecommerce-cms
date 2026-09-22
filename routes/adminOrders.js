const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');

const STATUSES = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

function createAdminOrdersRouter(requireAdmin) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/orders', async (req, res, next) => {
    try {
      const filter = STATUSES.has(req.query.status) ? { status: req.query.status } : {};
      const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
      res.render('admin/orders', { title: 'Orders', orders, selectedStatus: req.query.status || 'all' });
    } catch (error) { next(error); }
  });

  router.get('/orders/:id', async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id).lean();
      if (!order) return res.status(404).render('store/not-found', { title: 'Not Found' });
      res.render('admin/order-detail', { title: `Order ${order.orderNumber}`, order });
    } catch (error) { next(error); }
  });

  router.post('/orders/:id/status', async (req, res, next) => {
    try {
      const status = String(req.body.status || '');
      if (!STATUSES.has(status)) return res.status(400).send('Invalid order status.');
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).send('Order not found.');
      if (order.status === 'cancelled' && status !== 'cancelled') return res.status(400).send('Cancelled orders cannot be reopened in Lite edition.');
      if (status === 'cancelled' && order.status !== 'cancelled' && !order.inventoryRestored) {
        for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty } });
        order.inventoryRestored = true;
      }
      order.status = status;
      order.updatedAt = new Date();
      await order.save();
      res.redirect(`/admin/orders/${order._id}`);
    } catch (error) { next(error); }
  });

  return router;
}
module.exports = { createAdminOrdersRouter };
