/**
 * Import Routes
 * Routes for bulk member import and retry operations
 */

const express = require('express');
const router = express.Router();
const { 
  retrySMS, 
  retryEmail, 
  bulkRetryNotifications, 
  getRetryStatus,
  getImportedMembers,
  getImportedMemberDetails,
} = require('../controllers/import.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

/**
 * All import routes require authentication and admin role
 */
router.use(verifyToken);
router.use(checkRole(['admin']));

/**
 * Get all imported members with status, dates, and activation method
 * Supports filtering by status, searching by member_id or phone_number, and sorting
 * GET /api/imports/members
 */
router.get('/members', getImportedMembers);

/**
 * Get details for a specific imported member
 * GET /api/imports/members/:memberId
 */
router.get('/members/:memberId', getImportedMemberDetails);

/**
 * Retry SMS for a single member
 * POST /api/imports/retry-sms/:userId
 */
router.post('/retry-sms/:userId', retrySMS);

/**
 * Retry email for a single member
 * POST /api/imports/retry-email/:userId
 */
router.post('/retry-email/:userId', retryEmail);

/**
 * Bulk retry notifications for multiple members
 * POST /api/imports/bulk-retry
 */
router.post('/bulk-retry', bulkRetryNotifications);

/**
 * Get retry status for a member
 * GET /api/imports/retry-status/:userId
 */
router.get('/retry-status/:userId', getRetryStatus);

module.exports = router;
