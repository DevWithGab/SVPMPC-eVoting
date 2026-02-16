/**
 * Email Service
 * Handles sending email invitations to members with activation links
 * Logs email events in activity log and tracks failures
 */

const { User, Activity, ImportOperation } = require('../models');

/**
 * Generates an activation token for email-based activation
 * In production, this would be a secure, unique token stored in the database
 * 
 * @param {string} userId - User ID
 * @returns {string} - Activation token
 */
function generateActivationToken(userId) {
  // Generate a secure token (in production, store this in database with expiration)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${userId}_${timestamp}_${random}`;
}

/**
 * Generates the activation link URL
 * 
 * @param {string} activationToken - Activation token
 * @param {string} baseUrl - Base URL of the application (from env)
 * @returns {string} - Full activation link
 */
function generateActivationLink(activationToken, baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173') {
  return `${baseUrl}/activate?token=${activationToken}`;
}

/**
 * Sends email invitation to a member with activation link
 * 
 * @param {object} params - Parameters object
 * @param {string} params.email - Member's email address
 * @param {string} params.memberName - Member's full name
 * @param {string} params.activationLink - Activation link URL
 * @param {string} params.cooperativeName - Name of the cooperative
 * @param {string} params.cooperativePhone - Cooperative contact phone
 * @returns {Promise<object>} - Result with success status and message
 */
async function sendEmailInvitation({
  email,
  memberName,
  activationLink,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  try {
    // Format email message with member name, activation link, and instructions
    const emailContent = formatEmailMessage({
      memberName,
      activationLink,
      cooperativeName,
      cooperativePhone,
    });

    // Send email (using mock implementation for now)
    // In production, integrate with actual email provider (SendGrid, AWS SES, Nodemailer, etc.)
    const emailSendResult = await mockSendEmail({
      email,
      subject: `${cooperativeName} - Activate Your Account`,
      htmlContent: emailContent.html,
      textContent: emailContent.text,
    });

    return {
      success: true,
      message: 'Email sent successfully',
      email,
      emailId: emailSendResult.emailId,
      sentAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to send email: ${error.message}`,
      email,
      error: error.message,
    };
  }
}

/**
 * Formats email message with member information and activation link
 * 
 * @param {object} params - Parameters object
 * @param {string} params.memberName - Member's name
 * @param {string} params.activationLink - Activation link
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {object} - Object with html and text content
 */
function formatEmailMessage({
  memberName,
  activationLink,
  cooperativeName,
  cooperativePhone,
}) {
  const textContent = `Hello ${memberName},

Welcome to ${cooperativeName}! Your account has been created.

To activate your account and set your password, please click the link below:
${activationLink}

This link will expire in 24 hours.

Instructions:
1. Click the activation link above
2. Set a permanent password (minimum 8 characters, must include uppercase, lowercase, number, and special character)
3. Log in to the voting portal

If you did not receive an SMS with a temporary password, you can use this email link to activate your account.

For assistance, contact: ${cooperativePhone}

Thank you!`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${cooperativeName}</h1>
      <p>Account Activation</p>
    </div>
    <div class="content">
      <p>Hello ${memberName},</p>
      
      <p>Welcome to ${cooperativeName}! Your account has been created.</p>
      
      <p>To activate your account and set your password, please click the button below:</p>
      
      <a href="${activationLink}" class="button">Activate Your Account</a>
      
      <p><strong>This link will expire in 24 hours.</strong></p>
      
      <h3>Instructions:</h3>
      <ol>
        <li>Click the activation link above</li>
        <li>Set a permanent password (minimum 8 characters, must include uppercase, lowercase, number, and special character)</li>
        <li>Log in to the voting portal</li>
      </ol>
      
      <p>If you did not receive an SMS with a temporary password, you can use this email link to activate your account.</p>
      
      <p>If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${activationLink}">${activationLink}</a></p>
      
      <div class="footer">
        <p>For assistance, contact: ${cooperativePhone}</p>
        <p>Thank you!</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return { html: htmlContent, text: textContent };
}

/**
 * Mock email sending function (replace with actual email provider)
 * In production, integrate with SendGrid, AWS SES, Nodemailer, or similar service
 * 
 * @param {object} params - Parameters object
 * @param {string} params.email - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.htmlContent - HTML email content
 * @param {string} params.textContent - Plain text email content
 * @returns {Promise<object>} - Email send result
 */
async function mockSendEmail({ email, subject, htmlContent, textContent }) {
  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In production, this would call actual email provider API
  // For now, we simulate success with a mock email ID
  return {
    emailId: `EMAIL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    email,
    status: 'sent',
    timestamp: new Date(),
  };
}

/**
 * Sends email to a member and logs the event
 * Updates user's email_sent_at timestamp
 * 
 * @param {object} params - Parameters object
 * @param {string} params.userId - User ID to send email to
 * @param {string} params.adminId - Admin ID performing the action
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with email send status and activity log entry
 */
async function sendEmailAndLog({
  userId,
  adminId,
  cooperativeName = 'SVMPC',
  cooperativePhone = '+1-800-SVMPC-1',
}) {
  try {
    // Fetch user to get email and name
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!user.email) {
      throw new Error(`User ${user.member_id} has no email address on file`);
    }

    // Generate activation token and link
    const activationToken = generateActivationToken(userId);
    const activationLink = generateActivationLink(activationToken);

    // Send email invitation
    const emailResult = await sendEmailInvitation({
      email: user.email,
      memberName: user.fullName,
      activationLink,
      cooperativeName,
      cooperativePhone,
    });

    if (emailResult.success) {
      // Update user's email_sent_at timestamp
      user.email_sent_at = new Date();
      await user.save();

      // Log email send event in activity log (if Activity model is available)
      try {
        await Activity.create({
          userId: adminId,
          action: 'EMAIL_SENT',
          description: `Email invitation sent to member ${user.member_id} (${user.email})`,
          metadata: {
            member_id: user.member_id,
            email: user.email,
            email_id: emailResult.emailId,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        // Activity logging is optional, don't fail if it errors
        console.warn('Failed to log email activity:', activityError.message);
      }

      return {
        success: true,
        message: 'Email sent and logged successfully',
        userId,
        emailId: emailResult.emailId,
        sentAt: emailResult.sentAt,
      };
    } else {
      // Log email failure (if Activity model is available)
      try {
        await Activity.create({
          userId: adminId,
          action: 'EMAIL_SENT',
          description: `Failed to send email to member ${user.member_id}: ${emailResult.message}`,
          metadata: {
            member_id: user.member_id,
            email: user.email,
            error: emailResult.error,
            import_id: user.import_id,
          },
        });
      } catch (activityError) {
        // Activity logging is optional, don't fail if it errors
        console.warn('Failed to log email failure activity:', activityError.message);
      }

      // Mark user as email_failed
      user.activation_status = 'email_failed';
      await user.save();

      // Update import operation email failure count
      if (user.import_id) {
        try {
          await ImportOperation.findByIdAndUpdate(
            user.import_id,
            { $inc: { email_failed_count: 1 } }
          );
        } catch (importError) {
          // Import operation update is optional, don't fail if it errors
          console.warn('Failed to update import operation:', importError.message);
        }
      }

      return {
        success: false,
        message: emailResult.message,
        userId,
        error: emailResult.error,
      };
    }
  } catch (error) {
    // Log unexpected error (if Activity model is available)
    try {
      await Activity.create({
        userId: adminId,
        action: 'EMAIL_SENT',
        description: `Unexpected error sending email to user ${userId}: ${error.message}`,
        metadata: {
          user_id: userId,
          error: error.message,
        },
      });
    } catch (activityError) {
      // Activity logging is optional, don't fail if it errors
      console.warn('Failed to log email error activity:', activityError.message);
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
 * Sends email to multiple members (bulk email sending)
 * 
 * @param {object} params - Parameters object
 * @param {array} params.members - Array of member objects with userId
 * @param {string} params.adminId - Admin ID performing the action
 * @param {string} params.cooperativeName - Cooperative name
 * @param {string} params.cooperativePhone - Cooperative phone
 * @returns {Promise<object>} - Result with success/failure counts
 */
async function sendBulkEmail({
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
    const result = await sendEmailAndLog({
      userId: member.userId,
      adminId,
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
  sendEmailInvitation,
  sendEmailAndLog,
  sendBulkEmail,
  formatEmailMessage,
  generateActivationToken,
  generateActivationLink,
};
