// server/controllers/import.controller.test.js
const {
  retrySMS,
  retryEmail,
  bulkRetryNotifications,
  getRetryStatus,
} = require('./import.controller');
const { User, Activity } = require('../models');
const { retrySMSWithBackoff, retryEmailWithBackoff, retryFailedNotifications } = require('../services/notificationRetry');

// Mock the models and services
jest.mock('../models', () => ({
  User: {
    findById: jest.fn(),
  },
  Activity: {
    create: jest.fn(),
  },
  ImportOperation: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../services/notificationRetry', () => ({
  retrySMSWithBackoff: jest.fn(),
  retryEmailWithBackoff: jest.fn(),
  retryFailedNotifications: jest.fn(),
}));

describe('Import Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('retrySMS', () => {
    test('should retry SMS successfully', async () => {
      const req = {
        params: { userId: 'user123' },
        body: {
          temporaryPassword: 'TempPass123!',
          cooperativeName: 'SVMPC',
          cooperativePhone: '+1-800-SVMPC-1',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retrySMSWithBackoff.mockResolvedValue({
        success: true,
        message: 'SMS retry successful',
        userId: 'user123',
        retryCount: 0,
        smsId: 'SMS_123',
      });

      await retrySMS(req, res);

      expect(retrySMSWithBackoff).toHaveBeenCalledWith({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'SMS retry successful',
        })
      );
    });

    test('should handle SMS retry failure', async () => {
      const req = {
        params: { userId: 'user123' },
        body: {
          temporaryPassword: 'TempPass123!',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retrySMSWithBackoff.mockResolvedValue({
        success: false,
        message: 'SMS retry failed',
        userId: 'user123',
        error: 'Network error',
      });

      await retrySMS(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'SMS retry failed',
        })
      );
    });

    test('should validate required fields', async () => {
      const req = {
        params: { userId: 'user123' },
        body: {}, // Missing temporaryPassword
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await retrySMS(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Missing required fields'),
        })
      );
    });

    test('should use default cooperative info if not provided', async () => {
      const req = {
        params: { userId: 'user123' },
        body: {
          temporaryPassword: 'TempPass123!',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retrySMSWithBackoff.mockResolvedValue({
        success: true,
        message: 'SMS retry successful',
      });

      await retrySMS(req, res);

      expect(retrySMSWithBackoff).toHaveBeenCalledWith(
        expect.objectContaining({
          cooperativeName: 'SVMPC',
          cooperativePhone: '+1-800-SVMPC-1',
        })
      );
    });
  });

  describe('retryEmail', () => {
    test('should retry email successfully', async () => {
      const req = {
        params: { userId: 'user123' },
        body: {
          cooperativeName: 'SVMPC',
          cooperativePhone: '+1-800-SVMPC-1',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retryEmailWithBackoff.mockResolvedValue({
        success: true,
        message: 'Email retry successful',
        userId: 'user123',
        retryCount: 0,
        emailId: 'EMAIL_123',
      });

      await retryEmail(req, res);

      expect(retryEmailWithBackoff).toHaveBeenCalledWith({
        userId: 'user123',
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
        isManualRetry: true,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email retry successful',
        })
      );
    });

    test('should validate userId is provided', async () => {
      const req = {
        params: {}, // Missing userId
        body: {},
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await retryEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Missing required field'),
        })
      );
    });
  });

  describe('bulkRetryNotifications', () => {
    test('should perform bulk SMS retry', async () => {
      const req = {
        body: {
          memberIds: ['MEM001', 'MEM002'],
          notificationType: 'sms',
          temporaryPassword: 'TempPass123!',
          cooperativeName: 'SVMPC',
          cooperativePhone: '+1-800-SVMPC-1',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retryFailedNotifications.mockResolvedValue({
        total: 2,
        successful: 2,
        failed: 0,
        skipped: 0,
        details: [],
      });

      Activity.create.mockResolvedValue({});

      await bulkRetryNotifications(req, res);

      expect(retryFailedNotifications).toHaveBeenCalledWith({
        memberIds: ['MEM001', 'MEM002'],
        adminId: 'admin123',
        notificationType: 'sms',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(Activity.create).toHaveBeenCalled();
    });

    test('should perform bulk email retry', async () => {
      const req = {
        body: {
          memberIds: ['MEM001'],
          notificationType: 'email',
          cooperativeName: 'SVMPC',
          cooperativePhone: '+1-800-SVMPC-1',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retryFailedNotifications.mockResolvedValue({
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
        details: [],
      });

      Activity.create.mockResolvedValue({});

      await bulkRetryNotifications(req, res);

      expect(retryFailedNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationType: 'email',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should validate memberIds is non-empty array', async () => {
      const req = {
        body: {
          memberIds: [],
          notificationType: 'sms',
          temporaryPassword: 'TempPass123!',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await bulkRetryNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('memberIds'),
        })
      );
    });

    test('should validate notificationType is valid', async () => {
      const req = {
        body: {
          memberIds: ['MEM001'],
          notificationType: 'invalid',
          temporaryPassword: 'TempPass123!',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await bulkRetryNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('notificationType'),
        })
      );
    });

    test('should require temporaryPassword for SMS retry', async () => {
      const req = {
        body: {
          memberIds: ['MEM001'],
          notificationType: 'sms',
          // Missing temporaryPassword
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await bulkRetryNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('temporaryPassword'),
        })
      );
    });

    test('should log bulk retry operation', async () => {
      const req = {
        body: {
          memberIds: ['MEM001', 'MEM002'],
          notificationType: 'sms',
          temporaryPassword: 'TempPass123!',
        },
        user: { _id: 'admin123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      retryFailedNotifications.mockResolvedValue({
        total: 2,
        successful: 1,
        failed: 1,
        skipped: 0,
        details: [],
      });

      Activity.create.mockResolvedValue({});

      await bulkRetryNotifications(req, res);

      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin123',
          action: 'BULK_RETRY_NOTIFICATIONS',
          metadata: expect.objectContaining({
            notification_type: 'sms',
            member_count: 2,
            successful: 1,
            failed: 1,
            skipped: 0,
          }),
        })
      );
    });
  });

  describe('getRetryStatus', () => {
    test('should get retry status for a member', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        sms_retry_count: 1,
        sms_last_retry_at: new Date(),
        email_retry_count: 0,
        email_last_retry_at: null,
        activation_status: 'pending_activation',
      };

      const req = {
        params: { userId: 'user123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);

      await getRetryStatus(req, res);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Retry status retrieved successfully',
          data: expect.objectContaining({
            userId: 'user123',
            memberId: 'MEM001',
            smsRetryCount: 1,
            emailRetryCount: 0,
            activationStatus: 'pending_activation',
          }),
        })
      );
    });

    test('should return 404 if user not found', async () => {
      const req = {
        params: { userId: 'nonexistent' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findById.mockResolvedValue(null);

      await getRetryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
        })
      );
    });

    test('should handle database errors', async () => {
      const req = {
        params: { userId: 'user123' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findById.mockRejectedValue(new Error('Database error'));

      await getRetryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error getting retry status',
        })
      );
    });
  });
});
