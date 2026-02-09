const express = require('express');
const router = express.Router();
const multer = require('multer');
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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
  uploadCandidatePhoto
);

module.exports = router;