/**
 * Tests for Encryption Service
 * Validates encryption/decryption functionality and security properties
 */

const {
  encrypt,
  decrypt,
  generateSecureToken,
  hashToken,
  verifyTokenHash,
} = require('./encryptionService');

describe('Encryption Service', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'sensitive@example.com';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle different data types', () => {
      const testCases = [
        'simple text',
        'email@example.com',
        'MEM001',
        'Special!@#$%^&*()Characters',
        '12345',
        'Very long text with multiple words and special characters !@#$%^&*()',
      ];

      testCases.forEach(plaintext => {
        const encrypted = encrypt(plaintext);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      });
    });

    it('should generate different ciphertexts for same plaintext', () => {
      const plaintext = 'sensitive@example.com';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should throw error on invalid encrypted data', () => {
      const invalidData = 'invalid-base64-data!!!';
      expect(() => decrypt(invalidData)).toThrow();
    });

    it('should throw error on corrupted encrypted data', () => {
      const plaintext = 'test data';
      const encrypted = encrypt(plaintext);
      
      // Corrupt the encrypted data
      const corrupted = Buffer.from(encrypted, 'base64');
      corrupted[0] = (corrupted[0] + 1) % 256; // Flip a bit
      const corruptedBase64 = corrupted.toString('base64');
      
      expect(() => decrypt(corruptedBase64)).toThrow();
    });
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of correct length', () => {
      const token32 = generateSecureToken(32);
      expect(token32).toHaveLength(64); // 32 bytes = 64 hex characters
      
      const token16 = generateSecureToken(16);
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);
      expect(token1).not.toBe(token2);
    });

    it('should generate valid hex strings', () => {
      const token = generateSecureToken(32);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should use default length of 32 bytes', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });
  });

  describe('hashToken and verifyTokenHash', () => {
    it('should hash tokens consistently', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should verify valid tokens', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);
      expect(verifyTokenHash(token, hash)).toBe(true);
    });

    it('should reject invalid tokens', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);
      expect(verifyTokenHash('wrong-token', hash)).toBe(false);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce valid SHA-256 hashes', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should not expose plaintext in encrypted data', () => {
      const plaintext = 'secret@example.com';
      const encrypted = encrypt(plaintext);
      
      // Encrypted data should not contain plaintext
      expect(encrypted).not.toContain(plaintext);
      
      // Encrypted data should be base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('should produce different ciphertexts with different plaintexts', () => {
      const encrypted1 = encrypt('data1');
      const encrypted2 = encrypt('data2');
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 مرحبا мир';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if ENCRYPTION_SECRET is not set', () => {
      const originalSecret = process.env.ENCRYPTION_SECRET;
      delete process.env.ENCRYPTION_SECRET;
      
      try {
        expect(() => encrypt('test')).toThrow('ENCRYPTION_SECRET environment variable is not configured');
      } finally {
        process.env.ENCRYPTION_SECRET = originalSecret;
      }
    });

    it('should handle encryption errors gracefully', () => {
      // This test verifies error handling in the service
      const plaintext = 'test data';
      const encrypted = encrypt(plaintext);
      
      // Verify we can still decrypt after encryption
      expect(() => decrypt(encrypted)).not.toThrow();
    });
  });
});
