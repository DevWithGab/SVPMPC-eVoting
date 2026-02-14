const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  uploadCandidatePhoto
} = require('../controllers/candidate.controller');
const { validate, schemas } = require('../middleware/validation.middleware');
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/candidates');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads with disk storage
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (before compression)
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to compress candidate photos
const compressPhoto = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const filePath = req.file.path;
    const ext = path.extname(filePath).toLowerCase();
    
    // Compress and optimize the image
    await sharp(filePath)
      .resize(600, 800, {
        fit: 'cover',
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
    console.error('Photo compression error:', error);
    next();
  }
};

// Public routes
router.get('/', getCandidates);
router.get('/:id', getCandidateById);

// Protected routes
router.post(
  '/',
  authenticate,
  validate(schemas.candidate),
  checkRole(['admin', 'officer']),
  createCandidate
);

router.put(
  '/:id',
  authenticate,
  validate(schemas.candidate),
  checkRole(['admin', 'officer']),
  updateCandidate
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin', 'officer']),
  deleteCandidate
);

router.post(
  '/photo/upload',
  authenticate,
  checkRole(['admin', 'officer']),
  upload.single('photo'),
  compressPhoto,
  uploadCandidatePhoto
);

module.exports = router;