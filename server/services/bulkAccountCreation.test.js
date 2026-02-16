/**
 * Tests for Bulk Account Creation Service
 */

const mongoose = require('mongoose');
const { createBulkAccounts } = require('./bulkAccountCreation');
const { User, ImportOperation, Activity } = require('../models');

// Mock data for testing
const mockAdminId = new mongoose.Types.ObjectId();
const mockAdminName = 'Test Admin';

describe('Bulk Account Creation Service', () => {
  beforeAll(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svmpc-test');
    }
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await ImportOperation.deleteMany({});
    await Activity.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await ImportOperation.deleteMany({});
    await Activity.deleteMany({});
  });

  describe('createBulkAccounts', () => {
    it('should create accounts for all valid rows', async () => {
      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
        {
          member_id: 'MEM002',
          name: 'Jane Smith',
          phone_number: '+1-555-0002',
          email: 'jane@example.com',
          _rowNumber: 3,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      expect(result.statistics.successful_imports).toBe(2);
      expect(result.statistics.failed_imports).toBe(0);
      expect(result.statistics.skipped_rows).toBe(0);
      expect(result.createdUsers).toHaveLength(2);

      // Verify users were created in database
      const createdUser = await User.findOne({ member_id: 'MEM001' });
      expect(createdUser).toBeDefined();
      expect(createdUser.fullName).toBe('John Doe');
      expect(createdUser.phone_number).toBe('+1-555-0001');
      expect(createdUser.email).toBe('john@example.com');
      expect(createdUser.role).toBe('member');
      expect(createdUser.activation_status).toBe('pending_activation');
    });

    it('should set correct activation fields on created accounts', async () => {
      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      const createdUser = await User.findOne({ member_id: 'MEM001' });
      expect(createdUser.temporary_password_hash).toBeDefined();
      expect(createdUser.temporary_password_expires).toBeDefined();
      expect(createdUser.temporary_password_expires.getTime()).toBeGreaterThan(Date.now());
      expect(createdUser.import_id).toEqual(result.importOperation.id);
    });

    it('should skip duplicate member_id', async () => {
      // Create existing user
      await User.create({
        username: 'existinguser1',
        member_id: 'MEM001',
        fullName: 'Existing User',
        phone_number: '+1-555-9999',
        email: 'existing@example.com',
        password: 'hashedpassword',
        role: 'member',
      });

      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      expect(result.statistics.successful_imports).toBe(0);
      expect(result.statistics.skipped_rows).toBe(1);
      expect(result.statistics.import_errors).toHaveLength(1);
      expect(result.statistics.import_errors[0].error_message).toContain('Duplicate member_id');
    });

    it('should skip duplicate phone_number', async () => {
      // Create existing user
      await User.create({
        username: 'existinguser2',
        member_id: 'EXISTING',
        fullName: 'Existing User',
        phone_number: '+1-555-0001',
        email: 'existing@example.com',
        password: 'hashedpassword',
        role: 'member',
      });

      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      expect(result.statistics.successful_imports).toBe(0);
      expect(result.statistics.skipped_rows).toBe(1);
      expect(result.statistics.import_errors[0].error_message).toContain('Duplicate phone_number');
    });

    it('should skip duplicate email', async () => {
      // Create existing user
      await User.create({
        username: 'existinguser3',
        member_id: 'EXISTING',
        fullName: 'Existing User',
        phone_number: '+1-555-9999',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: 'member',
      });

      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      expect(result.statistics.successful_imports).toBe(0);
      expect(result.statistics.skipped_rows).toBe(1);
      expect(result.statistics.import_errors[0].error_message).toContain('Duplicate email');
    });

    it('should handle rows without email', async () => {
      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          _rowNumber: 2,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      expect(result.statistics.successful_imports).toBe(1);
      const createdUser = await User.findOne({ member_id: 'MEM001' });
      expect(createdUser.email).toBe('member_MEM001@svmpc.local');
    });

    it('should create ImportOperation record', async () => {
      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      const importOp = await ImportOperation.findById(result.importOperation.id);
      expect(importOp).toBeDefined();
      expect(importOp.admin_name).toBe(mockAdminName);
      expect(importOp.csv_file_name).toBe('test.csv');
      expect(importOp.total_rows).toBe(1);
      expect(importOp.successful_imports).toBe(1);
      expect(importOp.status).toBe('completed');
    });

    it('should log BULK_IMPORT activity', async () => {
      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
      ];

      await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      const activity = await Activity.findOne({ action: 'BULK_IMPORT' });
      expect(activity).toBeDefined();
      expect(activity.userId).toEqual(mockAdminId);
      expect(activity.description).toContain('Bulk imported 1 members');
      expect(activity.metadata.successful_imports).toBe(1);
    });

    it('should generate unique temporary passwords for each user', async () => {
      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
        {
          member_id: 'MEM002',
          name: 'Jane Smith',
          phone_number: '+1-555-0002',
          email: 'jane@example.com',
          _rowNumber: 3,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      const passwords = result.createdUsers.map(u => u.temporary_password);
      expect(new Set(passwords).size).toBe(2); // All passwords should be unique
    });

    it('should continue processing after encountering duplicate', async () => {
      // Create existing user
      await User.create({
        username: 'existinguser4',
        member_id: 'MEM001',
        fullName: 'Existing User',
        phone_number: '+1-555-9999',
        email: 'existing@example.com',
        password: 'hashedpassword',
        role: 'member',
      });

      const validRows = [
        {
          member_id: 'MEM001',
          name: 'John Doe',
          phone_number: '+1-555-0001',
          email: 'john@example.com',
          _rowNumber: 2,
        },
        {
          member_id: 'MEM002',
          name: 'Jane Smith',
          phone_number: '+1-555-0002',
          email: 'jane@example.com',
          _rowNumber: 3,
        },
      ];

      const result = await createBulkAccounts({
        validRows,
        csvFileName: 'test.csv',
        adminId: mockAdminId,
        adminName: mockAdminName,
      });

      expect(result.statistics.successful_imports).toBe(1);
      expect(result.statistics.skipped_rows).toBe(1);
      expect(result.createdUsers).toHaveLength(1);
      expect(result.createdUsers[0].member_id).toBe('MEM002');
    });
  });
});
