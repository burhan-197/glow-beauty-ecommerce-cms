const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, unique: true, lowercase: true, maxlength: 80 },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminUser', AdminUserSchema);
