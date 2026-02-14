const express = require('express');
const router = express.Router();
const {
  createElection,
  getElections,
  getElectionById,
  updateElection,
  deleteElection,
  startElection,
  completeElection,
  resetElectionCycle,
} = require('../controllers/election.controller');
const { validate, schemas } = require('../middleware/validation.middleware');
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const { upload, compressImage } = require('../config/multer');

// Public routes
router.get('/', getElections);

// Protected routes - must come before /:id to avoid route conflicts
router.post(
  '/reset/cycle',
  authenticate,
  checkRole(['admin']),
  resetElectionCycle
);

router.post(
  '/:id/start',
  authenticate,
  checkRole(['admin', 'officer']),
  startElection
);

router.post(
  '/:id/complete',
  authenticate,
  checkRole(['admin', 'officer']),
  completeElection
);

router.get('/:id', getElectionById);

router.post(
  '/',
  authenticate,
  upload.single('backgroundImage'),
  compressImage,
  validate(schemas.election),
  checkRole(['admin', 'officer']),
  createElection
);

router.put(
  '/:id',
  authenticate,
  validate(schemas.election),
  checkRole(['admin', 'officer']),
  updateElection
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin', 'officer']),
  deleteElection
);

module.exports = router;