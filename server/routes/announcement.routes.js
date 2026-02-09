const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementCount
} = require('../controllers/announcement.controller');
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

// Public routes
router.get('/', getAnnouncements);
router.get('/count', getAnnouncementCount);
router.get('/:id', getAnnouncementById);

// Protected routes

router.post(
  '/',
  authenticate,
  checkRole(['admin', 'officer']),
  createAnnouncement
);

router.put(
  '/:id',
  authenticate,
  checkRole(['admin', 'officer']),
  updateAnnouncement
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin', 'officer']),
  deleteAnnouncement
);

module.exports = router;
