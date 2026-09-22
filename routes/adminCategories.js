const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { slugify } = require('../services/helpers');

function createAdminCategoriesRouter(requireAdmin) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/categories', async (req, res, next) => {
    try {
      const categories = await Category.find({}).sort({ name: 1 }).lean();
      const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
      const countMap = Object.fromEntries(counts.map(row => [String(row._id), row.count]));
      res.render('admin/categories', { title: 'Categories', categories, countMap, error: String(req.query.error || '') });
    } catch (error) { next(error); }
  });

  router.post('/categories', async (req, res, next) => {
    try {
      const name = String(req.body.name || '').trim();
      const slug = slugify(req.body.slug || name);
      if (!name || !slug) return res.redirect('/admin/categories?error=' + encodeURIComponent('Category name is required.'));
      if (await Category.exists({ slug })) return res.redirect('/admin/categories?error=' + encodeURIComponent('That category already exists.'));
      await Category.create({ name, slug });
      res.redirect('/admin/categories');
    } catch (error) { next(error); }
  });

  router.post('/categories/:id', async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.redirect('/admin/categories');
      const name = String(req.body.name || '').trim();
      const slug = slugify(req.body.slug || name);
      if (!name || !slug) return res.redirect('/admin/categories?error=' + encodeURIComponent('Category name is required.'));
      const duplicate = await Category.exists({ slug, _id: { $ne: category._id } });
      if (duplicate) return res.redirect('/admin/categories?error=' + encodeURIComponent('That category slug already exists.'));
      category.name = name;
      category.slug = slug;
      await category.save();
      res.redirect('/admin/categories');
    } catch (error) { next(error); }
  });

  router.post('/categories/:id/delete', async (req, res, next) => {
    try {
      const productCount = await Product.countDocuments({ category: req.params.id });
      if (productCount) return res.redirect('/admin/categories?error=' + encodeURIComponent('Move or delete products in this category first.'));
      await Category.findByIdAndDelete(req.params.id);
      res.redirect('/admin/categories');
    } catch (error) { next(error); }
  });

  return router;
}
module.exports = { createAdminCategoriesRouter };
