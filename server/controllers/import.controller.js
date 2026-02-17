/**
 * Import Controller
 * Handles bulk member import operations and retry logic
 */

const { User, ImportOperation, Activity } = require('../models');
const { retrySMSWithBackoff, retryEmailWithBackoff, retryFailedNotifications } = require('../services/notificationRetry');

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

module.exports = {
  retrySMS,
  retryEmail,
  bulkRetryNotifications,
  getRetryStatus,
  getImportedMembers,
  getImportedMemberDetails,
};
