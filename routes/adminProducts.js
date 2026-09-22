const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify } = require('../services/helpers');
const { upload, publicPathFor, removeLocalImage } = require('../services/imageUpload');

function parseProduct(body) {
  return {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || '').trim(),
    price: Number(body.price),
    stock: Number(body.stock),
    isActive: body.isActive === 'on' || body.isActive === 'true'
  };
}

function validate(data) {
  if (!data.name) return 'Product name is required.';
  if (!data.category) return 'Category is required.';
  if (!Number.isFinite(data.price) || data.price < 0) return 'Enter a valid price.';
  if (!Number.isInteger(data.stock) || data.stock < 0) return 'Stock must be a non-negative whole number.';
  return '';
}

function createAdminProductsRouter(requireAdmin) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/products', async (req, res, next) => {
    try {
      const products = await Product.find({}).populate('category').sort({ createdAt: -1 }).lean();
      res.render('admin/products', { title: 'Products', products });
    } catch (error) { next(error); }
  });

  router.get('/products/new', async (req, res, next) => {
    try {
      const categories = await Category.find({}).sort({ name: 1 }).lean();
      res.render('admin/product-form', { title: 'Add Product', product: null, categories, error: '' });
    } catch (error) { next(error); }
  });

  router.post('/products', upload.single('image'), async (req, res, next) => {
    try {
      const data = parseProduct(req.body);
      const categories = await Category.find({}).sort({ name: 1 }).lean();
      const error = validate(data);
      if (error) {
        if (req.file) removeLocalImage(publicPathFor(req.file));
        return res.status(400).render('admin/product-form', { title: 'Add Product', product: data, categories, error });
      }
      if (!await Category.exists({ _id: data.category })) {
        if (req.file) removeLocalImage(publicPathFor(req.file));
        return res.status(400).render('admin/product-form', { title: 'Add Product', product: data, categories, error: 'Selected category does not exist.' });
      }
      let slug = slugify(data.name) || `product-${Date.now()}`;
      let suffix = 2;
      while (await Product.exists({ slug })) slug = `${slugify(data.name)}-${suffix++}`;
      await Product.create({ ...data, slug, image: publicPathFor(req.file) || '/images/placeholder.svg' });
      res.redirect('/admin/products');
    } catch (error) {
      if (req.file) removeLocalImage(publicPathFor(req.file));
      next(error);
    }
  });

  router.get('/products/:id/edit', async (req, res, next) => {
    try {
      const [product, categories] = await Promise.all([Product.findById(req.params.id).lean(), Category.find({}).sort({ name: 1 }).lean()]);
      if (!product) return res.status(404).render('store/not-found', { title: 'Not Found' });
      res.render('admin/product-form', { title: 'Edit Product', product, categories, error: '' });
    } catch (error) { next(error); }
  });

  router.post('/products/:id', upload.single('image'), async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).render('store/not-found', { title: 'Not Found' });
      const data = parseProduct(req.body);
      const categories = await Category.find({}).sort({ name: 1 }).lean();
      const validationError = validate(data);
      if (validationError) {
        if (req.file) removeLocalImage(publicPathFor(req.file));
        return res.status(400).render('admin/product-form', { title: 'Edit Product', product: { ...product.toObject(), ...data }, categories, error: validationError });
      }
      if (!await Category.exists({ _id: data.category })) {
        if (req.file) removeLocalImage(publicPathFor(req.file));
        return res.status(400).render('admin/product-form', { title: 'Edit Product', product: { ...product.toObject(), ...data }, categories, error: 'Selected category does not exist.' });
      }
      const oldImage = product.image;
      Object.assign(product, data);
      if (req.file) product.image = publicPathFor(req.file);
      await product.save();
      if (req.file) removeLocalImage(oldImage);
      res.redirect('/admin/products');
    } catch (error) {
      if (req.file) removeLocalImage(publicPathFor(req.file));
      next(error);
    }
  });

  router.post('/products/:id/delete', async (req, res, next) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (product) removeLocalImage(product.image);
      res.redirect('/admin/products');
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createAdminProductsRouter };
