/**
 * Import Access Control Middleware Tests
 * Tests for role-based access control and data masking
 */

const {
  requireAdminForImport,
  requireAdminForMemberAccess,
  requireAdminForImportAccess,
  requireAdminForMemberDetail,
  maskSensitiveData,
} = require('./importAccess.middleware');
const { User, ImportOperation } = require('../models');

// Mock data
const mockAdminUser = {
  _id: 'admin-123',
  role: 'admin',
  fullName: 'Admin User',
};

const mockMemberUser = {
  _id: 'member-123',
  role: 'member',
  fullName: 'Member User',
};

const mockOfficerUser = {
  _id: 'officer-123',
  role: 'officer',
  fullName: 'Officer User',
};

const mockImportOperation = {
  _id: 'import-123',
  admin_name: 'Admin User',
  csv_file_name: 'members.csv',
};

const mockImportedMember = {
  _id: 'member-456',
  member_id: 'MEM-001',
  email: 'member@example.com',
  import_id: 'import-123',
};

describe('Import Access Control Middleware', () => {
  describe('requireAdminForImport', () => {
    it('should allow admin users to proceed', () => {
      const req = { user: mockAdminUser };
      const res = { status: jest.fn().returnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdminForImport(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject member users with 403 Forbidden', () => {
      const req = { user: mockMemberUser };
      const res = { status: jest.fn().returnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdminForImport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Only admins can perform import operations',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject officer users with 403 Forbidden', () => {
      const req = { user: mockOfficerUser };
      const res = { status: jest.fn().returnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdminForImport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without user with 401 Unauthorized', () => {
      const req = { user: null };
      const res = { status: jest.fn().returnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdminForImport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdminForMemberAccess', () => {
    it('should allow admin users to access member data', () => {
      const req = { user: mockAdminUser };
      const res = { status: jest.fn().returnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdminForMemberAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject member users with 403 Forbidden', () => {
      const req = { user: mockMemberUser };
      const res = { status: jest.fn().returnThis(), json: jest.fn() };
      const next = jest.fn();

      requireAdminForMemberAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Only admins can access member data',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask email addresses in list responses', () => {
      const req = {};
      const res = {
        json: jest.fn(),
      };
      const next = jest.fn();

      maskSensitiveData(req, res, next);

      const testData = {
        data: [
          {
            id: '123',
            name: 'John Doe',
            email: 'john.doe@example.com',
            member_id: 'MEM-001',
          },
        ],
      };

      res.json(testData);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data[0].email).toMatch(/^j\*\*\*@example\.com$/);
    });

    it('should mask member_id in list responses', () => {
      const req = {};
      const res = {
        json: jest.fn(),
      };
      const next = jest.fn();

      maskSensitiveData(req, res, next);

      const testData = {
        data: [
          {
            id: '123',
            name: 'John Doe',
            email: 'john@example.com',
            member_id: 'MEM-001-ABC',
          },
        ],
      };

      res.json(testData);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data[0].member_id).toMatch(/^ME\*\*\*BC$/);
    });

    it('should mask data in nested members array', () => {
      const req = {};
      const res = {
        json: jest.fn(),
      };
      const next = jest.fn();

      maskSensitiveData(req, res, next);

      const testData = {
        data: {
          members: [
            {
              id: '123',
              name: 'John Doe',
              email: 'john@example.com',
              member_id: 'MEM-001',
            },
          ],
        },
      };

      res.json(testData);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data.members[0].email).toMatch(/^j\*\*\*@example\.com$/);
    });

    it('should not mask data in detail responses', () => {
      const req = {};
      const res = {
        json: jest.fn(),
      };
      const next = jest.fn();

      maskSensitiveData(req, res, next);

      const testData = {
        data: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          member_id: 'MEM-001',
        },
      };

      res.json(testData);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      // Detail view should not have masking applied
      expect(callArgs.data.email).toBe('john@example.com');
      expect(callArgs.data.member_id).toBe('MEM-001');
    });

    it('should call next middleware', () => {
      const req = {};
      const res = { json: jest.fn() };
      const next = jest.fn();

      maskSensitiveData(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
