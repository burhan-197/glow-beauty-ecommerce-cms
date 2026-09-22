const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true, maxlength: 180 },
  description: { type: String, default: '', trim: true, maxlength: 5000 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'Stock must be a whole number.' } },
  image: { type: String, default: '/images/placeholder.svg', trim: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProductSchema.pre('save', function () { this.updatedAt = new Date(); });

module.exports = mongoose.model('Product', ProductSchema);
