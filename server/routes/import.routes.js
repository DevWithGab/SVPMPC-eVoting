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
  resendInvitationEndpoint,
  bulkResendInvitationsEndpoint,
  getImportHistory,
  getImportDetails,
  getImportMembers,
  getImportRecoveryInfo,
  retryFailedImport,
  uploadCSVPreview,
  confirmAndProcessImport,
} = require('../controllers/import.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const {
  requireAdminForImport,
  requireAdminForMemberAccess,
  requireAdminForImportAccess,
  requireAdminForMemberDetail,
  maskSensitiveData,
} = require('../middleware/importAccess.middleware');
const { csvUpload } = require('../config/csvUpload');

/**
 * All import routes require authentication
 */
router.use(verifyToken);

/**
 * Upload CSV file and generate preview with validation
 * POST /api/imports/upload
 * 
 * Access Control: Admin only
 * File: CSV file (max 10MB)
 */
router.post('/upload', requireAdminForImport, csvUpload.single('file'), uploadCSVPreview);

/**
 * Confirm and process CSV import
 * POST /api/imports/confirm
 * 
 * Access Control: Admin only
 * Body: { filePath: string, filename: string }
 */
router.post('/confirm', requireAdminForImport, confirmAndProcessImport);

/**
 * Get all imported members with status, dates, and activation method
 * Supports filtering by status, searching by member_id or phone_number, and sorting
 * GET /api/imports/members
 * 
 * Access Control: Admin only
 * Data Masking: Sensitive fields masked in list view
 */
router.get('/members', requireAdminForMemberAccess, maskSensitiveData, getImportedMembers);

/**
 * Get details for a specific imported member
 * GET /api/imports/members/:memberId
 * 
 * Access Control: Admin only
 * Note: Full details shown (no masking) for detail view
 */
router.get('/members/:memberId', requireAdminForMemberDetail, getImportedMemberDetails);

/**
 * Retry SMS for a single member
 * POST /api/imports/retry-sms/:userId
 * 
 * Access Control: Admin only
 */
router.post('/retry-sms/:userId', requireAdminForMemberDetail, retrySMS);

/**
 * Retry email for a single member
 * POST /api/imports/retry-email/:userId
 * 
 * Access Control: Admin only
 */
router.post('/retry-email/:userId', requireAdminForMemberDetail, retryEmail);

/**
 * Bulk retry notifications for multiple members
 * POST /api/imports/bulk-retry
 * 
 * Access Control: Admin only
 */
router.post('/bulk-retry', requireAdminForImport, bulkRetryNotifications);

/**
 * Get retry status for a member
 * GET /api/imports/retry-status/:userId
 * 
 * Access Control: Admin only
 */
router.get('/retry-status/:userId', requireAdminForMemberDetail, getRetryStatus);

/**
 * Resend invitation to a single member
 * POST /api/imports/resend-invitation/:userId
 * Body: { deliveryMethod: 'sms' | 'email', cooperativeName?, cooperativePhone? }
 * 
 * Access Control: Admin only
 */
router.post('/resend-invitation/:userId', requireAdminForMemberDetail, resendInvitationEndpoint);

/**
 * Bulk resend invitations to multiple members
 * POST /api/imports/bulk-resend-invitations
 * Body: { memberIds: string[], deliveryMethod: 'sms' | 'email', cooperativeName?, cooperativePhone? }
 * 
 * Access Control: Admin only
 */
router.post('/bulk-resend-invitations', requireAdminForImport, bulkResendInvitationsEndpoint);

/**
 * Get all import operations with pagination
 * GET /api/imports/history
 * Query: page, limit, sortBy, sortOrder
 * 
 * Access Control: Admin only
 * Data Masking: Sensitive fields masked in list view
 */
router.get('/history', requireAdminForImport, maskSensitiveData, getImportHistory);

/**
 * Get import details by ID
 * GET /api/imports/history/:importId
 * 
 * Access Control: Admin only
 */
router.get('/history/:importId', requireAdminForImportAccess, getImportDetails);

/**
 * Get members from a specific import operation
 * GET /api/imports/history/:importId/members
 * Query: page, limit, sortBy, sortOrder
 * 
 * Access Control: Admin only
 * Data Masking: Sensitive fields masked in list view
 */
router.get('/history/:importId/members', requireAdminForImportAccess, maskSensitiveData, getImportMembers);

/**
 * Get import recovery information for interrupted imports
 * GET /api/imports/recovery/:importId
 * 
 * Returns information about successfully imported members and failed members
 * that can be retried from a previous import operation.
 * 
 * Access Control: Admin only
 */
router.get('/recovery/:importId', requireAdminForImportAccess, getImportRecoveryInfo);

/**
 * Retry failed imports from a previous import operation
 * POST /api/imports/retry/:importId
 * 
 * Allows admin to retry importing members that failed in a previous import operation.
 * Generates new temporary passwords and resends SMS invitations to failed members.
 * 
 * Access Control: Admin only
 */
router.post('/retry/:importId', requireAdminForImportAccess, retryFailedImport);

module.exports = router;
