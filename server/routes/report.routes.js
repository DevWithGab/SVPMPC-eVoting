const express = require('express');
const router = express.Router();
const {
  generateElectionReport,
  generateVoteCountReport,
  getReports,
  getReportById,
  deleteReport
} = require('../controllers/report.controller');
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

router.get('/', authenticate, checkRole(['admin', 'officer']), getReports);
router.get('/:id', authenticate, getReportById);

router.post(
  '/election-summary',
  authenticate,
  checkRole(['admin', 'officer']),
  generateElectionReport
);

router.post(
  '/vote-count',
  authenticate,
  checkRole(['admin', 'officer']),
  generateVoteCountReport
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin']),
  deleteReport
);

module.exports = router;