// server/services/passwordGenerator.test.js
const {
  generateTemporaryPassword,
  hashTemporaryPassword,
  verifyTemporaryPassword,
} = require('./passwordGenerator');

describe('Password Generator Service', () => {
  describe('generateTemporaryPassword', () => {
    test('should generate a password with at least 8 characters', () => {
      const password = generateTemporaryPassword();
      expect(password.length).toBeGreaterThanOrEqual(8);
    });

    test('should include uppercase letters', () => {
      const password = generateTemporaryPassword();
      expect(/[A-Z]/.test(password)).toBe(true);
    });

    test('should include lowercase letters', () => {
      const password = generateTemporaryPassword();
      expect(/[a-z]/.test(password)).toBe(true);
    });

    test('should include numbers', () => {
      const password = generateTemporaryPassword();
      expect(/[0-9]/.test(password)).toBe(true);
    });

    test('should include special characters', () => {
      const password = generateTemporaryPassword();
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    test('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(generateTemporaryPassword());
      }
      // All 100 passwords should be unique
      expect(passwords.size).toBe(100);
    });
  });

  describe('hashTemporaryPassword', () => {
    test('should hash a password', async () => {
      const password = 'TestPass123!';
      const hash = await hashTemporaryPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should produce different hashes for the same password', async () => {
      const password = 'TestPass123!';
      const hash1 = await hashTemporaryPassword(password);
      const hash2 = await hashTemporaryPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyTemporaryPassword', () => {
    test('should verify a correct password', async () => {
      const password = 'TestPass123!';
      const hash = await hashTemporaryPassword(password);
      const isValid = await verifyTemporaryPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject an incorrect password', async () => {
      const password = 'TestPass123!';
      const wrongPassword = 'WrongPass456@';
      const hash = await hashTemporaryPassword(password);
      const isValid = await verifyTemporaryPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    test('should verify generated temporary passwords', async () => {
      const password = generateTemporaryPassword();
      const hash = await hashTemporaryPassword(password);
      const isValid = await verifyTemporaryPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });
});
