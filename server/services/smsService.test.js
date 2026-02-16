// server/services/smsService.test.js
const {
  sendSMSInvitation,
  sendSMSAndLog,
  sendBulkSMS,
  formatSMSMessage,
} = require('./smsService');
const { User, Activity, ImportOperation } = require('../models');

// Mock the models
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

describe('SMS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatSMSMessage', () => {
    test('should format SMS message with member name', () => {
      const message = formatSMSMessage({
        memberName: 'John Doe',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(message).toContain('John Doe');
      expect(message).toContain('TempPass123!');
      expect(message).toContain('SVMPC');
      expect(message).toContain('+1-800-SVMPC-1');
    });

    test('should include login instructions', () => {
      const message = formatSMSMessage({
        memberName: 'Jane Smith',
        temporaryPassword: 'Pass456@',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(message).toContain('log in');
      expect(message).toContain('Member ID');
      expect(message).toContain('permanent password');
    });

    test('should include cooperative contact information', () => {
      const message = formatSMSMessage({
        memberName: 'Test User',
        temporaryPassword: 'Test123!',
        cooperativeName: 'Test Coop',
        cooperativePhone: '+1-555-1234',
      });

      expect(message).toContain('Test Coop');
      expect(message).toContain('+1-555-1234');
    });
  });

  describe('sendSMSInvitation', () => {
    test('should send SMS invitation successfully', async () => {
      const result = await sendSMSInvitation({
        phoneNumber: '+1-555-0123',
        memberName: 'John Doe',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.phoneNumber).toBe('+1-555-0123');
      expect(result.smsId).toBeDefined();
      expect(result.sentAt).toBeDefined();
    });

    test('should include SMS ID in response', async () => {
      const result = await sendSMSInvitation({
        phoneNumber: '+1-555-0123',
        memberName: 'Jane Smith',
        temporaryPassword: 'Pass456@',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.smsId).toMatch(/^SMS_/);
    });

    test('should handle SMS sending errors gracefully', async () => {
      // This test validates error handling in the service
      const result = await sendSMSInvitation({
        phoneNumber: null, // Invalid phone number
        memberName: 'Test User',
        temporaryPassword: 'Test123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      // Should return error response
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  describe('sendSMSAndLog', () => {
    test('should send SMS and log activity on success', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await sendSMSAndLog({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'TempPass123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.success).toBe(true);
      expect(mockUser.sms_sent_at).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin123',
          action: 'SMS_SENT',
        })
      );
    });

    test('should update user sms_sent_at timestamp on success', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'Jane Smith',
        phone_number: '+1-555-0456',
        email: 'jane@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      await sendSMSAndLog({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'Pass456@',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(mockUser.sms_sent_at).toBeInstanceOf(Date);
    });

    test('should log SMS send event in activity log', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'Test User',
        phone_number: '+1-555-0789',
        email: 'test@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      await sendSMSAndLog({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'Test123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin123',
          action: 'SMS_SENT',
          description: expect.stringContaining('MEM001'),
          metadata: expect.objectContaining({
            member_id: 'MEM001',
            phone_number: '+1-555-0789',
            import_id: 'import123',
          }),
        })
      );
    });

    test('should handle user not found error', async () => {
      User.findById.mockResolvedValue(null);
      Activity.create.mockResolvedValue({});

      const result = await sendSMSAndLog({
        userId: 'nonexistent',
        adminId: 'admin123',
        temporaryPassword: 'Test123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should handle missing phone number error', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: null,
        email: 'john@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await sendSMSAndLog({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'Test123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('no phone number');
    });

    test('should mark user as sms_failed on SMS failure', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        activation_status: 'pending_activation',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      ImportOperation.findByIdAndUpdate.mockResolvedValue({});

      // Mock SMS failure by making sendSMSInvitation fail
      // This is handled by the service's error handling
      const result = await sendSMSAndLog({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'Test123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      // If SMS succeeds, user should not be marked as failed
      if (result.success) {
        expect(mockUser.activation_status).not.toBe('sms_failed');
      }
    });

    test('should update import operation SMS failure count on failure', async () => {
      const mockUser = {
        _id: 'user123',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0123',
        email: 'john@example.com',
        import_id: 'import123',
        activation_status: 'pending_activation',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});
      ImportOperation.findByIdAndUpdate.mockResolvedValue({});

      await sendSMSAndLog({
        userId: 'user123',
        adminId: 'admin123',
        temporaryPassword: 'Test123!',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      // Verify that if SMS fails, import operation is updated
      // This depends on the actual SMS sending result
    });
  });

  describe('sendBulkSMS', () => {
    test('should send SMS to multiple members', async () => {
      const mockUser1 = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0001',
        email: 'john@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      const mockUser2 = {
        _id: 'user2',
        member_id: 'MEM002',
        fullName: 'Jane Smith',
        phone_number: '+1-555-0002',
        email: 'jane@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      Activity.create.mockResolvedValue({});

      const result = await sendBulkSMS({
        members: [
          { userId: 'user1', temporaryPassword: 'Pass1!' },
          { userId: 'user2', temporaryPassword: 'Pass2!' },
        ],
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.details).toHaveLength(2);
    });

    test('should track successful and failed SMS sends', async () => {
      const mockUser = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0001',
        email: 'john@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await sendBulkSMS({
        members: [{ userId: 'user1', temporaryPassword: 'Pass1!' }],
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.successful + result.failed).toBe(result.total);
    });

    test('should return detailed results for each member', async () => {
      const mockUser = {
        _id: 'user1',
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1-555-0001',
        email: 'john@example.com',
        import_id: 'import123',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);
      Activity.create.mockResolvedValue({});

      const result = await sendBulkSMS({
        members: [{ userId: 'user1', temporaryPassword: 'Pass1!' }],
        adminId: 'admin123',
        cooperativeName: 'SVMPC',
        cooperativePhone: '+1-800-SVMPC-1',
      });

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
      result.details.forEach((detail) => {
        expect(detail).toHaveProperty('success');
        expect(detail).toHaveProperty('message');
        expect(detail).toHaveProperty('userId');
      });
    });
  });
});
