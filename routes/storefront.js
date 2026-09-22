const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { orderNumber } = require('../services/helpers');

function cleanQty(value) {
  const qty = Number(value);
  return Number.isInteger(qty) && qty > 0 && qty <= 99 ? qty : 0;
}

function createStorefrontRouter() {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const products = await Product.find({ isActive: true }).populate('category').sort({ createdAt: -1 }).limit(8).lean();
      res.render('store/home', {
        title: 'Glow Beauty — Simple Beauty Store',
        metaDescription: 'Shop beauty products from Glow Beauty.',
        products
      });
    } catch (error) { next(error); }
  });

  router.get('/products', async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim().slice(0, 120);
      const categorySlug = String(req.query.category || '').trim().toLowerCase();
      const filter = { isActive: true };
      if (q) filter.$or = [
        { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { description: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      ];
      let selectedCategory = null;
      if (categorySlug) {
        selectedCategory = await Category.findOne({ slug: categorySlug }).lean();
        if (selectedCategory) filter.category = selectedCategory._id;
      }
      const products = await Product.find(filter).populate('category').sort({ createdAt: -1 }).lean();
      res.render('store/products', {
        title: 'Shop — Glow Beauty',
        metaDescription: 'Browse Glow Beauty products.',
        products, q, selectedCategory
      });
    } catch (error) { next(error); }
  });

  router.get('/products/:slug', async (req, res, next) => {
    try {
      const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category').lean();
      if (!product) return res.status(404).render('store/not-found', { title: 'Product Not Found', metaDescription: '' });
      res.render('store/product-detail', {
        title: `${product.name} — Glow Beauty`,
        metaDescription: String(product.description || product.name).slice(0, 155),
        product
      });
    } catch (error) { next(error); }
  });

  router.get('/cart', (req, res) => res.render('store/cart', { title: 'Cart — Glow Beauty', metaDescription: '' }));
  router.get('/checkout', (req, res) => res.render('store/checkout', { title: 'Checkout — Glow Beauty', metaDescription: '', error: '' }));

  router.post('/checkout', async (req, res, next) => {
    const decremented = [];
    try {
      const customerName = String(req.body.customerName || '').trim();
      const phone = String(req.body.phone || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const address = String(req.body.address || '').trim();
      const city = String(req.body.city || '').trim();
      const notes = String(req.body.notes || '').trim();
      const paymentMethod = req.body.paymentMethod === 'manual' ? 'manual' : 'cod';
      if (!customerName || !phone || !address || !city) {
        return res.status(400).render('store/checkout', { title: 'Checkout — Glow Beauty', metaDescription: '', error: 'Name, phone, address and city are required.' });
      }

      let cart;
      try { cart = JSON.parse(String(req.body.cart || '[]')); } catch { cart = []; }
      if (!Array.isArray(cart) || !cart.length || cart.length > 25) {
        return res.status(400).render('store/checkout', { title: 'Checkout — Glow Beauty', metaDescription: '', error: 'Your cart is empty or invalid.' });
      }

      const normalized = new Map();
      for (const row of cart) {
        const id = String(row?.id || '');
        const qty = cleanQty(row?.qty);
        if (!mongoose.isValidObjectId(id) || !qty) continue;
        normalized.set(id, Math.min(99, (normalized.get(id) || 0) + qty));
      }
      if (!normalized.size) return res.status(400).render('store/checkout', { title: 'Checkout — Glow Beauty', metaDescription: '', error: 'Your cart is invalid.' });

      const products = await Product.find({ _id: { $in: [...normalized.keys()] }, isActive: true }).lean();
      if (products.length !== normalized.size) return res.status(400).render('store/checkout', { title: 'Checkout — Glow Beauty', metaDescription: '', error: 'One or more products are no longer available.' });

      const items = [];
      let subtotal = 0;
      for (const product of products) {
        const qty = normalized.get(String(product._id));
        const updated = await Product.findOneAndUpdate(
          { _id: product._id, isActive: true, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true }
        );
        if (!updated) throw Object.assign(new Error(`${product.name} does not have enough stock.`), { statusCode: 409, expose: true });
        decremented.push({ id: product._id, qty });
        const price = Number(product.price || 0);
        subtotal += price * qty;
        items.push({ product: product._id, name: product.name, price, qty, image: product.image });
      }

      const order = await Order.create({
        orderNumber: orderNumber(), customerName, phone, email, address, city, notes,
        items, subtotal, total: subtotal, paymentMethod
      });
      res.redirect(`/order-complete/${encodeURIComponent(order.orderNumber)}`);
    } catch (error) {
      for (const item of decremented) await Product.updateOne({ _id: item.id }, { $inc: { stock: item.qty } }).catch(() => {});
      if (error.expose) {
        return res.status(error.statusCode || 400).render('store/checkout', { title: 'Checkout — Glow Beauty', metaDescription: '', error: error.message });
      }
      next(error);
    }
  });

  router.get('/order-complete/:orderNumber', async (req, res, next) => {
    try {
      const order = await Order.findOne({ orderNumber: req.params.orderNumber }).lean();
      if (!order) return res.status(404).render('store/not-found', { title: 'Order Not Found', metaDescription: '' });
      res.render('store/order-complete', { title: 'Order Placed — Glow Beauty', metaDescription: '', order });
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createStorefrontRouter };
