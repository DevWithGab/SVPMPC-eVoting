// server/controllers/import.controller.test.js
const {
  retrySMS,
  retryEmail,
  bulkRetryNotifications,
  getRetryStatus,
  getImportedMembers,
  getImportedMemberDetails,
  getImportHistory,
  getImportDetails,
  getImportMembers,
} = require('./import.controller');
const { User, Activity, ImportOperation } = require('../models');
const { retrySMSWithBackoff, retryEmailWithBackoff, retryFailedNotifications } = require('../services/notificationRetry');

// Mock the models and services
jest.mock('../models', () => ({
  User: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  },
  Activity: {
    create: jest.fn(),
  },
  ImportOperation: {
    findByIdAndUpdate: jest.fn(),
    findById: jest.fn(),
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

  describe('getImportedMembers', () => {
    test('should get all imported members with default pagination', async () => {
      const mockMembers = [
        {
          _id: 'user1',
          member_id: 'MEM001',
          fullName: 'John Doe',
          phone_number: '+1234567890',
          email: 'john@example.com',
          activation_status: 'pending_activation',
          activation_method: 'sms',
          created_at: new Date('2024-01-01'),
          activated_at: null,
          sms_sent_at: new Date('2024-01-01'),
          temporary_password_expires: new Date('2024-01-02'),
        },
      ];

      const req = {
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMembers),
      };

      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(1);

      await getImportedMembers(req, res);

      expect(User.find).toHaveBeenCalledWith({ import_id: { $exists: true, $ne: null } });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Imported members retrieved successfully',
          data: expect.objectContaining({
            members: expect.arrayContaining([
              expect.objectContaining({
                member_id: 'MEM001',
                name: 'John Doe',
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 50,
              total: 1,
              pages: 1,
            }),
          }),
        })
      );
    });

    test('should filter members by status', async () => {
      const req = {
        query: { status: 'activated' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(0);

      await getImportedMembers(req, res);

      expect(User.find).toHaveBeenCalledWith({
        import_id: { $exists: true, $ne: null },
        activation_status: 'activated',
      });
    });

    test('should search members by member_id', async () => {
      const req = {
        query: { search: 'MEM001' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(0);

      await getImportedMembers(req, res);

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ member_id: expect.any(Object) }),
            expect.objectContaining({ phone_number: expect.any(Object) }),
          ]),
        })
      );
    });

    test('should sort members by specified column', async () => {
      const req = {
        query: { sortBy: 'phone_number', sortOrder: 'desc' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(0);

      await getImportedMembers(req, res);

      expect(mockChain.sort).toHaveBeenCalledWith({ phone_number: -1 });
    });

    test('should reject invalid status', async () => {
      const req = {
        query: { status: 'invalid_status' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getImportedMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid status'),
        })
      );
    });

    test('should handle pagination parameters', async () => {
      const req = {
        query: { page: '2', limit: '25' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(100);

      await getImportedMembers(req, res);

      expect(mockChain.skip).toHaveBeenCalledWith(25);
      expect(mockChain.limit).toHaveBeenCalledWith(25);
    });

    test('should handle database errors', async () => {
      const req = {
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      await getImportedMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error retrieving imported members',
        })
      );
    });
  });

  describe('getImportedMemberDetails', () => {
    test('should get member details by ID', async () => {
      const mockMember = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone_number: '+1234567890',
        activation_status: 'activated',
        activation_method: 'sms',
        created_at: new Date('2024-01-01'),
        activated_at: new Date('2024-01-02'),
        sms_sent_at: new Date('2024-01-01'),
        email_sent_at: null,
        temporary_password_expires: new Date('2024-01-02'),
        last_password_change: new Date('2024-01-02'),
        import_id: 'import123',
      };

      const mockImportOp = {
        _id: 'import123',
        admin_name: 'Admin User',
        csv_file_name: 'members.csv',
        created_at: new Date('2024-01-01'),
      };

      const req = {
        params: { memberId: 'user1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockMember);
      ImportOperation.findById.mockResolvedValue(mockImportOp);

      await getImportedMemberDetails(req, res);

      expect(User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          import_id: { $exists: true, $ne: null },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Member details retrieved successfully',
          data: expect.objectContaining({
            member_id: 'MEM001',
            name: 'John Doe',
            import_operation: expect.objectContaining({
              admin_name: 'Admin User',
            }),
          }),
        })
      );
    });

    test('should get member details by member_id', async () => {
      const mockMember = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone_number: '+1234567890',
        activation_status: 'activated',
        activation_method: 'sms',
        created_at: new Date('2024-01-01'),
        activated_at: new Date('2024-01-02'),
        sms_sent_at: new Date('2024-01-01'),
        email_sent_at: null,
        temporary_password_expires: new Date('2024-01-02'),
        last_password_change: new Date('2024-01-02'),
        import_id: 'import123',
      };

      const req = {
        params: { memberId: 'MEM001' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockMember);
      ImportOperation.findById.mockResolvedValue(null);

      await getImportedMemberDetails(req, res);

      expect(User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ _id: 'MEM001' }),
            expect.objectContaining({ member_id: 'MEM001' }),
          ]),
        })
      );
    });

    test('should return 404 if member not found', async () => {
      const req = {
        params: { memberId: 'nonexistent' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findOne.mockResolvedValue(null);

      await getImportedMemberDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Imported member not found',
        })
      );
    });

    test('should handle database errors', async () => {
      const req = {
        params: { memberId: 'user1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      User.findOne.mockRejectedValue(new Error('Database error'));

      await getImportedMemberDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error retrieving member details',
        })
      );
    });
  });

  describe('getImportHistory', () => {
    test('should get all import operations with default pagination', async () => {
      const mockImports = [
        {
          _id: 'import1',
          admin_name: 'Admin User',
          csv_file_name: 'members.csv',
          total_rows: 100,
          successful_imports: 95,
          failed_imports: 5,
          skipped_rows: 0,
          status: 'completed',
          createdAt: new Date('2024-01-01'),
        },
      ];

      const req = {
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockImports),
      };

      ImportOperation.find.mockReturnValue(mockChain);
      ImportOperation.countDocuments.mockResolvedValue(1);

      await getImportHistory(req, res);

      expect(ImportOperation.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Import history retrieved successfully',
          data: expect.objectContaining({
            imports: expect.arrayContaining([
              expect.objectContaining({
                admin_name: 'Admin User',
                csv_file_name: 'members.csv',
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 50,
              total: 1,
              pages: 1,
            }),
          }),
        })
      );
    });

    test('should sort imports by createdAt descending by default', async () => {
      const req = {
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      ImportOperation.find.mockReturnValue(mockChain);
      ImportOperation.countDocuments.mockResolvedValue(0);

      await getImportHistory(req, res);

      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test('should handle pagination parameters', async () => {
      const req = {
        query: { page: '2', limit: '25' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      ImportOperation.find.mockReturnValue(mockChain);
      ImportOperation.countDocuments.mockResolvedValue(100);

      await getImportHistory(req, res);

      expect(mockChain.skip).toHaveBeenCalledWith(25);
      expect(mockChain.limit).toHaveBeenCalledWith(25);
    });

    test('should handle database errors', async () => {
      const req = {
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      ImportOperation.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      await getImportHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error retrieving import history',
        })
      );
    });
  });

  describe('getImportDetails', () => {
    test('should get import details by ID', async () => {
      const mockImportOp = {
        _id: 'import1',
        admin_name: 'Admin User',
        csv_file_name: 'members.csv',
        total_rows: 100,
        successful_imports: 95,
        failed_imports: 5,
        skipped_rows: 0,
        sms_sent_count: 95,
        sms_failed_count: 0,
        email_sent_count: 0,
        email_failed_count: 0,
        status: 'completed',
        import_errors: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const req = {
        params: { importId: 'import1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      ImportOperation.findById.mockResolvedValue(mockImportOp);

      await getImportDetails(req, res);

      expect(ImportOperation.findById).toHaveBeenCalledWith('import1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Import details retrieved successfully',
          data: expect.objectContaining({
            admin_name: 'Admin User',
            csv_file_name: 'members.csv',
            total_rows: 100,
            successful_imports: 95,
          }),
        })
      );
    });

    test('should return 404 if import not found', async () => {
      const req = {
        params: { importId: 'nonexistent' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      ImportOperation.findById.mockResolvedValue(null);

      await getImportDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Import operation not found',
        })
      );
    });

    test('should handle database errors', async () => {
      const req = {
        params: { importId: 'import1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      ImportOperation.findById.mockRejectedValue(new Error('Database error'));

      await getImportDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error retrieving import details',
        })
      );
    });
  });

  describe('getImportMembers', () => {
    test('should get members from import operation with default pagination', async () => {
      const mockMembers = [
        {
          _id: 'user1',
          member_id: 'MEM001',
          fullName: 'John Doe',
          phone_number: '+1234567890',
          email: 'john@example.com',
          activation_status: 'activated',
          activation_method: 'sms',
          createdAt: new Date('2024-01-01'),
          activated_at: new Date('2024-01-02'),
          sms_sent_at: new Date('2024-01-01'),
          temporary_password_expires: new Date('2024-01-02'),
        },
      ];

      const req = {
        params: { importId: 'import1' },
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMembers),
      };

      ImportOperation.findById.mockResolvedValue({ _id: 'import1' });
      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(1);

      await getImportMembers(req, res);

      expect(ImportOperation.findById).toHaveBeenCalledWith('import1');
      expect(User.find).toHaveBeenCalledWith({ import_id: 'import1' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Import members retrieved successfully',
          data: expect.objectContaining({
            import_id: 'import1',
            members: expect.arrayContaining([
              expect.objectContaining({
                member_id: 'MEM001',
                name: 'John Doe',
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 50,
              total: 1,
              pages: 1,
            }),
          }),
        })
      );
    });

    test('should return 404 if import operation not found', async () => {
      const req = {
        params: { importId: 'nonexistent' },
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      ImportOperation.findById.mockResolvedValue(null);

      await getImportMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Import operation not found',
        })
      );
    });

    test('should handle pagination parameters', async () => {
      const req = {
        params: { importId: 'import1' },
        query: { page: '2', limit: '25' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      ImportOperation.findById.mockResolvedValue({ _id: 'import1' });
      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(100);

      await getImportMembers(req, res);

      expect(mockChain.skip).toHaveBeenCalledWith(25);
      expect(mockChain.limit).toHaveBeenCalledWith(25);
    });

    test('should sort members by specified column', async () => {
      const req = {
        params: { importId: 'import1' },
        query: { sortBy: 'phone_number', sortOrder: 'desc' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      ImportOperation.findById.mockResolvedValue({ _id: 'import1' });
      User.find.mockReturnValue(mockChain);
      User.countDocuments.mockResolvedValue(0);

      await getImportMembers(req, res);

      expect(mockChain.sort).toHaveBeenCalledWith({ phone_number: -1 });
    });

    test('should handle database errors', async () => {
      const req = {
        params: { importId: 'import1' },
        query: {},
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      ImportOperation.findById.mockResolvedValue({ _id: 'import1' });
      User.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      await getImportMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error retrieving import members',
        })
      );
    });
  });
});
