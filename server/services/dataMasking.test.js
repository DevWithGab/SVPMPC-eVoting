/**
 * Data Masking Service Tests
 * Tests for masking sensitive information in member lists
 * Validates: Requirement 10.7
 */

const {
  maskEmail,
  maskPhoneNumber,
  maskMemberId,
  maskMemberForList,
  maskMembersForList,
} = require('./dataMasking');

describe('Data Masking Service', () => {
  describe('maskEmail', () => {
    it('should mask email showing only first character and domain', () => {
      const email = 'john.doe@example.com';
      const masked = maskEmail(email);
      expect(masked).toBe('j***@example.com');
    });

    it('should handle single character local part', () => {
      const email = 'a@example.com';
      const masked = maskEmail(email);
      expect(masked).toBe('a***@example.com');
    });

    it('should return null for null email', () => {
      expect(maskEmail(null)).toBeNull();
    });

    it('should return null for undefined email', () => {
      expect(maskEmail(undefined)).toBeNull();
    });

    it('should return original email if no @ symbol', () => {
      const email = 'invalidemail';
      const masked = maskEmail(email);
      expect(masked).toBe('invalidemail');
    });

    it('should handle emails with multiple dots', () => {
      const email = 'first.middle.last@sub.example.com';
      const masked = maskEmail(email);
      expect(masked).toBe('f***@sub.example.com');
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask phone number showing only last 4 digits', () => {
      const phone = '+1-555-123-4567';
      const masked = maskPhoneNumber(phone);
      expect(masked).toBe('+*-***-***-4567');
    });

    it('should handle phone numbers without formatting', () => {
      const phone = '15551234567';
      const masked = maskPhoneNumber(phone);
      expect(masked).toBe('*******4567');
    });

    it('should return null for null phone', () => {
      expect(maskPhoneNumber(null)).toBeNull();
    });

    it('should return null for undefined phone', () => {
      expect(maskPhoneNumber(undefined)).toBeNull();
    });

    it('should handle short phone numbers', () => {
      const phone = '1234';
      const masked = maskPhoneNumber(phone);
      expect(masked).toBe('1234');
    });

    it('should handle phone numbers with extensions', () => {
      const phone = '+1-555-123-4567 ext. 123';
      const masked = maskPhoneNumber(phone);
      // The last 4 characters are "123" from the extension, so they'll be shown
      expect(masked).toContain('ext');
      expect(masked).not.toContain('555');
    });
  });

  describe('maskMemberId', () => {
    it('should mask member_id showing only first and last character', () => {
      const memberId = 'MEM123456';
      const masked = maskMemberId(memberId);
      expect(masked).toBe('M*******6');
    });

    it('should handle short member_ids', () => {
      const memberId = 'AB';
      const masked = maskMemberId(memberId);
      expect(masked).toBe('AB');
    });

    it('should handle single character member_id', () => {
      const memberId = 'A';
      const masked = maskMemberId(memberId);
      expect(masked).toBe('A');
    });

    it('should return original for null member_id', () => {
      expect(maskMemberId(null)).toBeNull();
    });

    it('should return original for undefined member_id', () => {
      expect(maskMemberId(undefined)).toBeUndefined();
    });

    it('should handle numeric member_ids', () => {
      const memberId = '123456789';
      const masked = maskMemberId(memberId);
      expect(masked).toBe('1*******9');
    });

    it('should handle alphanumeric member_ids', () => {
      const memberId = 'MEM2024001';
      const masked = maskMemberId(memberId);
      expect(masked).toBe('M********1');
    });
  });

  describe('maskMemberForList', () => {
    it('should mask all sensitive fields in a member object', () => {
      const member = {
        id: '507f1f77bcf86cd799439011',
        member_id: 'MEM123456',
        name: 'John Doe',
        phone_number: '+1-555-123-4567',
        email: 'john.doe@example.com',
        activation_status: 'activated',
        activation_method: 'sms',
        imported_at: new Date('2024-01-01'),
        activated_at: new Date('2024-01-02'),
      };

      const masked = maskMemberForList(member);

      expect(masked.member_id).toBe('M*******6');
      expect(masked.phone_number).toBe('+*-***-***-4567');
      expect(masked.email).toBe('j***@example.com');
      expect(masked.name).toBe('John Doe');
      expect(masked.activation_status).toBe('activated');
      expect(masked.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle members with null email', () => {
      const member = {
        id: '507f1f77bcf86cd799439011',
        member_id: 'MEM123456',
        name: 'Jane Doe',
        phone_number: '+1-555-987-6543',
        email: null,
        activation_status: 'pending_activation',
      };

      const masked = maskMemberForList(member);

      expect(masked.email).toBeNull();
      expect(masked.phone_number).toBe('+*-***-***-6543');
      expect(masked.member_id).toBe('M*******6');
    });

    it('should preserve non-sensitive fields', () => {
      const member = {
        id: '507f1f77bcf86cd799439011',
        member_id: 'MEM123456',
        name: 'John Doe',
        phone_number: '+1-555-123-4567',
        email: 'john.doe@example.com',
        activation_status: 'activated',
        activation_method: 'sms',
        imported_at: new Date('2024-01-01'),
        activated_at: new Date('2024-01-02'),
        sms_sent_at: new Date('2024-01-01'),
        temporary_password_expires: new Date('2024-01-02'),
      };

      const masked = maskMemberForList(member);

      expect(masked.activation_status).toBe('activated');
      expect(masked.activation_method).toBe('sms');
      expect(masked.imported_at).toEqual(new Date('2024-01-01'));
      expect(masked.activated_at).toEqual(new Date('2024-01-02'));
      expect(masked.sms_sent_at).toEqual(new Date('2024-01-01'));
      expect(masked.temporary_password_expires).toEqual(new Date('2024-01-02'));
    });
  });

  describe('maskMembersForList', () => {
    it('should mask all members in an array', () => {
      const members = [
        {
          id: '507f1f77bcf86cd799439011',
          member_id: 'MEM123456',
          name: 'John Doe',
          phone_number: '+1-555-123-4567',
          email: 'john.doe@example.com',
          activation_status: 'activated',
        },
        {
          id: '507f1f77bcf86cd799439012',
          member_id: 'MEM789012',
          name: 'Jane Doe',
          phone_number: '+1-555-987-6543',
          email: 'jane.doe@example.com',
          activation_status: 'pending_activation',
        },
      ];

      const masked = maskMembersForList(members);

      expect(masked).toHaveLength(2);
      expect(masked[0].member_id).toBe('M*******6');
      expect(masked[0].phone_number).toBe('+*-***-***-4567');
      expect(masked[0].email).toBe('j***@example.com');
      expect(masked[1].member_id).toBe('M*******2');
      expect(masked[1].phone_number).toBe('+*-***-***-6543');
      expect(masked[1].email).toBe('j***@example.com');
    });

    it('should handle empty array', () => {
      const members = [];
      const masked = maskMembersForList(members);
      expect(masked).toEqual([]);
    });

    it('should handle array with mixed data', () => {
      const members = [
        {
          id: '507f1f77bcf86cd799439011',
          member_id: 'MEM123456',
          name: 'John Doe',
          phone_number: '+1-555-123-4567',
          email: 'john.doe@example.com',
          activation_status: 'activated',
        },
        {
          id: '507f1f77bcf86cd799439012',
          member_id: 'MEM789012',
          name: 'Jane Doe',
          phone_number: '+1-555-987-6543',
          email: null,
          activation_status: 'sms_failed',
        },
      ];

      const masked = maskMembersForList(members);

      expect(masked).toHaveLength(2);
      expect(masked[0].email).toBe('j***@example.com');
      expect(masked[1].email).toBeNull();
    });
  });
});
