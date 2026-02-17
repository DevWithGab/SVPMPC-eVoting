/**
 * Bulk Account Creation Service
 * Handles creating member accounts from validated CSV data
 * Includes comprehensive error handling and recovery
 */

const { User, ImportOperation, Activity } = require('../models');
const { generateTemporaryPassword, hashTemporaryPassword } = require('./passwordGenerator');
const { sendSMSAndLog } = require('./smsService');
const {
  handleAccountCreationError,
  handleNotificationError,
  logErrorToActivity,
  updateImportOperationWithError,
  markMemberNotificationFailed,
} = require('./errorHandler');

/**
 * Creates bulk member accounts from validated CSV data
 * Implements error handling that continues processing on individual failures
 * 
 * @param {object} params - Parameters object
 * @param {object[]} params.validRows - Array of validated CSV rows
 * @param {string} params.csvFileName - Original CSV file name
 * @param {string} params.adminId - Admin user ID performing the import
 * @param {string} params.adminName - Admin user name for audit trail
 * @returns {Promise<object>} - Import operation result with statistics
 */
async function createBulkAccounts({ validRows, csvFileName, adminId, adminName }) {
  const importOperation = new ImportOperation({
    admin_id: adminId,
    admin_name: adminName,
    csv_file_name: csvFileName,
    total_rows: validRows.length,
    status: 'pending',
  });

  let successfulImports = 0;
  let failedImports = 0;
  let skippedRows = 0;
  let smsSentCount = 0;
  let smsFailedCount = 0;
  const importErrors = [];
  const createdUsers = [];

  // Save import operation first to get ID for tracking
  try {
    await importOperation.save();
  } catch (error) {
    console.error('Failed to create import operation record:', error.message);
    throw new Error(`Failed to initialize import operation: ${error.message}`);
  }

  // Process each validated row
  for (const row of validRows) {
    try {
      // Check for existing member_id
      const existingMemberId = await User.findOne({ member_id: row.member_id });
      if (existingMemberId) {
        skippedRows++;
        const errorInfo = {
          row_number: row._rowNumber,
          member_id: row.member_id,
          error_message: `Duplicate member_id "${row.member_id}" already exists in system`,
          error_code: 'DUPLICATE_MEMBER_ID',
        };
        importErrors.push(errorInfo);
        await updateImportOperationWithError(importOperation._id, errorInfo);
        continue;
      }

      // Check for existing phone_number
      const existingPhone = await User.findOne({ phone_number: row.phone_number });
      if (existingPhone) {
        skippedRows++;
        const errorInfo = {
          row_number: row._rowNumber,
          member_id: row.member_id,
          error_message: `Duplicate phone_number "${row.phone_number}" already exists in system`,
          error_code: 'DUPLICATE_PHONE_NUMBER',
        };
        importErrors.push(errorInfo);
        await updateImportOperationWithError(importOperation._id, errorInfo);
        continue;
      }

      // Check for existing email (if provided)
      if (row.email) {
        const existingEmail = await User.findOne({ email: row.email });
        if (existingEmail) {
          skippedRows++;
          const errorInfo = {
            row_number: row._rowNumber,
            member_id: row.member_id,
            error_message: `Duplicate email "${row.email}" already exists in system`,
            error_code: 'DUPLICATE_EMAIL',
          };
          importErrors.push(errorInfo);
          await updateImportOperationWithError(importOperation._id, errorInfo);
          continue;
        }
      }

      // Generate temporary password
      let tempPassword;
      let hashedTempPassword;
      try {
        tempPassword = generateTemporaryPassword();
        hashedTempPassword = await hashTemporaryPassword(tempPassword);
      } catch (error) {
        failedImports++;
        const errorInfo = {
          row_number: row._rowNumber,
          member_id: row.member_id,
          error_message: `Failed to generate temporary password: ${error.message}`,
          error_code: 'PASSWORD_GENERATION_ERROR',
        };
        importErrors.push(errorInfo);
        await updateImportOperationWithError(importOperation._id, errorInfo);
        await logErrorToActivity(adminId, 'PASSWORD_GENERATION_ERROR', errorInfo.error_message, {
          member_id: row.member_id,
          row_number: row._rowNumber,
        });
        continue;
      }

      // Create new user account
      let newUser;
      try {
        newUser = new User({
          username: `member_${row.member_id}`,
          member_id: row.member_id,
          fullName: row.name,
          phone_number: row.phone_number,
          email: row.email || `member_${row.member_id}@svmpc.local`, // Generate placeholder email if not provided
          password: 'TempPassword123!', // Will be hashed by pre-save hook, but we use temporary password for login
          role: 'member',
          activation_status: 'pending_activation',
          import_id: importOperation._id,
          temporary_password_hash: hashedTempPassword,
          temporary_password_expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });

        await newUser.save();
      } catch (error) {
        failedImports++;
        const errorResponse = handleAccountCreationError(error, row, row._rowNumber);
        const errorInfo = {
          row_number: row._rowNumber,
          member_id: row.member_id,
          error_message: errorResponse.error.message,
          error_code: errorResponse.error.code,
        };
        importErrors.push(errorInfo);
        await updateImportOperationWithError(importOperation._id, errorInfo);
        await logErrorToActivity(adminId, errorResponse.error.code, errorResponse.error.message, {
          member_id: row.member_id,
          row_number: row._rowNumber,
        });
        continue;
      }

      // Send SMS invitation to member
      let smsResult = { success: false, message: 'SMS not sent' };
      try {
        smsResult = await sendSMSAndLog({
          userId: newUser._id,
          adminId,
          temporaryPassword: tempPassword,
          cooperativeName: 'SVMPC',
          cooperativePhone: '+1-800-SVMPC-1',
        });
      } catch (smsError) {
        // Log SMS error but don't fail the account creation
        smsResult = {
          success: false,
          message: `SMS error: ${smsError.message}`,
        };
        const errorResponse = handleNotificationError(smsError, newUser, 'sms');
        const errorInfo = {
          row_number: row._rowNumber,
          member_id: newUser.member_id,
          error_message: errorResponse.error.message,
          error_code: errorResponse.error.code,
        };
        await updateImportOperationWithError(importOperation._id, errorInfo);
        await logErrorToActivity(adminId, errorResponse.error.code, errorResponse.error.message, {
          member_id: newUser.member_id,
          user_id: newUser._id,
        });
        // Mark member as sms_failed
        await markMemberNotificationFailed(newUser._id, 'sms');
      }

      if (smsResult.success) {
        smsSentCount++;
      } else {
        smsFailedCount++;
      }

      // Store the plain temporary password for return (will be sent via SMS)
      createdUsers.push({
        userId: newUser._id,
        member_id: newUser.member_id,
        name: newUser.fullName,
        phone_number: newUser.phone_number,
        email: newUser.email,
        temporary_password: tempPassword,
        rowNumber: row._rowNumber,
        smsSent: smsResult.success,
        smsError: smsResult.success ? null : smsResult.message,
      });

      successfulImports++;
    } catch (error) {
      // Catch-all for unexpected errors
      failedImports++;
      const errorInfo = {
        row_number: row._rowNumber,
        member_id: row.member_id,
        error_message: `Unexpected error: ${error.message}`,
        error_code: 'UNKNOWN_ERROR',
      };
      importErrors.push(errorInfo);
      await updateImportOperationWithError(importOperation._id, errorInfo);
      await logErrorToActivity(adminId, 'UNKNOWN_ERROR', errorInfo.error_message, {
        member_id: row.member_id,
        row_number: row._rowNumber,
        stack: error.stack,
      });
    }
  }

  // Update import operation with final statistics
  try {
    importOperation.successful_imports = successfulImports;
    importOperation.failed_imports = failedImports;
    importOperation.skipped_rows = skippedRows;
    importOperation.sms_sent_count = smsSentCount;
    importOperation.sms_failed_count = smsFailedCount;
    importOperation.import_errors = importErrors;
    importOperation.status = 'completed';

    await importOperation.save();
  } catch (error) {
    console.error('Failed to update import operation:', error.message);
    await logErrorToActivity(adminId, 'IMPORT_OPERATION_ERROR', `Failed to save import operation: ${error.message}`, {
      import_id: importOperation._id,
    });
  }

  // Log the bulk import operation
  try {
    await Activity.create({
      userId: adminId,
      action: 'BULK_IMPORT',
      description: `Bulk imported ${successfulImports} members from CSV file "${csvFileName}". Failed: ${failedImports}, Skipped: ${skippedRows}`,
      metadata: {
        import_id: importOperation._id,
        total_rows: validRows.length,
        successful_imports: successfulImports,
        failed_imports: failedImports,
        skipped_rows: skippedRows,
        sms_sent_count: smsSentCount,
        sms_failed_count: smsFailedCount,
      },
    });
  } catch (activityError) {
    console.error('Failed to log bulk import activity:', activityError.message);
  }

  return {
    importOperation: importOperation.toJSON(),
    createdUsers,
    statistics: {
      total_rows: validRows.length,
      successful_imports: successfulImports,
      failed_imports: failedImports,
      skipped_rows: skippedRows,
      sms_sent_count: smsSentCount,
      sms_failed_count: smsFailedCount,
      import_errors: importErrors,
    },
  };
}

module.exports = {
  createBulkAccounts,
};
