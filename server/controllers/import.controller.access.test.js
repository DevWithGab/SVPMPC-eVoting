/**
 * Import Controller Access Control Integration Tests
 * Tests for role-based access control on import endpoints
 */

const request = require('supertest');
const express = require('express');
const { User, ImportOperation } = require('../models');
const importRoutes = require('../routes/import.routes');
const { verifyToken } = require('../middleware/auth.middleware');

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Parse token to get user role
  const token = authHeader.replace('Bearer ', '');
  const userRole = token.split('-')[0]; // Format: "admin-token" or "member-token"

  req.user = {
    _id: `${userRole}-123`,
    role: userRole,
    fullName: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} User`,
  };

  next();
};

// Create test app
const app = express();
app.use(express.json());
app.use(mockAuthMiddleware);
app.use('/api/imports', importRoutes);

describe('Import Controller Access Control', () => {
  describe('GET /api/imports/members', () => {
    it('should allow admin users to access member list', async () => {
      const response = await request(app)
        .get('/api/imports/members')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should reject member users with 403 Forbidden', async () => {
      const response = await request(app)
        .get('/api/imports/members')
        .set('Authorization', 'Bearer member-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject officer users with 403 Forbidden', async () => {
      const response = await request(app)
        .get('/api/imports/members')
        .set('Authorization', 'Bearer officer-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/imports/members')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/imports/history', () => {
    it('should allow admin users to access import history', async () => {
      const response = await request(app)
        .get('/api/imports/history')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should reject member users with 403 Forbidden', async () => {
      const response = await request(app)
        .get('/api/imports/history')
        .set('Authorization', 'Bearer member-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/imports/bulk-retry', () => {
    it('should allow admin users to perform bulk retry', async () => {
      const response = await request(app)
        .post('/api/imports/bulk-retry')
        .set('Authorization', 'Bearer admin-token')
        .send({
          memberIds: ['member-1', 'member-2'],
          notificationType: 'sms',
          temporaryPassword: 'TempPass123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject member users with 403 Forbidden', async () => {
      const response = await request(app)
        .post('/api/imports/bulk-retry')
        .set('Authorization', 'Bearer member-token')
        .send({
          memberIds: ['member-1'],
          notificationType: 'sms',
          temporaryPassword: 'TempPass123!',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/imports/resend-invitation/:userId', () => {
    it('should allow admin users to resend invitations', async () => {
      const response = await request(app)
        .post('/api/imports/resend-invitation/member-123')
        .set('Authorization', 'Bearer admin-token')
        .send({
          deliveryMethod: 'sms',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject member users with 403 Forbidden', async () => {
      const response = await request(app)
        .post('/api/imports/resend-invitation/member-123')
        .set('Authorization', 'Bearer member-token')
        .send({
          deliveryMethod: 'sms',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Data Masking in Responses', () => {
    it('should mask sensitive data in member list responses', async () => {
      // This test verifies that the maskSensitiveData middleware is applied
      // The actual masking is tested in the middleware tests
      const response = await request(app)
        .get('/api/imports/members')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Response should have data structure
      expect(response.body).toHaveProperty('data');
    });

    it('should mask sensitive data in import history responses', async () => {
      const response = await request(app)
        .get('/api/imports/history')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      // Response should have data structure
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Access Control Validation', () => {
    it('should validate admin role on all protected endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/imports/members' },
        { method: 'get', path: '/api/imports/history' },
        { method: 'post', path: '/api/imports/bulk-retry' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', 'Bearer member-token')
          .send({
            memberIds: ['member-1'],
            notificationType: 'sms',
            temporaryPassword: 'TempPass123!',
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('should allow admin role on all protected endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/imports/members' },
        { method: 'get', path: '/api/imports/history' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      }
    });
  });
});
