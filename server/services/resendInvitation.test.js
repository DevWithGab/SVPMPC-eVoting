/**
 * Tests for Resend Invitation Service
 */

const { resendInvitation, bulkResendInvitations } = require('./resendInvitation');
const { User, Activity, ImportOperation } = require('../models');
const { generateTemporaryPassword, hashTemporaryPassword } = require('./passwordGenerator');
const { sendSMSAndLog } = require('./smsService');
const { sendEmailAndLog } = require('./emailService');

// Mock dependencies
jest.mock('../models');
jest.mock('./passwordGenerator');
jest.mock('./smsService');
jest.mock('./emailService');

describe('Resend Invitation Service', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockAdminId = '507f1f77bcf86cd799439012';
  const mockImportId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resendInvitation', () => {
    it('should successfully resend SMS invitation to a member', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM001',
        fullName: 'John Doe',
        phone_number: '+1234567890',
        email: 'john@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        sms_sent_at: new Date(),
        email_sent_at: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass123!';
      const hashedPassword = 'hashed_new_password';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent successfully',
        smsId: 'SMS123',
        sentAt: new Date(),
      });
      Activity.create.mockResolvedValue({});

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('SMS invitation resent successfully');
      expect(result.memberId).toBe('MEM001');
      expect(result.deliveryMethod).toBe('sms');
      expect(mockUser.temporary_password_hash).toBe(hashedPassword);
      expect(mockUser.sms_sent_at).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
      expect(sendSMSAndLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          adminId: mockAdminId,
          temporaryPassword: newPassword,
        })
      );
    });

    it('should successfully resend email invitation to a member', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM002',
        fullName: 'Jane Doe',
        phone_number: '+1234567890',
        email: 'jane@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        sms_sent_at: null,
        email_sent_at: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass456!';
      const hashedPassword = 'hashed_new_password_2';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);
      sendEmailAndLog.mockResolvedValue({
        success: true,
        message: 'Email sent successfully',
        emailId: 'EMAIL123',
        sentAt: new Date(),
      });
      Activity.create.mockResolvedValue({});

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'email',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('EMAIL invitation resent successfully');
      expect(result.memberId).toBe('MEM002');
      expect(result.deliveryMethod).toBe('email');
      expect(sendEmailAndLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          adminId: mockAdminId,
        })
      );
    });

    it('should fail if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should fail if user is not an imported member', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM003',
        import_id: null,
        activation_status: 'pending_activation',
      };

      User.findById.mockResolvedValue(mockUser);

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not an imported member');
    });

    it('should fail if user activation status is not pending_activation', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM004',
        import_id: mockImportId,
        activation_status: 'activated',
      };

      User.findById.mockResolvedValue(mockUser);

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not "pending_activation"');
    });

    it('should fail if SMS delivery method is chosen but user has no phone number', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM005',
        phone_number: null,
        email: 'test@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass789!';
      const hashedPassword = 'hashed_new_password_3';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('no phone number');
    });

    it('should fail if email delivery method is chosen but user has no email', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM006',
        phone_number: '+1234567890',
        email: null,
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass000!';
      const hashedPassword = 'hashed_new_password_4';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'email',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('no email address');
    });

    it('should fail if invalid delivery method is provided', async () => {
      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid delivery method');
    });

    it('should fail if SMS sending fails', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM007',
        fullName: 'Test User',
        phone_number: '+1234567890',
        email: 'test@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        sms_sent_at: null,
        email_sent_at: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass111!';
      const hashedPassword = 'hashed_new_password_5';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);
      sendSMSAndLog.mockResolvedValue({
        success: false,
        message: 'SMS provider error',
        error: 'Network timeout',
      });

      const result = await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send sms invitation');
    });

    it('should invalidate old temporary password and set new one', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM008',
        fullName: 'Password Test',
        phone_number: '+1234567890',
        email: 'test@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(Date.now() - 1000),
        sms_sent_at: new Date(),
        email_sent_at: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass222!';
      const hashedPassword = 'hashed_new_password_6';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent successfully',
        smsId: 'SMS456',
        sentAt: new Date(),
      });
      Activity.create.mockResolvedValue({});

      const beforeTime = Date.now();
      await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });
      const afterTime = Date.now();

      expect(mockUser.temporary_password_hash).toBe(hashedPassword);
      expect(mockUser.temporary_password_expires.getTime()).toBeGreaterThanOrEqual(beforeTime + 24 * 60 * 60 * 1000 - 1000);
      expect(mockUser.temporary_password_expires.getTime()).toBeLessThanOrEqual(afterTime + 24 * 60 * 60 * 1000 + 1000);
      expect(mockUser.sms_sent_at).toBeNull();
    });

    it('should log resend event in activity log', async () => {
      const mockUser = {
        _id: mockUserId,
        member_id: 'MEM009',
        fullName: 'Activity Test',
        phone_number: '+1234567890',
        email: 'test@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        sms_sent_at: null,
        email_sent_at: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const newPassword = 'NewPass333!';
      const hashedPassword = 'hashed_new_password_7';

      User.findById.mockResolvedValue(mockUser);
      generateTemporaryPassword.mockReturnValue(newPassword);
      hashTemporaryPassword.mockResolvedValue(hashedPassword);
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent successfully',
        smsId: 'SMS789',
        sentAt: new Date(),
      });
      Activity.create.mockResolvedValue({});

      await resendInvitation({
        userId: mockUserId,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockAdminId,
          action: 'RESEND_INVITATION',
          description: expect.stringContaining('MEM009'),
          metadata: expect.objectContaining({
            member_id: 'MEM009',
            delivery_method: 'sms',
            import_id: mockImportId,
          }),
        })
      );
    });
  });

  describe('bulkResendInvitations', () => {
    it('should process multiple members and track results', async () => {
      const memberIds = [mockUserId, '507f1f77bcf86cd799439014'];

      // Mock User.findById to return different users
      User.findById
        .mockResolvedValueOnce({
          _id: mockUserId,
          member_id: 'MEM001',
          fullName: 'User 1',
          phone_number: '+1234567890',
          email: 'user1@example.com',
          import_id: mockImportId,
          activation_status: 'pending_activation',
          temporary_password_hash: 'old_hash',
          temporary_password_expires: new Date(),
          sms_sent_at: null,
          email_sent_at: null,
          save: jest.fn().mockResolvedValue(true),
        })
        .mockResolvedValueOnce({
          _id: '507f1f77bcf86cd799439014',
          member_id: 'MEM002',
          fullName: 'User 2',
          phone_number: '+0987654321',
          email: 'user2@example.com',
          import_id: mockImportId,
          activation_status: 'pending_activation',
          temporary_password_hash: 'old_hash',
          temporary_password_expires: new Date(),
          sms_sent_at: null,
          email_sent_at: null,
          save: jest.fn().mockResolvedValue(true),
        });

      generateTemporaryPassword.mockReturnValue('NewPass123!');
      hashTemporaryPassword.mockResolvedValue('hashed_password');
      sendSMSAndLog.mockResolvedValue({
        success: true,
        message: 'SMS sent successfully',
        smsId: 'SMS123',
        sentAt: new Date(),
      });
      Activity.create.mockResolvedValue({});

      const result = await bulkResendInvitations({
        memberIds,
        adminId: mockAdminId,
        deliveryMethod: 'sms',
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(2);
    });

    it('should log bulk resend operation', async () => {
      const memberIds = [mockUserId];

      User.findById.mockResolvedValue({
        _id: mockUserId,
        member_id: 'MEM001',
        fullName: 'Test User',
        phone_number: '+1234567890',
        email: 'test@example.com',
        import_id: mockImportId,
        activation_status: 'pending_activation',
        temporary_password_hash: 'old_hash',
        temporary_password_expires: new Date(),
        sms_sent_at: null,
        email_sent_at: null,
        save: jest.fn().mockResolvedValue(true),
      });

      generateTemporaryPassword.mockReturnValue('NewPass123!');
      hashTemporaryPassword.mockResolvedValue('hashed_password');
      sendEmailAndLog.mockResolvedValue({
        success: true,
        message: 'Email sent successfully',
        emailId: 'EMAIL123',
        sentAt: new Date(),
      });
      Activity.create.mockResolvedValue({});

      await bulkResendInvitations({
        memberIds,
        adminId: mockAdminId,
        deliveryMethod: 'email',
      });

      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockAdminId,
          action: 'BULK_RESEND_INVITATIONS',
          description: expect.stringContaining('email'),
          metadata: expect.objectContaining({
            delivery_method: 'email',
            member_count: 1,
            successful: 1,
          }),
        })
      );
    });
  });
});
