/**
 * SMS Service
 * Handles sending SMS invitations to members with temporary passwords
 * Logs SMS events in activity log and tracks failures
 */

const { User, Activity, ImportOperation } = require('../models');

/**
 * Sends SMS invitation to a member with temporary password
 * 
 * @param {object} params - Parameters object
 * @param {string} params.phoneNumber - Member's phone number
 * @param {string} params.memberName - Member's full name
 * @param {string} params.temporaryPassword - Temporary password to include in SMS
 * @param {string} params.cooperativeName - Name of the cooperative
 * @param {string} params.cooperativePhone - Cooperative contact phone
 * @returns {Promise<object>} - Result with success status and message
 */
async function sendSMSInvitation({
  phoneNumber,
  memberName,
  temporaryPassword,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  try {
    // Format SMS message with member name, password, and instructions
    const smsMessage = formatSMSMessage({
      memberName,
      temporaryPassword,
      cooperativeName,
      cooperativePhone,
    });

    // Send SMS (using mock implementation for now)
    // In production, integrate with actual SMS provider (Twilio, AWS SNS, etc.)
    const smsSendResult = await mockSendSMS({
      phoneNumber,
      message: smsMessage,
    });

    return {
      success: true,
      message: 'SMS sent successfully',
      phoneNumber,
      smsId: smsSendResult.smsId,
      sentAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to send SMS: ${error.message}`,
      phoneNumber,
      error: error.message,
    };
  }
}

/**
 * Formats SMS message with member information and instructions
 * 
 * @param {object} params - Parameters object
 * @param {string} params.memberName - Member's name
 * @param {string} params.temporaryPassword - Temporary password
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {string} - Formatted SMS message
 */
function formatSMSMessage({
  memberName,
  temporaryPassword,
  cooperativeName,
  cooperativePhone,
}) {
  return `Hello ${memberName},

Welcome to ${cooperativeName}! Your account has been created.

Temporary Password: ${temporaryPassword}

To log in and vote:
1. Visit the voting portal
2. Enter your Member ID and temporary password
3. Set a permanent password from your profile

For assistance, contact: ${cooperativePhone}

Thank you!`;
}

/**
 * Mock SMS sending function (replace with actual SMS provider)
 * In production, integrate with Twilio, AWS SNS, or similar service
 * 
 * @param {object} params - Parameters object
 * @param {string} params.phoneNumber - Recipient phone number
 * @param {string} params.message - SMS message content
 * @returns {Promise<object>} - SMS send result
 */
async function mockSendSMS({ phoneNumber, message }) {
  // Simulate SMS sending delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In production, this would call actual SMS provider API
  // For now, we simulate success with a mock SMS ID
  return {
    smsId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    phoneNumber,
    status: 'sent',
    timestamp: new Date(),
  };
}

/**
 * Sends SMS to a member and logs the event
 * Updates user's sms_sent_at timestamp
 * 
 * @param {object} params - Parameters object
 * @param {string} params.userId - User ID to send SMS to
 * @param {string} params.adminId - Admin ID performing the action
 * @param {string} params.temporaryPassword - Temporary password to send
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with SMS send status and activity log entry
 */
async function sendSMSAndLog({
  userId,
  adminId,
  temporaryPassword,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  try {
    // Fetch user to get phone number and name
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!user.phone_number) {
      throw new Error(`User ${user.member_id} has no phone number on file`);
    }

    // Send SMS invitation
    const smsResult = await sendSMSInvitation({
      phoneNumber: user.phone_number,
      memberName: user.fullName,
      temporaryPassword,
      cooperativeName,
      cooperativePhone,
    });

    if (smsResult.success) {
      // Update user's sms_sent_at timestamp
      user.sms_sent_at = new Date();
      await user.save();

      // Log SMS send event in activity log (if Activity model is available)
      try {
        await Activity.create({
          userId: adminId,
          action: 'SMS_SENT',
          description: `SMS invitation sent to member ${user.member_id} (${user.phone_number})`,
          metadata: {
            member_id: user.member_id,
            phone_number: user.phone_number,
            sms_id: smsResult.smsId,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        // Activity logging is optional, don't fail if it errors
        console.warn('Failed to log SMS activity:', activityError.message);
      }

      return {
        success: true,
        message: 'SMS sent and logged successfully',
        userId,
        smsId: smsResult.smsId,
        sentAt: smsResult.sentAt,
      };
    } else {
      // Log SMS failure (if Activity model is available)
      try {
        await Activity.create({
          userId: adminId,
          action: 'SMS_SENT',
          description: `Failed to send SMS to member ${user.member_id}: ${smsResult.message}`,
          metadata: {
            member_id: user.member_id,
            phone_number: user.phone_number,
            error: smsResult.error,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        // Activity logging is optional, don't fail if it errors
        console.warn('Failed to log SMS failure activity:', activityError.message);
      }

      // Mark user as sms_failed
      user.activation_status = 'sms_failed';
      await user.save();

      // Update import operation SMS failure count
      if (user.import_id) {
        try {
          await ImportOperation.findByIdAndUpdate(
            user.import_id,
            { $inc: { sms_failed_count: 1 } }
          );
        } catch (importError) {
          // Import operation update is optional, don't fail if it errors
          console.warn('Failed to update import operation:', importError.message);
        }
      }

      return {
        success: false,
        message: smsResult.message,
        userId,
        error: smsResult.error,
      };
    }
  } catch (error) {
    // Log unexpected error (if Activity model is available)
    try {
      await Activity.create({
        userId: adminId,
        action: 'SMS_SENT',
        description: `Unexpected error sending SMS to user ${userId}: ${error.message}`,
        metadata: {
          user_id: userId,
          error: error.message,
        },
      });
    } catch (activityError) {
      // Activity logging is optional, don't fail if it errors
      console.warn('Failed to log SMS error activity:', activityError.message);
    }

    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      userId,
      error: error.message,
    };
  }
}

/**
 * Sends SMS to multiple members (bulk SMS sending)
 * 
 * @param {object} params - Parameters object
 * @param {array} params.members - Array of member objects with userId, temporaryPassword
 * @param {string} params.adminId - Admin ID performing the action
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with success/failure counts
 */
async function sendBulkSMS({
  members,
  adminId,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  const results = {
    total: members.length,
    successful: 0,
    failed: 0,
    details: [],
  };

  for (const member of members) {
    const result = await sendSMSAndLog({
      userId: member.userId,
      adminId,
      temporaryPassword: member.temporaryPassword,
      cooperativeName,
      cooperativePhone,
    });

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }

    results.details.push(result);
  }

  return results;
}

module.exports = {
  sendSMSInvitation,
  sendSMSAndLog,
  sendBulkSMS,
  formatSMSMessage,
};
