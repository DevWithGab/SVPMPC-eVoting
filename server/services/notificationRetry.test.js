// server/services/notificationRetry.test.js
const {
  retrySMSWithBackoff,
  retryEmailWithBackoff,
  retryFailedNotifications,
  calculateBackoffDelay,
  RETRY_CONFIG,
} = require('./notificationRetry');
const { User, Activity } = require('../models');
const { sendSMSAndLog } = require('./smsService');
const { sendEmailAndLog } = require('./emailService');

// Mock the models and services
jest.mock('../models', () => ({
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
  Activity: {
    create: jest.fn(),
  },
  ImportOperation: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('./smsService', () => ({
  sendSMSAndLog: jest.fn(),
}));

jest.mock('./emailService', () => ({
  sendEmailAndLog: jest.fn(),
}));

describe('Notification Retry Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('calculateBackoffDelay', () => {
    test('should calculate exponential backoff delay', () => {
      // First retry: 1000 * 2^0 = 1000ms
      expect(calculateBackoffDelay(0)).toBe(1000);

      // Second retry: 1000 * 2^1 = 2000ms
      expect(calculateBackoffDelay(1)).toBe(2000);

      // Third retry: 1000 * 2^2 = 4000ms
      expect(calculateBackoffDelay(2)).toBe(4000);
    });

    test('should cap delay at maximum', () => {
      // Very high retry count should be capped at MAX_DELAY_MS
      const highRetryCount = 10;
      const delay = calculateBackoffDelay(highRetryCount);
      expect(delay).toBeLessThanOrEqual(RETRY_CONFIG.MAX_DELAY_MS);
    });

    test('should return initial delay for first retry', () => {
      expect(calculateBackoffDelay(0)).toBe(RETRY_CONFIG.INITIAL_DELAY_MS);
    });
  });

  describe('retrySMSWithBackoff', () => {
    test('should successfully retry SMS and reset retry count', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 1,
        sms_last_retry_at: new Date(Date.now() - 10000),
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent and logged successfully',
        userId: 'user123',
        smsId: 'SMS_123',
        sentAt: new Date(),
      });

      const result = await retrySMSWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(result.success).toBe(true);
      expect(mockUser.sms_retry_count).toBe(0);
      expect(mockUser.sms_last_retry_at).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should increment retry count on failed SMS', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 0,
        sms_last_retry_at: null,
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      sendSMSAndLog.mockResolvedValue({
        success: false,
        message: 'Failed to send SMS',
        userId: 'user123',
        error: 'Network error',
      });

      const result = await retrySMSWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(result.success).toBe(false);
      expect(mockUser.sms_retry_count).toBe(1);
      expect(mockUser.sms_last_retry_at).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should reject retry if max retries exceeded', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: RETRY_CONFIG.MAX_RETRIES,
        sms_last_retry_at: new Date(),
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await retrySMSWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: false,
      });

      expect(result.success).toBe(false);
      expect(result.maxRetriesExceeded).toBe(true);
      expect(sendSMSAndLog).not.toHaveBeenCalled();
    });

    test('should enforce backoff delay between retries', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 1,
        sms_last_retry_at: new Date(Date.now() - 500), // Only 500ms ago
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await retrySMSWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: false,
      });

      expect(result.success).toBe(false);
      expect(result.backoffActive).toBe(true);
      expect(result.waitTimeMs).toBeGreaterThan(0);
      expect(sendSMSAndLog).not.toHaveBeenCalled();
    });

    test('should skip backoff delay for manual retries', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 1,
        sms_last_retry_at: new Date(Date.now() - 100), // Only 100ms ago
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent and logged successfully',
        userId: 'user123',
        smsId: 'SMS_123',
        sentAt: new Date(),
      });

      const result = await retrySMSWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true, // Manual retry should skip backoff
      });

      expect(result.success).toBe(true);
      expect(sendSMSAndLog).toHaveBeenCalled();
    });

    test('should log retry attempt in activity log', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 0,
        sms_last_retry_at: null,
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      sendSMSAndLog.mockResolvedValue({
        success: false,
        message: 'Failed to send SMS',
        userId: 'user123',
        error: 'Network error',
      });

      await retrySMSWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin123',
          action: 'SMS_RETRY_FAILED',
          metadata: expect.objectContaining({
            member_id: 'MEM001',
            retry_count: 1,
            is_manual_retry: true,
          }),
        })
      );
    });

    test('should handle user not found error', async () => {
      User.findById.mockResolvedValue(null);
      Activity.create.mockResolvedValue({});

      const result = await retrySMSWithBackoff({
        userId: 'nonexistent',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('retryEmailWithBackoff', () => {
    test('should successfully retry email and reset retry count', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        email_retry_count: 1,
        email_last_retry_at: new Date(Date.now() - 10000),
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      sendEmailAndLog.mockResolvedValue({
        success: true,
        message: 'Email sent and logged successfully',
        userId: 'user123',
        emailId: 'EMAIL_123',
        sentAt: new Date(),
      });

      const result = await retryEmailWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(result.success).toBe(true);
      expect(mockUser.email_retry_count).toBe(0);
      expect(mockUser.email_last_retry_at).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should increment retry count on failed email', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        email_retry_count: 0,
        email_last_retry_at: null,
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      sendEmailAndLog.mockResolvedValue({
        success: false,
        message: 'Failed to send email',
        userId: 'user123',
        error: 'SMTP error',
      });

      const result = await retryEmailWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(result.success).toBe(false);
      expect(mockUser.email_retry_count).toBe(1);
      expect(mockUser.email_last_retry_at).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should reject retry if max retries exceeded', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        email_retry_count: RETRY_CONFIG.MAX_RETRIES,
        email_last_retry_at: new Date(),
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await retryEmailWithBackoff({
        userId: 'user123',
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: false,
      });

      expect(result.success).toBe(false);
      expect(result.maxRetriesExceeded).toBe(true);
      expect(sendEmailAndLog).not.toHaveBeenCalled();
    });
  });

  describe('retryFailedNotifications', () => {
    test('should retry SMS for multiple members', async () => {
      const mockUser1 = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0001',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 0,
        sms_last_retry_at: null,
        save: jest.fn(),
      };

      const mockUser2 = {
        _id: 'user2',
        member_id: 'MEM002',
        fullName: 'Jane Smith',
        phone_number: '+1-555-0002',
        email: 'jane@example.com',
        import_id: 'import123',
        sms_retry_count: 0,
        sms_last_retry_at: null,
        save: jest.fn(),
      };

      User.findOne
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      Activity.create.mockResolvedValue({});
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent and logged successfully',
        smsId: 'SMS_123',
        sentAt: new Date(),
      });

      const result = await retryFailedNotifications({
        memberIds: ['MEM001', 'MEM002'],
        adminId: 'admin123',
        notificationType: 'sms',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.total).toBe(2);
      expect(result.details).toHaveLength(2);
    }, 10000);

    test('should handle member not found in bulk retry', async () => {
      User.findOne.mockResolvedValue(null);
      Activity.create.mockResolvedValue({});

      const result = await retryFailedNotifications({
        memberIds: ['MEM001'],
        adminId: 'admin123',
        notificationType: 'sms',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.skipped).toBe(1);
      expect(result.details[0].skipped).toBe(true);
    }, 10000);

    test('should handle invalid notification type', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user1',
        member_id: 'MEM001',
      });
      Activity.create.mockResolvedValue({});

      const result = await retryFailedNotifications({
        memberIds: ['MEM001'],
        adminId: 'admin123',
        notificationType: 'invalid',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.skipped).toBe(1);
      expect(result.details[0].skipped).toBe(true);
    });

    test('should track successful and failed retries', async () => {
      const mockUser1 = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0001',
        email: 'john@example.com',
        import_id: 'import123',
        sms_retry_count: 0,
        sms_last_retry_at: null,
        save: jest.fn(),
      };

      const mockUser2 = {
        _id: 'user2',
        member_id: 'MEM002',
        fullName: 'Jane Smith',
        phone_number: '+1-555-0002',
        email: 'jane@example.com',
        import_id: 'import123',
        sms_retry_count: 0,
        sms_last_retry_at: null,
        save: jest.fn(),
      };

      User.findOne
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      Activity.create.mockResolvedValue({});
      sendSMSAndLog
        .mockResolvedValueOnce({
          success: true,
          message: 'SMS sent',
          smsId: 'SMS_1',
          sentAt: new Date(),
        })
        .mockResolvedValueOnce({
          success: false,
          message: 'Failed to send SMS',
          error: 'Network error',
        });

      const result = await retryFailedNotifications({
        memberIds: ['MEM001', 'MEM002'],
        adminId: 'admin123',
        notificationType: 'sms',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.successful + result.failed + result.skipped).toBe(result.total);
    }, 10000);
  });
});
