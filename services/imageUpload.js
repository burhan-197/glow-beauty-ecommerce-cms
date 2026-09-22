const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) return cb(new Error('Only JPG, PNG and WebP images are allowed.'));
    cb(null, true);
  }
});

function publicPathFor(file) {
  return file ? `/uploads/${file.filename}` : '';
}

function removeLocalImage(imagePath) {
  if (!String(imagePath || '').startsWith('/uploads/')) return;
  const full = path.join(uploadDir, path.basename(imagePath));
  fs.unlink(full, () => {});
}

module.exports = { upload, publicPathFor, removeLocalImage };
