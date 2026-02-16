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

module.exports = {
  retrySMS,
  retryEmail,
  bulkRetryNotifications,
  getRetryStatus,
};
