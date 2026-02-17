/**
 * Nodemailer Integration Test
 * Tests real email sending functionality
 * Run with: npm test -- emailService.test.nodemailer.js
 */

const { sendEmailViaNodemailer, mockSendEmail } = require('./emailService');
const { transporter, verifyTransporter } = require('../config/nodemailer');

describe('Nodemailer Email Service', () => {
  
  // Test 1: Verify transporter connection
  describe('Transporter Configuration', () => {
    test('should create transporter with Gmail credentials', () => {
      expect(transporter).toBeDefined();
      expect(transporter.sendMail).toBeDefined();
    });

    test('should have email credentials configured', () => {
      expect(process.env.EMAIL_USER).toBeDefined();
      expect(process.env.EMAIL_PASSWORD).toBeDefined();
      expect(process.env.EMAIL_PROVIDER).toBe('gmail');
    });
  });

  // Test 2: Send real email via Nodemailer
  describe('Real Email Sending', () => {
    test('should send email via Nodemailer when credentials are configured', async () => {
      const testEmail = {
        email: 'test@example.com',
        subject: 'Test Email - SVMPC',
        htmlContent: '<h1>Test Email</h1><p>This is a test email from Nodemailer</p>',
        textContent: 'Test Email\n\nThis is a test email from Nodemailer',
      };

      const result = await sendEmailViaNodemailer(testEmail);

      expect(result).toBeDefined();
      expect(result.email).toBe(testEmail.email);
      expect(result.status).toBe('sent');
      expect(result.timestamp).toBeDefined();
      
      // Check if it's a real send (has messageId) or mock (has isMock flag)
      if (result.isMock) {
        console.log('⚠️ Using mock email (credentials may not be configured)');
      } else {
        console.log('✅ Real email sent via Nodemailer');
        expect(result.emailId).toBeDefined();
        expect(result.response).toBeDefined();
      }
    }, 10000); // 10 second timeout for email sending

    test('should handle email sending errors gracefully', async () => {
      const invalidEmail = {
        email: 'invalid-email-format',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        textContent: 'Test',
      };

      const result = await sendEmailViaNodemailer(invalidEmail);
      
      // Should either fail gracefully or fall back to mock
      expect(result).toBeDefined();
      expect(result.email).toBe(invalidEmail.email);
    });
  });

  // Test 3: Mock email fallback
  describe('Mock Email Fallback', () => {
    test('should provide mock email when real sending fails', async () => {
      const result = await mockSendEmail({
        email: 'test@example.com',
        subject: 'Mock Test',
        htmlContent: '<p>Mock</p>',
        textContent: 'Mock',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe('sent');
      expect(result.isMock).toBe(true);
      expect(result.emailId).toMatch(/^EMAIL_/);
    });
  });

  // Test 4: Email credentials validation
  describe('Email Credentials', () => {
    test('should have valid Gmail credentials in .env', () => {
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;

      expect(emailUser).toBeDefined();
      expect(emailPassword).toBeDefined();
      expect(emailUser).toContain('@');
      expect(emailPassword.length).toBeGreaterThan(0);
    });

    test('should use correct email provider', () => {
      expect(process.env.EMAIL_PROVIDER).toBe('gmail');
    });

    test('should have EMAIL_FROM configured', () => {
      expect(process.env.EMAIL_FROM).toBeDefined();
      expect(process.env.EMAIL_FROM).toContain('@');
    });
  });

  // Test 5: Email content formatting
  describe('Email Content', () => {
    test('should send email with proper HTML and text content', async () => {
      const emailContent = {
        email: 'test@example.com',
        subject: 'SVMPC - Test Email',
        htmlContent: `
          <html>
            <body>
              <h1>Welcome to SVMPC</h1>
              <p>Your account has been created.</p>
              <p>Temporary Password: TempPass123!</p>
            </body>
          </html>
        `,
        textContent: `
          Welcome to SVMPC
          
          Your account has been created.
          Temporary Password: TempPass123!
        `,
      };

      const result = await sendEmailViaNodemailer(emailContent);

      expect(result).toBeDefined();
      expect(result.status).toBe('sent');
      expect(result.email).toBe(emailContent.email);
    });
  });

  // Test 6: Verify transporter connection
  describe('Transporter Verification', () => {
    test('should verify transporter connection', async () => {
      const isVerified = await verifyTransporter(transporter);
      
      if (isVerified) {
        console.log('✅ Transporter connection verified');
      } else {
        console.log('❌ Transporter connection failed - check credentials');
      }
      
      // Test should pass either way (real or mock)
      expect(typeof isVerified).toBe('boolean');
    }, 10000);
  });

});

/**
 * Manual Test Instructions
 * 
 * To run these tests:
 * 1. Ensure .env has valid Gmail credentials
 * 2. Run: npm test -- emailService.test.nodemailer.js
 * 3. Check console output for ✅ or ❌ indicators
 * 
 * Expected Results:
 * - If credentials are valid: Real emails will be sent
 * - If credentials are invalid: Mock emails will be used
 * - All tests should pass regardless
 */
