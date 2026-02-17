/**
 * Resend Invitation Service
 * Handles resending invitations to members who haven't activated
 * Generates new temporary passwords and sends SMS/email
 */

const { User, Activity, ImportOperation } = require('../models');
const { generateTemporaryPassword, hashTemporaryPassword } = require('./passwordGenerator');
const { sendSMSAndLog } = require('./smsService');
const { sendEmailAndLog } = require('./emailService');

/**
 * Resend invitation to a single member
 * Generates new temporary password, invalidates old one, sends SMS/email
 * 
 * @param {object} params - Parameters object
 * @param {string} params.userId - User ID to resend invitation to
 * @param {string} params.adminId - Admin ID performing the action
 * @param {string} params.deliveryMethod - Delivery method ('sms' or 'email')
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with success status and details
 */
async function resendInvitation({
  userId,
  adminId,
  deliveryMethod = 'sms',
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  try {
    // Validate delivery method
    if (!['sms', 'email'].includes(deliveryMethod)) {
      return {
        success: false,
        message: 'Invalid delivery method. Must be "sms" or "email"',
        userId,
      };
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: `User with ID ${userId} not found`,
        userId,
      };
    }

    // Check if user is an imported member
    if (!user.import_id) {
      return {
        success: false,
        message: `User ${user.member_id} is not an imported member`,
        userId,
      };
    }

    // Check if user has pending activation status
    if (user.activation_status !== 'pending_activation') {
      return {
        success: false,
        message: `User ${user.member_id} has status "${user.activation_status}", not "pending_activation"`,
        userId,
      };
    }

    // Generate new temporary password
    const newTemporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashTemporaryPassword(newTemporaryPassword);

    // Invalidate old temporary password and set new one
    user.temporary_password_hash = hashedPassword;
    user.temporary_password_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    user.sms_sent_at = null; // Reset SMS sent timestamp
    user.email_sent_at = null; // Reset email sent timestamp

    // Save user changes
    await user.save();

    // Send invitation based on delivery method
    let sendResult;
    if (deliveryMethod === 'sms') {
      // Check if user has phone number
      if (!user.phone_number) {
        return {
          success: false,
          message: `User ${user.member_id} has no phone number on file`,
          userId,
        };
      }

      sendResult = await sendSMSAndLog({
        userId,
        adminId,
        temporaryPassword: newTemporaryPassword,
        cooperativeName,
        cooperativePhone,
      });
    } else {
      // Email delivery
      // Check if user has email
      if (!user.email) {
        return {
          success: false,
          message: `User ${user.member_id} has no email address on file`,
          userId,
        };
      }

      sendResult = await sendEmailAndLog({
        userId,
        adminId,
        cooperativeName,
        cooperativePhone,
      });
    }

    if (!sendResult.success) {
      return {
        success: false,
        message: `Failed to send ${deliveryMethod} invitation: ${sendResult.message}`,
        userId,
        error: sendResult.error,
      };
    }

    // Log resend event in activity log
    try {
      await Activity.create({
        userId: adminId,
        action: 'RESEND_INVITATION',
        description: `Resent ${deliveryMethod} invitation to member ${user.member_id}. New temporary password generated.`,
        metadata: {
          member_id: user.member_id,
          delivery_method: deliveryMethod,
          import_id: user.import_id,
          phone_number: user.phone_number,
          email: user.email,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log resend invitation activity:', activityError.message);
    }

    return {
      success: true,
      message: `${deliveryMethod.toUpperCase()} invitation resent successfully to member ${user.member_id}`,
      userId,
      memberId: user.member_id,
      deliveryMethod,
      sentAt: new Date(),
      temporaryPasswordExpires: user.temporary_password_expires,
    };
  } catch (error) {
    console.error('Error resending invitation:', error);
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      userId,
      error: error.message,
    };
  }
}

/**
 * Bulk resend invitations to multiple members
 * 
 * @param {object} params - Parameters object
 * @param {array} params.memberIds - Array of member IDs to resend to
 * @param {string} params.adminId - Admin ID performing the action
 * @param {string} params.deliveryMethod - Delivery method ('sms' or 'email')
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with success/failure counts
 */
async function bulkResendInvitations({
  memberIds,
  adminId,
  deliveryMethod = 'sms',
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
    const result = await resendInvitation({
      userId: memberId,
      adminId,
      deliveryMethod,
      cooperativeName,
      cooperativePhone,
    });

    if (result.success) {
      results.successful++;
    } else if (result.message.includes('not "pending_activation"') || result.message.includes('not an imported member')) {
      results.skipped++;
    } else {
      results.failed++;
    }

    results.details.push(result);
  }

  // Log bulk resend operation
  try {
    await Activity.create({
      userId: adminId,
      action: 'BULK_RESEND_INVITATIONS',
      description: `Bulk resend of ${deliveryMethod} invitations to ${memberIds.length} members. Success: ${results.successful}, Failed: ${results.failed}, Skipped: ${results.skipped}`,
      metadata: {
        delivery_method: deliveryMethod,
        member_count: memberIds.length,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
      },
    });
  } catch (activityError) {
    console.warn('Failed to log bulk resend activity:', activityError.message);
  }

  return results;
}

module.exports = {
  resendInvitation,
  bulkResendInvitations,
};
