/**
 * Bulk Account Creation Service Tests
 * Tests error handling during bulk account creation
 */

const { createBulkAccounts } = require('./bulkAccountCreation');
const { User, ImportOperation, Activity } = require('../models');

// Mock the models
jest.mock('../models');

// Mock the services
jest.mock('./passwordGenerator', () => ({
  generateTemporaryPassword: jest.fn(() => 'TempPass123!'),
  hashTemporaryPassword: jest.fn(async (pwd) => `hashed_${pwd}`),
}));

jest.mock('./smsService', () => ({
  sendSMSAndLog: jest.fn(),
}));

jest.mock('./errorHandler', () => ({
  handleAccountCreationError: jest.fn((error, row, rowNum) => ({
    error: {
      code: 'ACCOUNT_CREATION_FAILED',
      message: error.message,
    },
  })),
  handleNotificationError: jest.fn((error, user, type) => ({
    error: {
      code: `${type.toUpperCase()}_SEND_FAILED`,
      message: error.message,
    },
  })),
  logErrorToActivity: jest.fn(),
  updateImportOperationWithError: jest.fn(),
  markMemberNotificationFailed: jest.fn(),
}));

describe('Bulk Account Creation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBulkAccounts', () => {
    test('should create accounts and continue on individual failures', async () => {
      const validRows = [
        { member_id: 'M001', name: 'John Doe', phone_number: '1234567890', _rowNumber: 2 },
        { member_id: 'M002', name: 'Jane Smith', phone_number: '0987654321', _rowNumber: 3 },
      ];

      // Mock User.findOne to return null (no duplicates)
      User.findOne.mockResolvedValue(null);

      // Mock User.save
      const mockUser = {
        _id: 'user123',
        member_id: 'M001',
        fullName: 'John Doe',
        phone_number: '1234567890',
        save: jest.fn().mockResolvedValue({}),
      };
      User.mockImplementation(() => mockUser);

      // Mock ImportOperation.save
      const mockImportOp = {
        _id: 'import123',
        save: jest.fn().mockResolvedValue({}),
        toJSON: jest.fn(() => ({ _id: 'import123', status: 'completed' })),
      };
      ImportOperation.mockImplementation(() => mockImportOp);

      // Mock Activity.create
      Activity.create.mockResolvedValue({});

      // Mock sendSMSAndLog
      const { sendSMSAndLog } = require('./smsService');
      sendSMSAndLog.mockResolvedValue({ success: true, message: 'SMS sent' });

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: 'admin123',
        adminName: 'Admin User',
      });

      expect(result.statistics.successful_imports).toBeGreaterThan(0);
      expect(result.statistics.total_rows).toBe(2);
      expect(mockImportOp.save).toHaveBeenCalled();
      expect(Activity.create).toHaveBeenCalled();
    });

    test('should skip duplicate member_ids and continue processing', async () => {
      const validRows = [
        { member_id: 'M001', name: 'John Doe', phone_number: '1234567890', _rowNumber: 2 },
        { member_id: 'M002', name: 'Jane Smith', phone_number: '0987654321', _rowNumber: 3 },
      ];

      // Mock User.findOne to return existing user for first row
      User.findOne
        .mockResolvedValueOnce({ member_id: 'M001' }) // Duplicate member_id
        .mockResolvedValueOnce(null) // No duplicate phone for M001
        .mockResolvedValueOnce(null) // No duplicate member_id for M002
        .mockResolvedValueOnce(null) // No duplicate phone for M002
        .mockResolvedValueOnce(null); // No duplicate email

      const mockUser = {
        _id: 'user123',
        member_id: 'M002',
        fullName: 'Jane Smith',
        phone_number: '0987654321',
        save: jest.fn().mockResolvedValue({}),
      };
      User.mockImplementation(() => mockUser);

      const mockImportOp = {
        _id: 'import123',
        save: jest.fn().mockResolvedValue({}),
        toJSON: jest.fn(() => ({ _id: 'import123', status: 'completed' })),
      };
      ImportOperation.mockImplementation(() => mockImportOp);

      Activity.create.mockResolvedValue({});

      const { sendSMSAndLog } = require('./smsService');
      sendSMSAndLog.mockResolvedValue({ success: true });

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: 'admin123',
        adminName: 'Admin User',
      });

      expect(result.statistics.skipped_rows).toBe(1);
      expect(result.statistics.successful_imports).toBe(1);
      expect(result.statistics.import_errors.length).toBeGreaterThan(0);
    });

    test('should handle SMS failures and mark members appropriately', async () => {
      const validRows = [
        { member_id: 'M001', name: 'John Doe', phone_number: '1234567890', _rowNumber: 2 },
      ];

      User.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user123',
        member_id: 'M001',
        fullName: 'John Doe',
        phone_number: '1234567890',
        save: jest.fn().mockResolvedValue({}),
      };
      User.mockImplementation(() => mockUser);

      const mockImportOp = {
        _id: 'import123',
        save: jest.fn().mockResolvedValue({}),
        toJSON: jest.fn(() => ({ _id: 'import123', status: 'completed' })),
      };
      ImportOperation.mockImplementation(() => mockImportOp);

      Activity.create.mockResolvedValue({});

      // Mock SMS failure
      const { sendSMSAndLog } = require('./smsService');
      sendSMSAndLog.mockResolvedValue({ success: false, message: 'SMS provider error' });

      const { markMemberNotificationFailed } = require('./errorHandler');

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: 'admin123',
        adminName: 'Admin User',
      });

      expect(result.statistics.sms_failed_count).toBeGreaterThan(0);
      expect(result.createdUsers[0].smsSent).toBe(false);
    });

    test('should log all errors to activity log', async () => {
      const validRows = [
        { member_id: 'M001', name: 'John Doe', phone_number: '1234567890', _rowNumber: 2 },
      ];

      User.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user123',
        member_id: 'M001',
        fullName: 'John Doe',
        phone_number: '1234567890',
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      User.mockImplementation(() => mockUser);

      const mockImportOp = {
        _id: 'import123',
        save: jest.fn().mockResolvedValue({}),
        toJSON: jest.fn(() => ({ _id: 'import123', status: 'completed' })),
      };
      ImportOperation.mockImplementation(() => mockImportOp);

      Activity.create.mockResolvedValue({});

      const { logErrorToActivity } = require('./errorHandler');

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: 'admin123',
        adminName: 'Admin User',
      });

      expect(result.statistics.failed_imports).toBeGreaterThan(0);
      expect(logErrorToActivity).toHaveBeenCalled();
    });

    test('should return detailed statistics with error information', async () => {
      const validRows = [
        { member_id: 'M001', name: 'John Doe', phone_number: '1234567890', _rowNumber: 2 },
      ];

      User.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user123',
        member_id: 'M001',
        fullName: 'John Doe',
        phone_number: '1234567890',
        save: jest.fn().mockResolvedValue({}),
      };
      User.mockImplementation(() => mockUser);

      const mockImportOp = {
        _id: 'import123',
        save: jest.fn().mockResolvedValue({}),
        toJSON: jest.fn(() => ({ _id: 'import123', status: 'completed' })),
      };
      ImportOperation.mockImplementation(() => mockImportOp);

      Activity.create.mockResolvedValue({});

      const { sendSMSAndLog } = require('./smsService');
      sendSMSAndLog.mockResolvedValue({ success: true });

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: 'admin123',
        adminName: 'Admin User',
      });

      expect(result.statistics).toHaveProperty('total_rows');
      expect(result.statistics).toHaveProperty('successful_imports');
      expect(result.statistics).toHaveProperty('failed_imports');
      expect(result.statistics).toHaveProperty('skipped_rows');
      expect(result.statistics).toHaveProperty('sms_sent_count');
      expect(result.statistics).toHaveProperty('sms_failed_count');
      expect(result.statistics).toHaveProperty('import_errors');
    });
  });
});
