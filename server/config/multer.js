const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/elections');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'election-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (before compression)
  },
});

// Middleware to compress images after upload
const compressImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const filePath = req.file.path;
    const ext = path.extname(filePath).toLowerCase();
    
    // Compress and optimize the image
    await sharp(filePath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(filePath.replace(ext, '.webp'));

    // Delete original file if it's not webp
    if (ext !== '.webp') {
      fs.unlinkSync(filePath);
      req.file.filename = req.file.filename.replace(ext, '.webp');
      req.file.path = filePath.replace(ext, '.webp');
    }

    next();
  } catch (error) {
    console.error('Image compression error:', error);
    next();
  }
};

module.exports = { upload, compressImage };
