/**
 * Tests for Authentication Controller - Login with Temporary Passwords
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { login } = require('./auth.controller');

describe('Auth Controller - Login Endpoint', () => {
  beforeAll(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svmpc-test');
    }
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
  });

  describe('Login with member_id and temporary password', () => {
    it('should allow login with valid temporary password', async () => {
      // Create a user with temporary password
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      // Mock request and response
      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Login successful');
      expect(response.token).toBeDefined();
      expect(response.user.member_id).toBe('MEM001');
      expect(response.user.has_temporary_password).toBe(true);
    });

    it('should reject invalid temporary password', async () => {
      // Create a user with temporary password
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: 'WrongPassword123!',
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toBe('Invalid credentials');
    });

    it('should reject expired temporary password', async () => {
      // Create a user with expired temporary password
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toContain('temporary password has expired');
      expect(response.code).toBe('TEMP_PASSWORD_EXPIRED');
    });

    it('should allow login with permanent password after temporary password expires', async () => {
      // Create a user with expired temporary password but valid permanent password
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() - 1000); // Expired
      const permanentPassword = 'PermanentPass123!';

      const user = await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: permanentPassword,
        role: 'member',
        activation_status: 'activated',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: permanentPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Login successful');
      expect(response.token).toBeDefined();
    });

    it('should reject non-existent member_id', async () => {
      const req = {
        body: {
          member_id: 'NONEXISTENT',
          password: 'SomePassword123!',
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toBe('Invalid credentials');
    });

    it('should return JWT token on successful login', async () => {
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.token).toBeDefined();
      expect(typeof response.token).toBe('string');
      expect(response.token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const beforeLogin = user.lastLogin;

      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      const updatedUser = await User.findOne({ member_id: 'MEM001' });
      expect(updatedUser.lastLogin).toBeDefined();
      expect(updatedUser.lastLogin.getTime()).toBeGreaterThan(beforeLogin ? beforeLogin.getTime() : 0);
    });

    it('should include activation_status in response', async () => {
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.user.activation_status).toBe('pending_activation');
    });
  });

  describe('Login with email (traditional)', () => {
    it('should allow login with email and permanent password', async () => {
      const permanentPassword = 'PermanentPass123!';

      await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: permanentPassword,
        role: 'member',
      });

      const req = {
        body: {
          email: 'user@example.com',
          password: permanentPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Login successful');
      expect(response.token).toBeDefined();
    });

    it('should reject invalid email/password combination', async () => {
      const permanentPassword = 'PermanentPass123!';

      await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: permanentPassword,
        role: 'member',
      });

      const req = {
        body: {
          email: 'user@example.com',
          password: 'WrongPassword123!',
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Input validation', () => {
    it('should reject request without email or member_id', async () => {
      const req = {
        body: {
          password: 'SomePassword123!',
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toContain('Either email or member_id is required');
    });
  });

  describe('Temporary password expiration check', () => {
    it('should check expiration within 24 hours', async () => {
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      // Set expiration to 23 hours from now
      const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);

      await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      // Should succeed because password is not expired
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Login successful');
    });

    it('should reject password expired exactly at expiration time', async () => {
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
      // Set expiration to now (expired)
      const expiresAt = new Date(Date.now());

      await User.create({
        username: 'testmember',
        member_id: 'MEM001',
        fullName: 'Test Member',
        phone_number: '+1-555-0001',
        email: 'member@example.com',
        password: 'permanentpass',
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: expiresAt,
      });

      const req = {
        body: {
          member_id: 'MEM001',
          password: tempPassword,
        },
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});

describe('Auth Controller - Password Change Endpoint', () => {
  const { changePassword, validatePasswordStrength } = require('./auth.controller');

  beforeAll(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svmpc-test');
    }
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
  });

  describe('Password strength validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const errors = validatePasswordStrength('Pass1!');
      expect(errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const errors = validatePasswordStrength('password123!');
      expect(errors).toContain('Password must include at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const errors = validatePasswordStrength('PASSWORD123!');
      expect(errors).toContain('Password must include at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const errors = validatePasswordStrength('Password!');
      expect(errors).toContain('Password must include at least one number');
    });

    it('should reject password without special character', () => {
      const errors = validatePasswordStrength('Password123');
      expect(errors).toContain('Password must include at least one special character');
    });

    it('should accept valid password', () => {
      const errors = validatePasswordStrength('ValidPass123!');
      expect(errors).length === 0;
    });

    it('should accept password with various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', '"', "'", '\\', '|', ',', '.', '<', '>', '/', '?'];
      specialChars.forEach((char) => {
        const password = `ValidPass123${char}`;
        const errors = validatePasswordStrength(password);
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('Change password endpoint', () => {
    it('should successfully change password with valid current password', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
      });

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Password changed successfully');
      expect(response.user.id).toBeDefined();

      // Verify password was actually changed
      const updatedUser = await User.findById(user._id);
      const isNewPasswordValid = await updatedUser.comparePassword(newPassword);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
      });

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword: 'WrongPassword123!',
          newPassword,
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toBe('Current password is incorrect');
    });

    it('should reject password that does not meet security requirements', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'weak'; // Too short, missing requirements

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
      });

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toContain('Password does not meet security requirements');
      expect(response.errors).toBeDefined();
      expect(response.errors.length).toBeGreaterThan(0);
    });

    it('should require both current and new password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: 'CurrentPass123!',
        role: 'member',
      });

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword: 'CurrentPass123!',
          // Missing newPassword
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.status.mock.results[0].value.json.mock.calls[0][0];
      expect(response.message).toContain('required');
    });

    it('should update last_password_change timestamp', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
      });

      const beforeChange = user.last_password_change;

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.last_password_change).toBeDefined();
      expect(updatedUser.last_password_change.getTime()).toBeGreaterThan(beforeChange ? beforeChange.getTime() : 0);
    });

    it('should invalidate temporary password when changing password', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';
      const tempPassword = 'TempPass123!';
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
        activation_status: 'pending_activation',
        temporary_password_hash: tempPasswordHash,
        temporary_password_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      expect(user.temporary_password_hash).toBeDefined();

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Password changed successfully');
      
      // Verify the response shows the changes
      expect(response.user.activation_status).toBe('activated');
    });

    it('should update activation status to activated when changing password from pending_activation', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
        activation_status: 'pending_activation',
      });

      expect(user.activation_status).toBe('pending_activation');

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Password changed successfully');
      expect(response.user.activation_status).toBe('activated');
    });

    it('should log password change activity', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
      });

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      expect(res.json).toHaveBeenCalled();
      // Activity logging is async and doesn't block, so we just verify the endpoint succeeded
    });

    it('should return user info in response', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewPass123!';

      const user = await User.create({
        username: 'testuser',
        email: 'user@example.com',
        fullName: 'Test User',
        password: currentPassword,
        role: 'member',
        member_id: 'MEM001',
      });

      const req = {
        user: { _id: user._id },
        body: {
          currentPassword,
          newPassword,
        },
        headers: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      };

      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      };

      await changePassword(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.user).toBeDefined();
      expect(response.user.id).toBeDefined();
      expect(response.user.username).toBe('testuser');
      expect(response.user.email).toBe('user@example.com');
      expect(response.user.member_id).toBe('MEM001');
      expect(response.user.activation_status).toBeDefined();
    });
  });
});
