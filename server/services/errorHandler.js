/**
 * Error Handler Service
 * Centralized error handling for bulk import operations
 * Provides specific error messages, logging, and recovery options
 */

const { Activity, ImportOperation, User } = require('../models');

/**
 * Custom error class for import-related errors
 */
class ImportError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for different failure scenarios
 */
const ERROR_CODES = {
  // CSV Upload Errors
  CSV_FILE_NOT_PROVIDED: 'CSV_FILE_NOT_PROVIDED',
  CSV_INVALID_FORMAT: 'CSV_INVALID_FORMAT',
  CSV_PARSE_ERROR: 'CSV_PARSE_ERROR',
  CSV_MISSING_COLUMNS: 'CSV_MISSING_COLUMNS',
  CSV_DUPLICATE_MEMBER_IDS: 'CSV_DUPLICATE_MEMBER_IDS',
  CSV_INVALID_DATA: 'CSV_INVALID_DATA',
  CSV_FILE_TOO_LARGE: 'CSV_FILE_TOO_LARGE',
  CSV_READ_ERROR: 'CSV_READ_ERROR',

  // Account Creation Errors
  ACCOUNT_CREATION_FAILED: 'ACCOUNT_CREATION_FAILED',
  DUPLICATE_MEMBER_ID: 'DUPLICATE_MEMBER_ID',
  DUPLICATE_PHONE_NUMBER: 'DUPLICATE_PHONE_NUMBER',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_MEMBER_DATA: 'INVALID_MEMBER_DATA',
  USER_SAVE_ERROR: 'USER_SAVE_ERROR',

  // Notification Errors
  SMS_SEND_FAILED: 'SMS_SEND_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  NO_PHONE_NUMBER: 'NO_PHONE_NUMBER',
  NO_EMAIL_ADDRESS: 'NO_EMAIL_ADDRESS',

  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_ROLLBACK: 'TRANSACTION_ROLLBACK',
  IMPORT_OPERATION_ERROR: 'IMPORT_OPERATION_ERROR',

  // General Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_INTERRUPTED: 'OPERATION_INTERRUPTED',
};

/**
 * Maps error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.CSV_FILE_NOT_PROVIDED]: 'No CSV file was provided. Please select a file to upload.',
  [ERROR_CODES.CSV_INVALID_FORMAT]: 'Invalid file format. Please upload a CSV file (.csv).',
  [ERROR_CODES.CSV_PARSE_ERROR]: 'Failed to parse CSV file. Please ensure the file is properly formatted.',
  [ERROR_CODES.CSV_MISSING_COLUMNS]: 'CSV file is missing required columns: {columns}. Required columns are: member_id, name, phone_number.',
  [ERROR_CODES.CSV_DUPLICATE_MEMBER_IDS]: 'CSV file contains duplicate member IDs: {duplicates}. Each member ID must be unique.',
  [ERROR_CODES.CSV_INVALID_DATA]: 'CSV file contains invalid data. Please review the errors below and correct them.',
  [ERROR_CODES.CSV_FILE_TOO_LARGE]: 'CSV file is too large. Maximum file size is {maxSize}MB.',
  [ERROR_CODES.CSV_READ_ERROR]: 'Failed to read CSV file. Please ensure the file is accessible and try again.',

  [ERROR_CODES.ACCOUNT_CREATION_FAILED]: 'Failed to create account for member {member_id}: {reason}',
  [ERROR_CODES.DUPLICATE_MEMBER_ID]: 'Member ID "{member_id}" already exists in the system. This row will be skipped.',
  [ERROR_CODES.DUPLICATE_PHONE_NUMBER]: 'Phone number "{phone_number}" is already registered. This row will be skipped.',
  [ERROR_CODES.DUPLICATE_EMAIL]: 'Email "{email}" is already registered. This row will be skipped.',
  [ERROR_CODES.INVALID_MEMBER_DATA]: 'Invalid member data: {reason}',
  [ERROR_CODES.USER_SAVE_ERROR]: 'Failed to save user account to database: {reason}',

  [ERROR_CODES.SMS_SEND_FAILED]: 'Failed to send SMS to member {member_id}. The member has been marked as "sms_failed" and can be retried later.',
  [ERROR_CODES.EMAIL_SEND_FAILED]: 'Failed to send email to member {member_id}. The member has been marked as "email_failed" and can be retried later.',
  [ERROR_CODES.NO_PHONE_NUMBER]: 'Member {member_id} has no phone number on file. Cannot send SMS.',
  [ERROR_CODES.NO_EMAIL_ADDRESS]: 'Member {member_id} has no email address on file. Cannot send email.',

  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred: {reason}. The import operation has been rolled back.',
  [ERROR_CODES.TRANSACTION_ROLLBACK]: 'Import operation was interrupted and rolled back. No changes were saved.',
  [ERROR_CODES.IMPORT_OPERATION_ERROR]: 'Failed to save import operation record: {reason}',

  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred: {reason}',
  [ERROR_CODES.OPERATION_INTERRUPTED]: 'Import operation was interrupted. {successful} members were successfully imported before the interruption.',
};

/**
 * Formats error message with placeholders
 * @param {string} template - Message template with {placeholder} syntax
 * @param {object} values - Object with placeholder values
 * @returns {string} - Formatted message
 */
function formatErrorMessage(template, values = {}) {
  let message = template;
  Object.keys(values).forEach(key => {
    message = message.replace(`{${key}}`, values[key]);
  });
  return message;
}

/**
 * Handles CSV upload errors
 * @param {Error} error - The error that occurred
 * @param {string} filename - The filename being processed
 * @returns {object} - Formatted error response
 */
function handleCSVUploadError(error, filename) {
  let errorCode = ERROR_CODES.UNKNOWN_ERROR;
  let details = {};

  if (error.message.includes('ENOENT')) {
    errorCode = ERROR_CODES.CSV_READ_ERROR;
  } else if (error.message.includes('EACCES')) {
    errorCode = ERROR_CODES.CSV_READ_ERROR;
    details.reason = 'File is not readable. Check file permissions.';
  } else if (error.message.includes('parse')) {
    errorCode = ERROR_CODES.CSV_PARSE_ERROR;
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    errorCode = ERROR_CODES.CSV_FILE_TOO_LARGE;
    details.maxSize = 10; // Default max size in MB
  }

  const message = formatErrorMessage(ERROR_MESSAGES[errorCode], details);

  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details: {
        filename,
        ...details,
      },
    },
  };
}

/**
 * Handles account creation errors
 * @param {Error} error - The error that occurred
 * @param {object} row - The CSV row being processed
 * @param {number} rowNumber - The row number in the CSV
 * @returns {object} - Formatted error response
 */
function handleAccountCreationError(error, row, rowNumber) {
  let errorCode = ERROR_CODES.ACCOUNT_CREATION_FAILED;
  let details = {
    member_id: row.member_id,
    row_number: rowNumber,
    reason: error.message,
  };

  // Check for specific error types
  if (error.message.includes('duplicate') || error.code === 11000) {
    const field = error.message.includes('member_id') ? 'member_id' : 
                  error.message.includes('phone_number') ? 'phone_number' : 'email';
    
    if (field === 'member_id') {
      errorCode = ERROR_CODES.DUPLICATE_MEMBER_ID;
      details.member_id = row.member_id;
    } else if (field === 'phone_number') {
      errorCode = ERROR_CODES.DUPLICATE_PHONE_NUMBER;
      details.phone_number = row.phone_number;
    } else if (field === 'email') {
      errorCode = ERROR_CODES.DUPLICATE_EMAIL;
      details.email = row.email;
    }
  } else if (error.message.includes('validation')) {
    errorCode = ERROR_CODES.INVALID_MEMBER_DATA;
    details.reason = error.message;
  }

  const message = formatErrorMessage(ERROR_MESSAGES[errorCode], details);

  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
    },
  };
}

/**
 * Handles SMS/Email notification errors
 * @param {Error} error - The error that occurred
 * @param {object} user - The user object
 * @param {string} notificationType - 'sms' or 'email'
 * @returns {object} - Formatted error response
 */
function handleNotificationError(error, user, notificationType) {
  let errorCode = notificationType === 'sms' ? ERROR_CODES.SMS_SEND_FAILED : ERROR_CODES.EMAIL_SEND_FAILED;
  let details = {
    member_id: user.member_id,
    reason: error.message,
  };

  if (notificationType === 'sms' && !user.phone_number) {
    errorCode = ERROR_CODES.NO_PHONE_NUMBER;
  } else if (notificationType === 'email' && !user.email) {
    errorCode = ERROR_CODES.NO_EMAIL_ADDRESS;
  }

  const message = formatErrorMessage(ERROR_MESSAGES[errorCode], details);

  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
    },
  };
}

/**
 * Handles database errors
 * @param {Error} error - The error that occurred
 * @param {string} operation - The operation being performed
 * @returns {object} - Formatted error response
 */
function handleDatabaseError(error, operation = 'unknown') {
  let errorCode = ERROR_CODES.DATABASE_ERROR;
  let details = {
    operation,
    reason: error.message,
  };

  if (error.message.includes('transaction')) {
    errorCode = ERROR_CODES.TRANSACTION_ROLLBACK;
  }

  const message = formatErrorMessage(ERROR_MESSAGES[errorCode], details);

  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
    },
  };
}

/**
 * Logs error to activity log
 * @param {string} userId - User ID (admin performing the action)
 * @param {string} errorCode - Error code
 * @param {string} errorMessage - Error message
 * @param {object} metadata - Additional metadata
 * @returns {Promise<void>}
 */
async function logErrorToActivity(userId, errorCode, errorMessage, metadata = {}) {
  try {
    await Activity.create({
      userId,
      action: 'IMPORT_ERROR',
      description: `Import error: ${errorCode} - ${errorMessage}`,
      metadata: {
        error_code: errorCode,
        error_message: errorMessage,
        ...metadata,
      },
    });
  } catch (activityError) {
    console.error('Failed to log error to activity:', activityError.message);
  }
}

/**
 * Updates import operation with error information
 * @param {string} importId - Import operation ID
 * @param {object} errorInfo - Error information
 * @returns {Promise<void>}
 */
async function updateImportOperationWithError(importId, errorInfo) {
  try {
    const importOp = await ImportOperation.findById(importId);
    if (importOp) {
      if (!importOp.import_errors) {
        importOp.import_errors = [];
      }
      importOp.import_errors.push(errorInfo);
      await importOp.save();
    }
  } catch (error) {
    console.error('Failed to update import operation with error:', error.message);
  }
}

/**
 * Marks member as failed for a specific notification type
 * @param {string} userId - User ID
 * @param {string} notificationType - 'sms' or 'email'
 * @returns {Promise<void>}
 */
async function markMemberNotificationFailed(userId, notificationType) {
  try {
    const user = await User.findById(userId);
    if (user) {
      if (notificationType === 'sms') {
        user.activation_status = 'sms_failed';
      } else if (notificationType === 'email') {
        user.activation_status = 'email_failed';
      }
      await user.save();
    }
  } catch (error) {
    console.error(`Failed to mark member as ${notificationType}_failed:`, error.message);
  }
}

/**
 * Handles partial import recovery
 * Returns information about successfully imported members before interruption
 * @param {string} importId - Import operation ID
 * @returns {Promise<object>} - Recovery information
 */
async function getPartialImportRecovery(importId) {
  try {
    const importOp = await ImportOperation.findById(importId);
    if (!importOp) {
      return {
        success: false,
        message: 'Import operation not found',
      };
    }

    const successfulMembers = await User.find({
      import_id: importId,
      activation_status: { $ne: 'pending_activation' },
    }).select('member_id fullName phone_number activation_status');

    return {
      success: true,
      message: `Found ${successfulMembers.length} successfully imported members`,
      data: {
        import_id: importId,
        total_successful: importOp.successful_imports,
        total_failed: importOp.failed_imports,
        total_skipped: importOp.skipped_rows,
        successful_members: successfulMembers,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to retrieve partial import recovery: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Validates error recovery is possible
 * @param {string} importId - Import operation ID
 * @returns {Promise<object>} - Validation result
 */
async function validateRecoveryPossible(importId) {
  try {
    const importOp = await ImportOperation.findById(importId);
    if (!importOp) {
      return {
        canRecover: false,
        reason: 'Import operation not found',
      };
    }

    if (importOp.status === 'completed') {
      return {
        canRecover: false,
        reason: 'Import operation already completed',
      };
    }

    const failedMembers = await User.find({
      import_id: importId,
      activation_status: { $in: ['sms_failed', 'email_failed'] },
    }).countDocuments();

    return {
      canRecover: true,
      reason: 'Import can be retried',
      data: {
        failed_members_count: failedMembers,
        import_status: importOp.status,
      },
    };
  } catch (error) {
    return {
      canRecover: false,
      reason: `Failed to validate recovery: ${error.message}`,
    };
  }
}

module.exports = {
  ImportError,
  ERROR_CODES,
  ERROR_MESSAGES,
  formatErrorMessage,
  handleCSVUploadError,
  handleAccountCreationError,
  handleNotificationError,
  handleDatabaseError,
  logErrorToActivity,
  updateImportOperationWithError,
  markMemberNotificationFailed,
  getPartialImportRecovery,
  validateRecoveryPossible,
};
