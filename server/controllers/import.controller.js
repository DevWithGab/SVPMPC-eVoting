/**
 * Import Controller
 * Handles bulk member import operations and retry logic
 * Includes comprehensive error handling for CSV uploads and account creation
 */

const { User, ImportOperation, Activity } = require('../models');
const { retrySMSWithBackoff, retryEmailWithBackoff, retryFailedNotifications } = require('../services/notificationRetry');
const { resendInvitation, bulkResendInvitations } = require('../services/resendInvitation');
const { parseAndValidateCSV, generatePreview } = require('../services/csvParser');
const { createBulkAccounts } = require('../services/bulkAccountCreation');
const { generateTemporaryPassword, hashTemporaryPassword } = require('../services/passwordGenerator');
const { sendSMSAndLog } = require('../services/smsService');
const {
  handleCSVUploadError,
  handleDatabaseError,
  logErrorToActivity,
  getPartialImportRecovery,
  validateRecoveryPossible,
  updateImportOperationWithError,
} = require('../services/errorHandler');

/**
 * Retry SMS for a single member
 * POST /api/imports/retry-sms/:userId
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function retrySMS(req, res) {
  try {
    const { userId } = req.params;
    const { temporaryPassword, cooperativeName, cooperativePhone } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!userId || !temporaryPassword) {
      return res.status(400).json({
        message: 'Missing required fields: userId, temporaryPassword',
      });
    }

    // Perform SMS retry with manual retry flag
    const result = await retrySMSWithBackoff({
      userId,
      adminId,
      temporaryPassword,
      cooperativeName: cooperativeName || 'SVMPC',
      cooperativePhone: cooperativePhone || '+1-800-SVMPC-1',
      isManualRetry: true,
    });

    return res.status(result.success ? 200 : 400).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error retrying SMS:', error);
    return res.status(500).json({
      message: 'Error retrying SMS',
      error: error.message,
    });
  }
}

/**
 * Retry email for a single member
 * POST /api/imports/retry-email/:userId
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function retryEmail(req, res) {
  try {
    const { userId } = req.params;
    const { cooperativeName, cooperativePhone } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        message: 'Missing required field: userId',
      });
    }

    // Perform email retry with manual retry flag
    const result = await retryEmailWithBackoff({
      userId,
      adminId,
      cooperativeName: cooperativeName || 'SVMPC',
      cooperativePhone: cooperativePhone || '+1-800-SVMPC-1',
      isManualRetry: true,
    });

    return res.status(result.success ? 200 : 400).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error retrying email:', error);
    return res.status(500).json({
      message: 'Error retrying email',
      error: error.message,
    });
  }
}

/**
 * Bulk retry failed notifications
 * POST /api/imports/bulk-retry
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function bulkRetryNotifications(req, res) {
  try {
    const { memberIds, notificationType, temporaryPassword, cooperativeName, cooperativePhone } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        message: 'Missing or invalid required field: memberIds (must be non-empty array)',
      });
    }

    if (!notificationType || !['sms', 'email'].includes(notificationType)) {
      return res.status(400).json({
        message: 'Missing or invalid required field: notificationType (must be "sms" or "email")',
      });
    }

    if (notificationType === 'sms' && !temporaryPassword) {
      return res.status(400).json({
        message: 'temporaryPassword is required for SMS retry',
      });
    }

    // Perform bulk retry
    const result = await retryFailedNotifications({
      memberIds,
      adminId,
      notificationType,
      temporaryPassword,
      cooperativeName: cooperativeName || 'SVMPC',
      cooperativePhone: cooperativePhone || '+1-800-SVMPC-1',
    });

    // Log bulk retry operation
    try {
      await Activity.create({
        userId: adminId,
        action: 'BULK_RETRY_NOTIFICATIONS',
        description: `Bulk retry of ${notificationType} notifications for ${memberIds.length} members. Success: ${result.successful}, Failed: ${result.failed}, Skipped: ${result.skipped}`,
        metadata: {
          notification_type: notificationType,
          member_count: memberIds.length,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log bulk retry activity:', activityError.message);
    }

    return res.status(200).json({
      message: `Bulk ${notificationType} retry completed`,
      data: result,
    });
  } catch (error) {
    console.error('Error in bulk retry:', error);
    return res.status(500).json({
      message: 'Error performing bulk retry',
      error: error.message,
    });
  }
}

/**
 * Get retry status for a member
 * GET /api/imports/retry-status/:userId
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getRetryStatus(req, res) {
  try {
    const { userId } = req.params;

    // Fetch user to get retry status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.status(200).json({
      message: 'Retry status retrieved successfully',
      data: {
        userId: user._id,
        memberId: user.member_id,
        smsRetryCount: user.sms_retry_count,
        smsLastRetryAt: user.sms_last_retry_at,
        emailRetryCount: user.email_retry_count,
        emailLastRetryAt: user.email_last_retry_at,
        activationStatus: user.activation_status,
      },
    });
  } catch (error) {
    console.error('Error getting retry status:', error);
    return res.status(500).json({
      message: 'Error getting retry status',
      error: error.message,
    });
  }
}

/**
 * Get all imported members with status, dates, and activation method
 * Supports filtering by status, searching by member_id or phone_number, and sorting
 * GET /api/imports/members
 * Query parameters:
 *   - status: Filter by activation status (pending_activation, activated, sms_failed, email_failed, token_expired)
 *   - search: Search by member_id or phone_number
 *   - sortBy: Column to sort by (member_id, name, phone_number, activation_status, created_at, activated_at, sms_sent_at, temporary_password_expires)
 *   - sortOrder: Sort order (asc or desc, default: asc)
 *   - page: Page number for pagination (default: 1)
 *   - limit: Number of records per page (default: 50)
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getImportedMembers(req, res) {
  try {
    const { status, search, sortBy = 'created_at', sortOrder = 'asc', page = 1, limit = 50 } = req.query;

    // Build filter query
    const filter = { import_id: { $exists: true, $ne: null } };

    // Filter by status if provided
    if (status) {
      const validStatuses = ['pending_activation', 'activated', 'sms_failed', 'email_failed', 'token_expired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      filter.activation_status = status;
    }

    // Search by member_id or phone_number if provided
    if (search) {
      filter.$or = [
        { member_id: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
      ];
    }

    // Validate sortBy parameter
    const validSortFields = ['member_id', 'name', 'phone_number', 'activation_status', 'created_at', 'activated_at', 'sms_sent_at', 'temporary_password_expires'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Validate sortOrder parameter
    const sortOrderValue = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with sorting and pagination
    const members = await User.find(filter)
      .sort({ [sortField]: sortOrderValue })
      .skip(skip)
      .limit(limitNum)
      .select('member_id fullName phone_number activation_status activation_method created_at activated_at sms_sent_at temporary_password_expires email')
      .lean();

    // Get total count for pagination
    const totalCount = await User.countDocuments(filter);

    // Format response data
    const formattedMembers = members.map(member => ({
      id: member._id,
      member_id: member.member_id,
      name: member.fullName,
      phone_number: member.phone_number,
      email: member.email,
      activation_status: member.activation_status,
      activation_method: member.activation_method,
      imported_at: member.created_at,
      activated_at: member.activated_at,
      sms_sent_at: member.sms_sent_at,
      temporary_password_expires: member.temporary_password_expires,
    }));

    return res.status(200).json({
      message: 'Imported members retrieved successfully',
      data: {
        members: formattedMembers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error getting imported members:', error);
    return res.status(500).json({
      message: 'Error retrieving imported members',
      error: error.message,
    });
  }
}

/**
 * Get details for a specific imported member
 * GET /api/imports/members/:memberId
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getImportedMemberDetails(req, res) {
  try {
    const { memberId } = req.params;

    // Find member by ID or member_id
    const member = await User.findOne({
      $or: [
        { _id: memberId },
        { member_id: memberId },
      ],
      import_id: { $exists: true, $ne: null },
    }).select('-password -temporary_password_hash');

    if (!member) {
      return res.status(404).json({
        message: 'Imported member not found',
      });
    }

    // Get import operation details
    const importOp = await ImportOperation.findById(member.import_id);

    return res.status(200).json({
      message: 'Member details retrieved successfully',
      data: {
        id: member._id,
        member_id: member.member_id,
        name: member.fullName,
        email: member.email,
        phone_number: member.phone_number,
        activation_status: member.activation_status,
        activation_method: member.activation_method,
        imported_at: member.created_at,
        activated_at: member.activated_at,
        sms_sent_at: member.sms_sent_at,
        email_sent_at: member.email_sent_at,
        temporary_password_expires: member.temporary_password_expires,
        last_password_change: member.last_password_change,
        import_operation: importOp ? {
          id: importOp._id,
          admin_name: importOp.admin_name,
          csv_file_name: importOp.csv_file_name,
          created_at: importOp.created_at,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error getting member details:', error);
    return res.status(500).json({
      message: 'Error retrieving member details',
      error: error.message,
    });
  }
}

/**
 * Resend invitation to a single member
 * POST /api/imports/resend-invitation/:userId
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function resendInvitationEndpoint(req, res) {
  try {
    const { userId } = req.params;
    const { deliveryMethod = 'sms', cooperativeName, cooperativePhone } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        message: 'Missing required field: userId',
      });
    }

    if (!['sms', 'email'].includes(deliveryMethod)) {
      return res.status(400).json({
        message: 'Invalid delivery method. Must be "sms" or "email"',
      });
    }

    // Perform resend invitation
    const result = await resendInvitation({
      userId,
      adminId,
      deliveryMethod,
      cooperativeName: cooperativeName || 'SVMPC',
      cooperativePhone: cooperativePhone || '+1-800-SVMPC-1',
    });

    return res.status(result.success ? 200 : 400).json({
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return res.status(500).json({
      message: 'Error resending invitation',
      error: error.message,
    });
  }
}

/**
 * Bulk resend invitations to multiple members
 * POST /api/imports/bulk-resend-invitations
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function bulkResendInvitationsEndpoint(req, res) {
  try {
    const { memberIds, deliveryMethod = 'sms', cooperativeName, cooperativePhone } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        message: 'Missing or invalid required field: memberIds (must be non-empty array)',
      });
    }

    if (!['sms', 'email'].includes(deliveryMethod)) {
      return res.status(400).json({
        message: 'Invalid delivery method. Must be "sms" or "email"',
      });
    }

    // Perform bulk resend
    const result = await bulkResendInvitations({
      memberIds,
      adminId,
      deliveryMethod,
      cooperativeName: cooperativeName || 'SVMPC',
      cooperativePhone: cooperativePhone || '+1-800-SVMPC-1',
    });

    return res.status(200).json({
      message: `Bulk resend of ${deliveryMethod} invitations completed`,
      data: result,
    });
  } catch (error) {
    console.error('Error in bulk resend invitations:', error);
    return res.status(500).json({
      message: 'Error performing bulk resend invitations',
      error: error.message,
    });
  }
}
/**
 * Get all import operations with pagination
 * GET /api/imports/history
 * Query parameters:
 *   - page: Page number for pagination (default: 1)
 *   - limit: Number of records per page (default: 50)
 *   - sortBy: Column to sort by (created_at, admin_name, successful_imports, status)
 *   - sortOrder: Sort order (asc or desc, default: desc)
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getImportHistory(req, res) {
  try {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Validate sortBy parameter
    const validSortFields = ['createdAt', 'admin_name', 'successful_imports', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Validate sortOrder parameter
    const sortOrderValue = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with sorting and pagination
    const imports = await ImportOperation.find()
      .sort({ [sortField]: sortOrderValue })
      .skip(skip)
      .limit(limitNum)
      .select('admin_name csv_file_name total_rows successful_imports failed_imports skipped_rows status createdAt')
      .lean();

    // Get total count for pagination
    const totalCount = await ImportOperation.countDocuments();

    // Format response data
    const formattedImports = imports.map(importOp => ({
      id: importOp._id,
      admin_name: importOp.admin_name,
      csv_file_name: importOp.csv_file_name,
      total_rows: importOp.total_rows,
      successful_imports: importOp.successful_imports,
      failed_imports: importOp.failed_imports,
      skipped_rows: importOp.skipped_rows,
      status: importOp.status,
      created_at: importOp.createdAt,
    }));

    return res.status(200).json({
      message: 'Import history retrieved successfully',
      data: {
        imports: formattedImports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error getting import history:', error);
    return res.status(500).json({
      message: 'Error retrieving import history',
      error: error.message,
    });
  }
}

/**
 * Get import details by ID
 * GET /api/imports/history/:importId
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getImportDetails(req, res) {
  try {
    const { importId } = req.params;

    // Find import operation by ID
    const importOp = await ImportOperation.findById(importId);

    if (!importOp) {
      return res.status(404).json({
        message: 'Import operation not found',
      });
    }

    return res.status(200).json({
      message: 'Import details retrieved successfully',
      data: {
        id: importOp._id,
        admin_name: importOp.admin_name,
        csv_file_name: importOp.csv_file_name,
        total_rows: importOp.total_rows,
        successful_imports: importOp.successful_imports,
        failed_imports: importOp.failed_imports,
        skipped_rows: importOp.skipped_rows,
        sms_sent_count: importOp.sms_sent_count,
        sms_failed_count: importOp.sms_failed_count,
        email_sent_count: importOp.email_sent_count,
        email_failed_count: importOp.email_failed_count,
        status: importOp.status,
        import_errors: importOp.import_errors,
        created_at: importOp.createdAt,
        updated_at: importOp.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error getting import details:', error);
    return res.status(500).json({
      message: 'Error retrieving import details',
      error: error.message,
    });
  }
}

/**
 * Get members from a specific import operation
 * GET /api/imports/history/:importId/members
 * Query parameters:
 *   - page: Page number for pagination (default: 1)
 *   - limit: Number of records per page (default: 50)
 *   - sortBy: Column to sort by (member_id, name, phone_number, activation_status, created_at)
 *   - sortOrder: Sort order (asc or desc, default: asc)
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getImportMembers(req, res) {
  try {
    const { importId } = req.params;
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'asc' } = req.query;

    // Verify import operation exists
    const importOp = await ImportOperation.findById(importId);
    if (!importOp) {
      return res.status(404).json({
        message: 'Import operation not found',
      });
    }

    // Validate sortBy parameter
    const validSortFields = ['member_id', 'fullName', 'phone_number', 'activation_status', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Validate sortOrder parameter
    const sortOrderValue = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with sorting and pagination
    const members = await User.find({ import_id: importId })
      .sort({ [sortField]: sortOrderValue })
      .skip(skip)
      .limit(limitNum)
      .select('member_id fullName phone_number email activation_status activation_method createdAt activated_at sms_sent_at temporary_password_expires')
      .lean();

    // Get total count for pagination
    const totalCount = await User.countDocuments({ import_id: importId });

    // Format response data
    const formattedMembers = members.map(member => ({
      id: member._id,
      member_id: member.member_id,
      name: member.fullName,
      phone_number: member.phone_number,
      email: member.email,
      activation_status: member.activation_status,
      activation_method: member.activation_method,
      imported_at: member.createdAt,
      activated_at: member.activated_at,
      sms_sent_at: member.sms_sent_at,
      temporary_password_expires: member.temporary_password_expires,
    }));

    return res.status(200).json({
      message: 'Import members retrieved successfully',
      data: {
        import_id: importId,
        members: formattedMembers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error getting import members:', error);
    return res.status(500).json({
      message: 'Error retrieving import members',
      error: error.message,
    });
  }
}


module.exports = {
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
  uploadCSVPreview,
  confirmAndProcessImport,
  getImportRecoveryInfo,
  retryFailedImport,
};


/**
 * Upload CSV file and generate preview with validation
 * POST /api/imports/upload
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function uploadCSVPreview(req, res) {
  try {
    // Validate file was provided
    if (!req.file) {
      const errorResponse = handleCSVUploadError(
        new Error('No file provided'),
        'unknown'
      );
      return res.status(400).json(errorResponse);
    }

    const adminId = req.user._id;
    const filePath = req.file.path;
    const filename = req.file.originalname;

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxFileSize) {
      const errorResponse = handleCSVUploadError(
        { code: 'LIMIT_FILE_SIZE', message: 'File too large' },
        filename
      );
      await logErrorToActivity(adminId, 'CSV_FILE_TOO_LARGE', `CSV file exceeds maximum size of 10MB`, {
        filename,
        file_size: req.file.size,
      });
      return res.status(400).json(errorResponse);
    }

    // Parse and validate CSV
    const parseResult = await parseAndValidateCSV(filePath, filename);

    if (!parseResult.success) {
      const errorResponse = {
        success: false,
        error: {
          code: 'CSV_VALIDATION_FAILED',
          message: parseResult.error || 'CSV validation failed',
          details: {
            filename,
            errors: parseResult.errors,
            invalidRowDetails: parseResult.invalidRows,
          },
        },
      };
      await logErrorToActivity(adminId, 'CSV_VALIDATION_FAILED', parseResult.error || 'CSV validation failed', {
        filename,
        invalid_rows: parseResult.invalidRows?.length || 0,
      });
      return res.status(400).json(errorResponse);
    }

    // Generate preview
    const preview = await generatePreview(filePath, filename);

    if (!preview.success) {
      const errorResponse = handleCSVUploadError(
        new Error(preview.error),
        filename
      );
      await logErrorToActivity(adminId, 'CSV_PREVIEW_GENERATION_FAILED', preview.error, {
        filename,
      });
      return res.status(400).json(errorResponse);
    }

    // Log successful preview generation
    await logErrorToActivity(adminId, 'CSV_PREVIEW_GENERATED', `CSV preview generated successfully`, {
      filename,
      total_rows: preview.totalRows,
      valid_rows: preview.validRows,
      invalid_rows: preview.invalidRows,
    });

    return res.status(200).json({
      success: true,
      message: 'CSV file validated successfully',
      data: {
        fileName: preview.fileName,
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        invalidRows: preview.invalidRows,
        hasEmailColumn: preview.hasEmailColumn,
        previewData: preview.previewData,
        errors: preview.errors,
      },
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    const adminId = req.user?._id;
    if (adminId) {
      await logErrorToActivity(adminId, 'CSV_UPLOAD_ERROR', `Unexpected error during CSV upload: ${error.message}`, {
        error_message: error.message,
        stack: error.stack,
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'CSV_UPLOAD_ERROR',
        message: `Failed to process CSV file: ${error.message}`,
      },
    });
  }
}

/**
 * Confirm and process CSV import
 * POST /api/imports/confirm
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function confirmAndProcessImport(req, res) {
  try {
    const { filePath, filename } = req.body;
    const adminId = req.user._id;
    const adminName = req.user.fullName || req.user.username;

    // Validate required fields
    if (!filePath || !filename) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'filePath and filename are required',
        },
      });
    }

    // Parse and validate CSV again (security check)
    const parseResult = await parseAndValidateCSV(filePath, filename);

    if (!parseResult.success) {
      const errorResponse = {
        success: false,
        error: {
          code: 'CSV_VALIDATION_FAILED',
          message: parseResult.error || 'CSV validation failed',
          details: {
            filename,
            errors: parseResult.errors,
            invalidRowDetails: parseResult.invalidRows,
          },
        },
      };
      await logErrorToActivity(adminId, 'CSV_VALIDATION_FAILED_ON_CONFIRM', parseResult.error || 'CSV validation failed', {
        filename,
        invalid_rows: parseResult.invalidRows?.length || 0,
      });
      return res.status(400).json(errorResponse);
    }

    // Create bulk accounts with comprehensive error handling
    let importResult;
    try {
      importResult = await createBulkAccounts({
        validRows: parseResult.validRows,
        csvFileName: filename,
        adminId,
        adminName,
      });
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'bulk_account_creation');
      await logErrorToActivity(adminId, errorResponse.error.code, errorResponse.error.message, {
        filename,
        error_message: error.message,
      });
      return res.status(500).json(errorResponse);
    }

    // Log successful import
    await logErrorToActivity(adminId, 'BULK_IMPORT_COMPLETED', `Bulk import completed successfully`, {
      import_id: importResult.importOperation._id,
      filename,
      successful_imports: importResult.statistics.successful_imports,
      failed_imports: importResult.statistics.failed_imports,
      skipped_rows: importResult.statistics.skipped_rows,
    });

    return res.status(200).json({
      success: true,
      message: 'Import completed successfully',
      data: {
        importOperation: importResult.importOperation,
        statistics: importResult.statistics,
        createdUsers: importResult.createdUsers,
      },
    });
  } catch (error) {
    console.error('Error confirming import:', error);
    const adminId = req.user?._id;
    if (adminId) {
      await logErrorToActivity(adminId, 'IMPORT_CONFIRMATION_ERROR', `Unexpected error during import confirmation: ${error.message}`, {
        error_message: error.message,
        stack: error.stack,
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_CONFIRMATION_ERROR',
        message: `Failed to process import: ${error.message}`,
      },
    });
  }
}

/**
 * Get import recovery information for interrupted imports
 * GET /api/imports/recovery/:importId
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getImportRecoveryInfo(req, res) {
  try {
    const { importId } = req.params;
    const adminId = req.user._id;

    // Validate recovery is possible
    const recoveryValidation = await validateRecoveryPossible(importId);

    if (!recoveryValidation.canRecover) {
      return res.status(400).json({
        success: false,
        message: recoveryValidation.reason,
        data: recoveryValidation.data,
      });
    }

    // Get partial import recovery information
    const recoveryInfo = await getPartialImportRecovery(importId);

    if (!recoveryInfo.success) {
      await logErrorToActivity(adminId, 'IMPORT_RECOVERY_ERROR', recoveryInfo.message, {
        import_id: importId,
      });
      return res.status(500).json({
        success: false,
        message: recoveryInfo.message,
        error: recoveryInfo.error,
      });
    }

    // Log recovery info retrieval
    await logErrorToActivity(adminId, 'IMPORT_RECOVERY_INFO_RETRIEVED', `Retrieved recovery information for import ${importId}`, {
      import_id: importId,
      successful_members: recoveryInfo.data.successful_members.length,
    });

    return res.status(200).json({
      success: true,
      message: 'Import recovery information retrieved successfully',
      data: recoveryInfo.data,
    });
  } catch (error) {
    console.error('Error getting import recovery info:', error);
    const adminId = req.user?._id;
    if (adminId) {
      await logErrorToActivity(adminId, 'IMPORT_RECOVERY_ERROR', `Unexpected error retrieving recovery info: ${error.message}`, {
        error_message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_RECOVERY_ERROR',
        message: `Failed to retrieve recovery information: ${error.message}`,
      },
    });
  }
}

/**
 * Retry failed imports from a previous import operation
 * POST /api/imports/retry/:importId
 * 
 * Allows admin to retry importing members that failed in a previous import operation.
 * Tracks which members were successfully imported before interruption and retries only failed members.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function retryFailedImport(req, res) {
  try {
    const { importId } = req.params;
    const adminId = req.user._id;
    const adminName = req.user.fullName || req.user.username;

    // Validate import operation exists
    const importOp = await ImportOperation.findById(importId);
    if (!importOp) {
      return res.status(404).json({
        success: false,
        message: 'Import operation not found',
        error: {
          code: 'IMPORT_NOT_FOUND',
          message: `Import operation with ID ${importId} does not exist`,
        },
      });
    }

    // Get all members from the failed import
    const failedMembers = await User.find({
      import_id: importId,
      activation_status: { $in: ['sms_failed', 'email_failed', 'pending_activation'] },
    });

    if (failedMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No failed members to retry',
        data: {
          import_id: importId,
          failed_members_count: 0,
        },
      });
    }

    // Log retry attempt
    await logErrorToActivity(adminId, 'IMPORT_RETRY_STARTED', `Starting retry for ${failedMembers.length} failed members from import ${importId}`, {
      import_id: importId,
      failed_members_count: failedMembers.length,
    });

    // Create new import operation for retry
    const retryImportOp = new ImportOperation({
      admin_id: adminId,
      admin_name: adminName,
      csv_file_name: `${importOp.csv_file_name} (Retry)`,
      total_rows: failedMembers.length,
      status: 'pending',
    });

    try {
      await retryImportOp.save();
    } catch (error) {
      console.error('Failed to create retry import operation:', error.message);
      await logErrorToActivity(adminId, 'IMPORT_RETRY_ERROR', `Failed to create retry import operation: ${error.message}`, {
        import_id: importId,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'RETRY_OPERATION_ERROR',
          message: `Failed to initialize retry operation: ${error.message}`,
        },
      });
    }

    let successfulRetries = 0;
    let failedRetries = 0;
    let retryErrors = [];
    const retriedMembers = [];

    // Retry sending notifications to failed members
    for (const member of failedMembers) {
      try {
        // Generate new temporary password
        const tempPassword = generateTemporaryPassword();
        const hashedTempPassword = await hashTemporaryPassword(tempPassword);

        // Update member with new temporary password
        member.temporary_password_hash = hashedTempPassword;
        member.temporary_password_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        member.activation_status = 'pending_activation';
        await member.save();

        // Send SMS invitation
        let smsResult = { success: false };
        try {
          smsResult = await sendSMSAndLog({
            userId: member._id,
            adminId,
            temporaryPassword: tempPassword,
            cooperativeName: 'SVMPC',
            cooperativePhone: '+1-800-SVMPC-1',
          });
        } catch (smsError) {
          console.error(`SMS error for member ${member.member_id}:`, smsError.message);
          smsResult = { success: false, message: smsError.message };
        }

        if (smsResult.success) {
          successfulRetries++;
          retriedMembers.push({
            member_id: member.member_id,
            name: member.fullName,
            phone_number: member.phone_number,
            status: 'retry_successful',
          });
        } else {
          failedRetries++;
          const errorInfo = {
            member_id: member.member_id,
            error_message: smsResult.message || 'SMS send failed',
            error_code: 'SMS_RETRY_FAILED',
          };
          retryErrors.push(errorInfo);
          await updateImportOperationWithError(retryImportOp._id, errorInfo);
        }
      } catch (error) {
        failedRetries++;
        const errorInfo = {
          member_id: member.member_id,
          error_message: `Unexpected error during retry: ${error.message}`,
          error_code: 'UNKNOWN_RETRY_ERROR',
        };
        retryErrors.push(errorInfo);
        await updateImportOperationWithError(retryImportOp._id, errorInfo);
        await logErrorToActivity(adminId, 'IMPORT_RETRY_ERROR', errorInfo.error_message, {
          member_id: member.member_id,
          import_id: importId,
        });
      }
    }

    // Update retry import operation with statistics
    try {
      retryImportOp.successful_imports = successfulRetries;
      retryImportOp.failed_imports = failedRetries;
      retryImportOp.import_errors = retryErrors;
      retryImportOp.status = 'completed';
      await retryImportOp.save();
    } catch (error) {
      console.error('Failed to update retry import operation:', error.message);
      await logErrorToActivity(adminId, 'IMPORT_RETRY_UPDATE_ERROR', `Failed to save retry operation: ${error.message}`, {
        import_id: importId,
      });
    }

    // Log retry completion
    await logErrorToActivity(adminId, 'IMPORT_RETRY_COMPLETED', `Retry completed: ${successfulRetries} successful, ${failedRetries} failed`, {
      import_id: importId,
      retry_import_id: retryImportOp._id,
      successful_retries: successfulRetries,
      failed_retries: failedRetries,
    });

    return res.status(200).json({
      success: true,
      message: `Retry completed: ${successfulRetries} successful, ${failedRetries} failed`,
      data: {
        retryImportOperation: retryImportOp.toJSON(),
        statistics: {
          total_members_retried: failedMembers.length,
          successful_retries: successfulRetries,
          failed_retries: failedRetries,
          retry_errors: retryErrors,
        },
        retriedMembers,
      },
    });
  } catch (error) {
    console.error('Error retrying failed import:', error);
    const adminId = req.user?._id;
    if (adminId) {
      await logErrorToActivity(adminId, 'IMPORT_RETRY_ERROR', `Unexpected error during retry: ${error.message}`, {
        error_message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_RETRY_ERROR',
        message: `Failed to retry import: ${error.message}`,
      },
    });
  }
}
