/**
 * Encryption Service
 * Handles encryption and decryption of sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 * 
 * Requirements:
 * - Encrypt sensitive data (email, member_id) at rest
 * - Ensure HTTPS for all data transmission
 * - Hash all passwords and tokens
 */

const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Encryption configuration
 * Uses AES-256-GCM for authenticated encryption with integrity checking
 */
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits for GCM authentication tag
const IV_LENGTH = 12; // 96 bits (12 bytes) - recommended for GCM

/**
 * Derives an encryption key from the master secret using PBKDF2
 * This ensures we have a proper cryptographic key from the environment variable
 * 
 * @param {string} masterSecret - The master encryption secret from environment
 * @returns {Buffer} A 32-byte key suitable for AES-256
 */
function deriveKey(masterSecret) {
  if (!masterSecret || masterSecret.length < 16) {
    throw new Error('ENCRYPTION_SECRET must be at least 16 characters long');
  }
  
  // Use PBKDF2 to derive a proper 256-bit key from the master secret
  // Using a fixed salt for consistency (the secret itself provides entropy)
  const salt = Buffer.from('svmpc_encryption_salt_v1', 'utf8');
  return crypto.pbkdf2Sync(masterSecret, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * Returns a combined buffer of: IV + ciphertext + authTag
 * 
 * @param {string} plaintext - The data to encrypt
 * @returns {string} Base64-encoded encrypted data (IV + ciphertext + authTag)
 * @throws {Error} If encryption fails or secret is not configured
 */
function encrypt(plaintext) {
  try {
    const encryptionSecret = process.env.ENCRYPTION_SECRET;
    
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET environment variable is not configured');
    }

    // Derive the encryption key
    const key = deriveKey(encryptionSecret);
    
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + authTag and encode as base64
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
}

/**
 * Decrypts data encrypted with the encrypt function
 * Verifies the authentication tag to ensure data integrity
 * 
 * @param {string} encryptedData - Base64-encoded encrypted data (IV + ciphertext + authTag)
 * @returns {string} The decrypted plaintext
 * @throws {Error} If decryption fails, authentication fails, or secret is not configured
 */
function decrypt(encryptedData) {
  try {
    const encryptionSecret = process.env.ENCRYPTION_SECRET;
    
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET environment variable is not configured');
    }

    // Derive the encryption key
    const key = deriveKey(encryptionSecret);
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(combined.length - TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH, combined.length - TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set the authentication tag for verification
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
}

/**
 * Generates a cryptographically secure random token
 * Used for activation tokens and other security-sensitive tokens
 * 
 * @param {number} length - Length of the token in bytes (default: 32)
 * @returns {string} Hex-encoded random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hashes a token using SHA-256
 * Used to store tokens securely in the database
 * 
 * @param {string} token - The token to hash
 * @returns {string} Hex-encoded hash of the token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies a token against its hash
 * 
 * @param {string} token - The token to verify
 * @param {string} tokenHash - The hash to compare against
 * @returns {boolean} True if token matches hash, false otherwise
 */
function verifyTokenHash(token, tokenHash) {
  const hash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(tokenHash));
}

module.exports = {
  encrypt,
  decrypt,
  generateSecureToken,
  hashToken,
  verifyTokenHash,
  ALGORITHM,
  IV_LENGTH,
  TAG_LENGTH,
};
