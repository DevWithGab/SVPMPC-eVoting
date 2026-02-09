const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  updateAccessibilityPreferences,
  uploadProfilePicture
} = require('../controllers/user.controller');
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
router.get('/', authenticate, checkRole(['admin', 'officer']), getUsers);

// More specific routes MUST come before generic /:id routes
router.put(
  '/preferences/accessibility',
  authenticate,
  updateAccessibilityPreferences
);

router.post(
  '/profile-picture',
  authenticate,
  upload.single('profilePicture'),
  uploadProfilePicture
);

router.put(
  '/:id/role',
  authenticate,
  checkRole(['admin']),
  updateUserRole
);

router.put(
  '/:id/status',
  authenticate,
  checkRole(['admin']),
  updateUserStatus
);

// Generic routes come last
router.get('/:id', authenticate, getUserById);

router.put(
  '/:id',
  authenticate,
  updateUser
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin']),
  deleteUser
);

module.exports = router;