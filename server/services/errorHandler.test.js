/**
 * Error Handler Service Tests
 * Tests comprehensive error handling for bulk import operations
 */

const {
  ImportError,
  ERROR_CODES,
  ERROR_MESSAGES,
  formatErrorMessage,
  handleCSVUploadError,
  handleAccountCreationError,
  handleNotificationError,
  handleDatabaseError,
} = require('./errorHandler');

describe('Error Handler Service', () => {
  describe('formatErrorMessage', () => {
    test('should format error message with placeholders', () => {
      const template = 'Failed to create account for member {member_id}: {reason}';
      const values = { member_id: 'M001', reason: 'Duplicate entry' };
      const result = formatErrorMessage(template, values);
      expect(result).toBe('Failed to create account for member M001: Duplicate entry');
    });

    test('should handle missing placeholder values', () => {
      const template = 'Error: {code} - {message}';
      const values = { code: 'ERR001' };
      const result = formatErrorMessage(template, values);
      expect(result).toBe('Error: ERR001 - {message}');
    });

    test('should handle empty values object', () => {
      const template = 'Simple error message';
      const result = formatErrorMessage(template, {});
      expect(result).toBe('Simple error message');
    });
  });

  describe('handleCSVUploadError', () => {
    test('should handle file not found error', () => {
      const error = new Error('ENOENT: no such file or directory');
      const result = handleCSVUploadError(error, 'test.csv');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.CSV_READ_ERROR);
      expect(result.error.details.filename).toBe('test.csv');
    });

    test('should handle file permission error', () => {
      const error = new Error('EACCES: permission denied');
      const result = handleCSVUploadError(error, 'test.csv');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.CSV_READ_ERROR);
      expect(result.error.details.reason).toContain('permissions');
    });

    test('should handle parse error', () => {
      const error = new Error('Failed to parse CSV');
      const result = handleCSVUploadError(error, 'test.csv');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.CSV_PARSE_ERROR);
    });

    test('should handle file size limit error', () => {
      const error = { code: 'LIMIT_FILE_SIZE', message: 'File too large' };
      const result = handleCSVUploadError(error, 'large.csv');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.CSV_FILE_TOO_LARGE);
    });
  });

  describe('handleAccountCreationError', () => {
    test('should handle duplicate member_id error', () => {
      const error = new Error('E11000 duplicate key error collection: users index: member_id_1');
      const row = { member_id: 'M001', name: 'John Doe', phone_number: '1234567890' };
      const result = handleAccountCreationError(error, row, 2);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.DUPLICATE_MEMBER_ID);
      expect(result.error.details.member_id).toBe('M001');
      expect(result.error.details.row_number).toBe(2);
    });

    test('should handle duplicate phone_number error', () => {
      const error = new Error('E11000 duplicate key error collection: users index: phone_number_1');
      const row = { member_id: 'M001', name: 'John Doe', phone_number: '1234567890' };
      const result = handleAccountCreationError(error, row, 3);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.DUPLICATE_PHONE_NUMBER);
      expect(result.error.details.phone_number).toBe('1234567890');
    });

    test('should handle duplicate email error', () => {
      const error = new Error('E11000 duplicate key error collection: users index: email_1');
      const row = { member_id: 'M001', name: 'John Doe', phone_number: '1234567890', email: 'john@example.com' };
      const result = handleAccountCreationError(error, row, 4);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.DUPLICATE_EMAIL);
      expect(result.error.details.email).toBe('john@example.com');
    });

    test('should handle validation error', () => {
      const error = new Error('Validation failed: name is required');
      const row = { member_id: 'M001', name: '', phone_number: '1234567890' };
      const result = handleAccountCreationError(error, row, 5);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.INVALID_MEMBER_DATA);
    });

    test('should handle generic account creation error', () => {
      const error = new Error('Unknown database error');
      const row = { member_id: 'M001', name: 'John Doe', phone_number: '1234567890' };
      const result = handleAccountCreationError(error, row, 6);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.ACCOUNT_CREATION_FAILED);
    });
  });

  describe('handleNotificationError', () => {
    test('should handle SMS send failure', () => {
      const error = new Error('SMS provider timeout');
      const user = { member_id: 'M001', phone_number: '1234567890' };
      const result = handleNotificationError(error, user, 'sms');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.SMS_SEND_FAILED);
      expect(result.error.details.member_id).toBe('M001');
    });

    test('should handle email send failure', () => {
      const error = new Error('Email service unavailable');
      const user = { member_id: 'M001', email: 'john@example.com' };
      const result = handleNotificationError(error, user, 'email');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.EMAIL_SEND_FAILED);
    });

    test('should handle missing phone number for SMS', () => {
      const error = new Error('No phone number');
      const user = { member_id: 'M001', phone_number: null };
      const result = handleNotificationError(error, user, 'sms');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.NO_PHONE_NUMBER);
    });

    test('should handle missing email for email notification', () => {
      const error = new Error('No email');
      const user = { member_id: 'M001', email: null };
      const result = handleNotificationError(error, user, 'email');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.NO_EMAIL_ADDRESS);
    });
  });

  describe('handleDatabaseError', () => {
    test('should handle generic database error', () => {
      const error = new Error('Connection timeout');
      const result = handleDatabaseError(error, 'user_save');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(result.error.details.operation).toBe('user_save');
    });

    test('should handle transaction rollback error', () => {
      const error = new Error('Transaction aborted');
      const result = handleDatabaseError(error, 'bulk_import');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.TRANSACTION_ROLLBACK);
    });
  });

  describe('ImportError class', () => {
    test('should create ImportError with code and details', () => {
      const error = new ImportError('Test error', ERROR_CODES.CSV_INVALID_FORMAT, { filename: 'test.txt' });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.CSV_INVALID_FORMAT);
      expect(error.details.filename).toBe('test.txt');
      expect(error.name).toBe('ImportError');
    });
  });

  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.CSV_FILE_NOT_PROVIDED).toBeDefined();
      expect(ERROR_CODES.CSV_INVALID_FORMAT).toBeDefined();
      expect(ERROR_CODES.ACCOUNT_CREATION_FAILED).toBeDefined();
      expect(ERROR_CODES.SMS_SEND_FAILED).toBeDefined();
      expect(ERROR_CODES.DATABASE_ERROR).toBeDefined();
    });
  });

  describe('ERROR_MESSAGES', () => {
    test('should have messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach(code => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code]).toBe('string');
      });
    });

    test('should have placeholder templates in messages', () => {
      expect(ERROR_MESSAGES[ERROR_CODES.CSV_MISSING_COLUMNS]).toContain('{columns}');
      expect(ERROR_MESSAGES[ERROR_CODES.ACCOUNT_CREATION_FAILED]).toContain('{member_id}');
      expect(ERROR_MESSAGES[ERROR_CODES.SMS_SEND_FAILED]).toContain('{member_id}');
    });
  });
});
