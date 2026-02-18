/**
 * Notification Retry Service
 * Handles retry logic for failed SMS and email notifications with exponential backoff
 * Logs retry attempts and allows manual retries
 */

const { User, Activity, ImportOperation } = require('../models');
const { sendSMSAndLog } = require('./smsService');
const { sendEmailAndLog } = require('./emailService');
const { generateTemporaryPassword, hashTemporaryPassword } = require('./passwordGenerator');

/**
 * Configuration for retry logic
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 60000, // 1 minute
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Calculates exponential backoff delay
 * Formula: min(initialDelay * (multiplier ^ retryCount), maxDelay)
 * 
 * @param {number} retryCount - Current retry attempt number (0-indexed)
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoffDelay(retryCount) {
  const delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Waits for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries sending SMS with exponential backoff
 * 
 * @param {object} params - Parameters object
 * @param {string} params.userId - User ID to retry SMS for
 * @param {string} params.adminId - Admin ID performing the retry
 * @param {string} params.temporaryPassword - Temporary password to send
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @param {boolean} params.isManualRetry - Whether this is a manual retry (default: false)
 * @returns {Promise<object>} - Result with retry status and details
 */
async function retrySMSWithBackoff({
  userId,
  adminId,
  temporaryPassword,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
  isManualRetry = false,
}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Check if max retries exceeded
    if (user.sms_retry_count >= RETRY_CONFIG.MAX_RETRIES) {
      return {
        success: false,
        message: `Maximum SMS retry attempts (${RETRY_CONFIG.MAX_RETRIES}) exceeded for user ${user.member_id}`,
        userId,
        retryCount: user.sms_retry_count,
        maxRetriesExceeded: true,
      };
    }

    // Calculate backoff delay (skip for manual retries)
    if (!isManualRetry && user.sms_last_retry_at) {
      const backoffDelay = calculateBackoffDelay(user.sms_retry_count);
      const timeSinceLastRetry = Date.now() - user.sms_last_retry_at.getTime();

      if (timeSinceLastRetry < backoffDelay) {
        const waitTime = backoffDelay - timeSinceLastRetry;
        return {
          success: false,
          message: `SMS retry in progress. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`,
          userId,
          retryCount: user.sms_retry_count,
          waitTimeMs: waitTime,
          backoffActive: true,
        };
      }
    }

    // Attempt to send SMS
    const smsResult = await sendSMSAndLog({
      userId,
      adminId,
      temporaryPassword,
      cooperativeName,
      cooperativePhone,
    });

    if (smsResult.success) {
      // Reset retry count on success
      user.sms_retry_count = 0;
      user.sms_last_retry_at = null;
      await user.save();

      // Log successful retry
      try {
        await Activity.create({
          userId: adminId,
          action: 'SMS_RETRY_SUCCESS',
          description: `SMS retry successful for member ${user.member_id} after ${user.sms_retry_count} previous attempts`,
          metadata: {
            member_id: user.member_id,
            phone_number: user.phone_number,
            retry_count: user.sms_retry_count,
            is_manual_retry: isManualRetry,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log SMS retry success activity:', activityError.message);
      }

      return {
        success: true,
        message: 'SMS retry successful',
        userId,
        retryCount: user.sms_retry_count,
        smsId: smsResult.smsId,
      };
    } else {
      // Increment retry count and update last retry time
      user.sms_retry_count += 1;
      user.sms_last_retry_at = new Date();
      await user.save();

      // Log failed retry
      try {
        await Activity.create({
          userId: adminId,
          action: 'SMS_RETRY_FAILED',
          description: `SMS retry failed for member ${user.member_id}. Attempt ${user.sms_retry_count} of ${RETRY_CONFIG.MAX_RETRIES}`,
          metadata: {
            member_id: user.member_id,
            phone_number: user.phone_number,
            retry_count: user.sms_retry_count,
            max_retries: RETRY_CONFIG.MAX_RETRIES,
            error: smsResult.error,
            is_manual_retry: isManualRetry,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log SMS retry failed activity:', activityError.message);
      }

      // Calculate next backoff delay
      const nextBackoffDelay = calculateBackoffDelay(user.sms_retry_count);

      return {
        success: false,
        message: `SMS retry failed. Attempt ${user.sms_retry_count} of ${RETRY_CONFIG.MAX_RETRIES}`,
        userId,
        retryCount: user.sms_retry_count,
        error: smsResult.error,
        nextRetryDelayMs: nextBackoffDelay,
        nextRetryDelaySeconds: Math.ceil(nextBackoffDelay / 1000),
      };
    }
  } catch (error) {
    // Log unexpected error
    try {
      await Activity.create({
        userId: adminId,
        action: 'SMS_RETRY_ERROR',
        description: `Unexpected error during SMS retry for user ${userId}: ${error.message}`,
        metadata: {
          user_id: userId,
          error: error.message,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log SMS retry error activity:', activityError.message);
    }

    return {
      success: false,
      message: `Unexpected error during SMS retry: ${error.message}`,
      userId,
      error: error.message,
    };
  }
}

/**
 * Retries sending email with exponential backoff
 * 
 * @param {object} params - Parameters object
 * @param {string} params.userId - User ID to retry email for
 * @param {string} params.adminId - Admin ID performing the retry
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @param {boolean} params.isManualRetry - Whether this is a manual retry (default: false)
 * @returns {Promise<object>} - Result with retry status and details
 */
async function retryEmailWithBackoff({
  userId,
  adminId,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
  isManualRetry = false,
}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Check if max retries exceeded
    if (user.email_retry_count >= RETRY_CONFIG.MAX_RETRIES) {
      return {
        success: false,
        message: `Maximum email retry attempts (${RETRY_CONFIG.MAX_RETRIES}) exceeded for user ${user.member_id}`,
        userId,
        retryCount: user.email_retry_count,
        maxRetriesExceeded: true,
      };
    }

    // Calculate backoff delay (skip for manual retries)
    if (!isManualRetry && user.email_last_retry_at) {
      const backoffDelay = calculateBackoffDelay(user.email_retry_count);
      const timeSinceLastRetry = Date.now() - user.email_last_retry_at.getTime();

      if (timeSinceLastRetry < backoffDelay) {
        const waitTime = backoffDelay - timeSinceLastRetry;
        return {
          success: false,
          message: `Email retry in progress. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`,
          userId,
          retryCount: user.email_retry_count,
          waitTimeMs: waitTime,
          backoffActive: true,
        };
      }
    }

    // Generate new temporary password for retry
    const newTemporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashTemporaryPassword(newTemporaryPassword);

    // Update user's temporary password
    user.temporary_password_hash = hashedPassword;
    user.temporary_password_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Attempt to send email
    const emailResult = await sendEmailAndLog({
      userId,
      adminId,
      temporaryPassword: newTemporaryPassword,
      cooperativeName,
      cooperativePhone,
    });

    if (emailResult.success) {
      // Reset retry count on success
      user.email_retry_count = 0;
      user.email_last_retry_at = null;
      await user.save();

      // Log successful retry
      try {
        await Activity.create({
          userId: adminId,
          action: 'EMAIL_RETRY_SUCCESS',
          description: `Email retry successful for member ${user.member_id} after ${user.email_retry_count} previous attempts`,
          metadata: {
            member_id: user.member_id,
            email: user.email,
            retry_count: user.email_retry_count,
            is_manual_retry: isManualRetry,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log email retry success activity:', activityError.message);
      }

      return {
        success: true,
        message: 'Email retry successful',
        userId,
        retryCount: user.email_retry_count,
        emailId: emailResult.emailId,
      };
    } else {
      // Increment retry count and update last retry time
      user.email_retry_count += 1;
      user.email_last_retry_at = new Date();
      await user.save();

      // Log failed retry
      try {
        await Activity.create({
          userId: adminId,
          action: 'EMAIL_RETRY_FAILED',
          description: `Email retry failed for member ${user.member_id}. Attempt ${user.email_retry_count} of ${RETRY_CONFIG.MAX_RETRIES}`,
          metadata: {
            member_id: user.member_id,
            email: user.email,
            retry_count: user.email_retry_count,
            max_retries: RETRY_CONFIG.MAX_RETRIES,
            error: emailResult.error,
            is_manual_retry: isManualRetry,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log email retry failed activity:', activityError.message);
      }

      // Calculate next backoff delay
      const nextBackoffDelay = calculateBackoffDelay(user.email_retry_count);

      return {
        success: false,
        message: `Email retry failed. Attempt ${user.email_retry_count} of ${RETRY_CONFIG.MAX_RETRIES}`,
        userId,
        retryCount: user.email_retry_count,
        error: emailResult.error,
        nextRetryDelayMs: nextBackoffDelay,
        nextRetryDelaySeconds: Math.ceil(nextBackoffDelay / 1000),
      };
    }
  } catch (error) {
    // Log unexpected error
    try {
      await Activity.create({
        userId: adminId,
        action: 'EMAIL_RETRY_ERROR',
        description: `Unexpected error during email retry for user ${userId}: ${error.message}`,
        metadata: {
          user_id: userId,
          error: error.message,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log email retry error activity:', activityError.message);
    }

    return {
      success: false,
      message: `Unexpected error during email retry: ${error.message}`,
      userId,
      error: error.message,
    };
  }
}

/**
 * Retries failed SMS/email for multiple members with automatic backoff
 * This is typically called by a background job or scheduled task
 * 
 * @param {object} params - Parameters object
 * @param {array} params.memberIds - Array of member IDs to retry
 * @param {string} params.adminId - Admin ID performing the retry
 * @param {string} params.notificationType - 'sms' or 'email'
 * @param {string} params.temporaryPassword - Temporary password (for SMS only)
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with retry summary
 */
async function retryFailedNotifications({
  memberIds,
  adminId,
  notificationType,
  temporaryPassword,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  const results = {
    total: memberIds.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const memberId of memberIds) {
    try {
      const user = await User.findOne({ member_id: memberId });
      if (!user) {
        results.skipped++;
        results.details.push({
          memberId,
          success: false,
          message: `Member ${memberId} not found`,
          skipped: true,
        });
        continue;
      }

      let retryResult;
      if (notificationType === 'sms') {
        retryResult = await retrySMSWithBackoff({
          userId: user._id,
          adminId,
          temporaryPassword,
          cooperativeName,
          cooperativePhone,
          isManualRetry: false,
        });
      } else if (notificationType === 'email') {
        retryResult = await retryEmailWithBackoff({
          userId: user._id,
          adminId,
          cooperativeName,
          cooperativePhone,
          isManualRetry: false,
        });
      } else {
        results.skipped++;
        results.details.push({
          memberId,
          success: false,
          message: `Invalid notification type: ${notificationType}`,
          skipped: true,
        });
        continue;
      }

      if (retryResult.success) {
        results.successful++;
      } else if (retryResult.backoffActive) {
        results.skipped++;
      } else {
        results.failed++;
      }

      results.details.push({
        memberId,
        ...retryResult,
      });

      // Add delay between retries to avoid overwhelming the system
      await delay(100);
    } catch (error) {
      results.failed++;
      results.details.push({
        memberId,
        success: false,
        message: `Unexpected error: ${error.message}`,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  retrySMSWithBackoff,
  retryEmailWithBackoff,
  retryFailedNotifications,
  calculateBackoffDelay,
  RETRY_CONFIG,
};
