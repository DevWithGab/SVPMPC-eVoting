// server/services/passwordGenerator.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generates a unique, random temporary password
 * Requirements:
 * - At least 8 characters
 * - Includes uppercase letters
 * - Includes lowercase letters
 * - Includes numbers
 * - Includes special characters
 * 
 * @returns {string} A temporary password meeting all requirements
 */
function generateTemporaryPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*';
  
  // Ensure at least one character from each required set
  const password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)],
  ];
  
  // Fill remaining characters (4 more to reach 8 minimum) with random mix
  const allChars = uppercase + lowercase + numbers + specialChars;
  for (let i = 0; i < 4; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }
  
  // Shuffle the password array to avoid predictable patterns
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join('');
}

/**
 * Hashes a temporary password using bcryptjs
 * Uses salt rounds of 10 as specified in requirements
 * 
 * @param {string} password - The temporary password to hash
 * @returns {Promise<string>} The hashed password
 */
async function hashTemporaryPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a temporary password against its hash
 * 
 * @param {string} candidatePassword - The password to verify
 * @param {string} passwordHash - The hashed password to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
async function verifyTemporaryPassword(candidatePassword, passwordHash) {
  return bcrypt.compare(candidatePassword, passwordHash);
}

module.exports = {
  generateTemporaryPassword,
  hashTemporaryPassword,
  verifyTemporaryPassword,
};
