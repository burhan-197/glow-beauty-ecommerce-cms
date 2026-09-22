const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { slugify, orderNumber, safeReturnTo } = require('../services/helpers');

const root = path.join(__dirname, '..');

test('slugify creates basic URL slugs', () => {
  assert.equal(slugify('Glow Serum 50 ML'), 'glow-serum-50-ml');
});

test('order numbers are prefixed and unique-looking', () => {
  const value = orderNumber();
  assert.match(value, /^GL-[A-Z0-9]+-[A-F0-9]{4}$/);
});

test('unsafe return URLs are rejected', () => {
  assert.equal(safeReturnTo('//evil.example'), '/admin');
  assert.equal(safeReturnTo('/admin/products'), '/admin/products');
});

test('premium modules are absent from Lite source tree', () => {
  const forbidden = [
    'models/Customer.js', 'models/Coupon.js', 'models/BlogPost.js', 'models/RoutineBundle.js',
    'services/cloudinary.js', 'routes/customerAccount.js', 'routes/adminBackups.js',
    'routes/adminBlog.js', 'routes/adminCoupons.js', 'routes/adminRoutines.js', 'routes/adminSettings.js'
  ];
  for (const relative of forbidden) assert.equal(fs.existsSync(path.join(root, relative)), false, relative);
});
