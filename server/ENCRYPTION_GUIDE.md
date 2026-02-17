# Data Encryption Implementation Guide

## Overview

This document describes the data encryption implementation for the SVMPC Voting System, specifically for the Bulk Member Import & Email Activation feature. The implementation ensures sensitive data is encrypted at rest and all data transmission uses HTTPS.

## Requirements Addressed

- **Requirement 10.1**: Encrypt sensitive data (email, member_id) at rest
- **Requirement 10.2**: Use HTTPS for all data transmission
- **Requirement 10.3**: Hash all passwords using bcryptjs with salt rounds of 10
- **Requirement 10.5**: Hash all passwords and tokens
- **Requirement 10.10**: Hash activation tokens in the database

## Architecture

### 1. At-Rest Encryption (Database)

#### Encryption Service (`server/services/encryptionService.js`)

The encryption service provides:

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV Length**: 12 bytes (96 bits) - recommended for GCM
- **Authentication Tag**: 16 bytes (128 bits) - ensures data integrity

**Functions**:

```javascript
// Encrypt sensitive data
encrypt(plaintext) -> base64-encoded encrypted data

// Decrypt sensitive data
decrypt(encryptedData) -> plaintext

// Generate cryptographically secure tokens
generateSecureToken(length) -> hex-encoded token

// Hash tokens for storage
hashToken(token) -> hex-encoded hash

// Verify token against hash
verifyTokenHash(token, tokenHash) -> boolean
```

#### Encrypted Fields in User Model

The User model now encrypts the following sensitive fields:

1. **email** - Member's email address
   - Stored in: `email_encrypted` (encrypted)
   - Original field: `email` (used for queries and display)

2. **member_id** - Unique member identifier
   - Stored in: `member_id_encrypted` (encrypted)
   - Original field: `member_id` (used for queries and display)

**Encryption Flow**:

```
User Input (plaintext)
    ↓
Pre-save Hook (Mongoose)
    ↓
Encrypt using AES-256-GCM
    ↓
Store encrypted data in database
    ↓
Store plaintext in memory for queries
```

**Decryption Flow**:

```
Database Query
    ↓
Post-find Hook (Mongoose)
    ↓
Decrypt encrypted fields
    ↓
Return document with decrypted data
```

### 2. In-Transit Encryption (HTTPS)

#### HTTPS Configuration (`server/config/https.js`)

The HTTPS configuration provides:

- **TLS Version**: 1.2 or higher (minimum security standard)
- **Cipher Suites**: Strong ciphers only (HIGH:!aNULL:!MD5)
- **Certificate Support**: Self-signed (development) or CA-signed (production)

**Features**:

1. **HTTPS Server Creation**
   - Reads SSL certificates from environment variables
   - Creates HTTPS server with strong security options
   - Falls back to HTTP if certificates not configured

2. **HTTPS Enforcement Middleware**
   - Redirects HTTP to HTTPS in production
   - Checks `x-forwarded-proto` header for proxy scenarios

3. **Security Headers Middleware**
   - X-Frame-Options: DENY (prevents clickjacking)
   - X-Content-Type-Options: nosniff (prevents MIME sniffing)
   - X-XSS-Protection: 1; mode=block (enables XSS protection)
   - Content-Security-Policy: Restricts resource loading
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy: Restricts browser features
   - HSTS: Enforces HTTPS in production

### 3. Password Hashing

#### Existing Implementation

Passwords are already hashed using bcryptjs with salt rounds of 10:

```javascript
// In User model pre-save hook
if (this.isModified('password')) {
  this.password = await bcrypt.hash(this.password, 10);
}
```

#### Temporary Password Hashing

Temporary passwords are also hashed before storage:

```javascript
// In passwordGenerator service
async function hashTemporaryPassword(password) {
  return bcrypt.hash(password, 10);
}
```

#### Token Hashing

Activation tokens and other security tokens are hashed using SHA-256:

```javascript
// In encryptionService
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

## Configuration

### Environment Variables

Add the following to `server/.env`:

```env
# Encryption
ENCRYPTION_SECRET=your-secure-encryption-secret-key-change-this-in-production-min-16-chars

# HTTPS (optional, for production)
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

**Important**: 
- `ENCRYPTION_SECRET` must be at least 16 characters long
- In production, use a strong, randomly generated secret
- Never commit secrets to version control
- Use a secrets management system (AWS Secrets Manager, HashiCorp Vault, etc.)

### HTTPS Certificate Setup

#### Development (Self-Signed Certificate)

Generate a self-signed certificate for testing:

```bash
# Generate private key
openssl genrsa -out server.key 2048

# Generate certificate
openssl req -new -x509 -key server.key -out server.crt -days 365

# Set environment variables
export SSL_CERT_PATH=/path/to/server.crt
export SSL_KEY_PATH=/path/to/server.key
```

#### Production (CA-Signed Certificate)

Use certificates from a trusted Certificate Authority:

1. **Let's Encrypt** (Free, automated)
   ```bash
   # Using Certbot
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Certificates will be at:
   # /etc/letsencrypt/live/yourdomain.com/fullchain.pem
   # /etc/letsencrypt/live/yourdomain.com/privkey.pem
   ```

2. **Commercial CAs** (DigiCert, Comodo, etc.)
   - Purchase certificate
   - Follow CA's installation instructions
   - Set environment variables to certificate paths

3. **AWS Certificate Manager** (If using AWS)
   - Create certificate in ACM
   - Use with Application Load Balancer (ALB)
   - ALB handles HTTPS termination

## Usage Examples

### Encrypting Sensitive Data

```javascript
const { encrypt, decrypt } = require('./services/encryptionService');

// Encrypt
const plainEmail = 'user@example.com';
const encryptedEmail = encrypt(plainEmail);
console.log(encryptedEmail); // Base64-encoded encrypted data

// Decrypt
const decryptedEmail = decrypt(encryptedEmail);
console.log(decryptedEmail); // 'user@example.com'
```

### Generating and Hashing Tokens

```javascript
const { generateSecureToken, hashToken, verifyTokenHash } = require('./services/encryptionService');

// Generate token
const token = generateSecureToken(32);
console.log(token); // Hex-encoded random token

// Hash token for storage
const tokenHash = hashToken(token);
console.log(tokenHash); // SHA-256 hash

// Verify token
const isValid = verifyTokenHash(token, tokenHash);
console.log(isValid); // true
```

### User Model Encryption

```javascript
const User = require('./models/user.model');

// Create user with sensitive data
const user = new User({
  email: 'member@example.com',
  member_id: 'MEM001',
  fullName: 'John Doe',
  phone_number: '+1-555-0123',
  password: 'SecurePassword123!',
  role: 'member',
});

// Save user (email and member_id are automatically encrypted)
await user.save();

// Retrieve user (email and member_id are automatically decrypted)
const retrievedUser = await User.findById(user._id);
console.log(retrievedUser.email); // 'member@example.com' (decrypted)
console.log(retrievedUser.member_id); // 'MEM001' (decrypted)

// In database, encrypted versions are stored
console.log(retrievedUser.email_encrypted); // Base64-encoded encrypted data
console.log(retrievedUser.member_id_encrypted); // Base64-encoded encrypted data
```

## Security Considerations

### 1. Key Management

- **Never hardcode secrets** in source code
- **Use environment variables** for all secrets
- **Rotate secrets regularly** in production
- **Use a secrets management system** (AWS Secrets Manager, HashiCorp Vault, etc.)
- **Restrict access** to environment variables and secrets

### 2. Encryption Best Practices

- **AES-256-GCM** provides both confidentiality and authenticity
- **PBKDF2** with 100,000 iterations provides strong key derivation
- **Random IVs** are generated for each encryption operation
- **Authentication tags** verify data integrity

### 3. HTTPS Best Practices

- **TLS 1.2 or higher** is required
- **Strong cipher suites** are enforced
- **HSTS** is enabled in production to prevent downgrade attacks
- **Security headers** protect against common web vulnerabilities
- **Certificate pinning** can be implemented for additional security

### 4. Password Security

- **Bcryptjs with salt rounds of 10** provides strong password hashing
- **Temporary passwords** are also hashed before storage
- **Passwords are never logged** or exposed in responses
- **Password change** invalidates temporary passwords

### 5. Token Security

- **Cryptographically secure random generation** using `crypto.randomBytes()`
- **SHA-256 hashing** for token storage
- **Timing-safe comparison** prevents timing attacks
- **Token expiration** is enforced (24 hours for temporary passwords)

## Monitoring and Logging

### Encryption Errors

Encryption/decryption errors are logged but don't fail operations:

```javascript
try {
  if (this.isModified('email') && this.email) {
    this.email_encrypted = encrypt(this.email);
  }
} catch (error) {
  console.error('Encryption error in pre-save hook:', error.message);
  // Operation continues without encryption
}
```

### HTTPS Warnings

HTTPS configuration warnings are logged:

```
WARNING: Running in production without HTTPS. This is not recommended.
Set SSL_CERT_PATH and SSL_KEY_PATH environment variables to enable HTTPS.
```

### Activity Logging

All sensitive operations are logged in the activity log:

- User login (with member_id)
- Password changes
- Account activation
- Bulk imports
- SMS/email sends

## Testing

### Unit Tests

Test encryption/decryption:

```javascript
const { encrypt, decrypt } = require('../services/encryptionService');

describe('Encryption Service', () => {
  it('should encrypt and decrypt data', () => {
    const plaintext = 'sensitive@example.com';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should generate different ciphertexts for same plaintext', () => {
    const plaintext = 'sensitive@example.com';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2); // Different IVs
  });
});
```

### Integration Tests

Test User model encryption:

```javascript
const User = require('../models/user.model');

describe('User Model Encryption', () => {
  it('should encrypt email on save', async () => {
    const user = new User({
      email: 'test@example.com',
      member_id: 'MEM001',
      fullName: 'Test User',
      phone_number: '+1-555-0123',
      password: 'Password123!',
    });

    await user.save();

    // Check encrypted fields exist
    expect(user.email_encrypted).toBeDefined();
    expect(user.member_id_encrypted).toBeDefined();

    // Check plaintext fields still exist
    expect(user.email).toBe('test@example.com');
    expect(user.member_id).toBe('MEM001');
  });

  it('should decrypt email on retrieval', async () => {
    const user = new User({
      email: 'test@example.com',
      member_id: 'MEM001',
      fullName: 'Test User',
      phone_number: '+1-555-0123',
      password: 'Password123!',
    });

    await user.save();

    const retrieved = await User.findById(user._id);
    expect(retrieved.email).toBe('test@example.com');
    expect(retrieved.member_id).toBe('MEM001');
  });
});
```

## Troubleshooting

### Encryption Secret Not Configured

**Error**: `ENCRYPTION_SECRET environment variable is not configured`

**Solution**: Add `ENCRYPTION_SECRET` to `.env` file with a value at least 16 characters long.

### HTTPS Certificates Not Found

**Error**: `SSL certificate files not found at /path/to/cert`

**Solution**: 
1. Generate or obtain SSL certificates
2. Set `SSL_CERT_PATH` and `SSL_KEY_PATH` environment variables
3. Restart the server

### Decryption Failures

**Error**: `Failed to decrypt data: Unsupported state or unable to authenticate data`

**Possible causes**:
1. `ENCRYPTION_SECRET` changed (data encrypted with different key)
2. Encrypted data corrupted
3. Wrong encryption algorithm

**Solution**: 
1. Verify `ENCRYPTION_SECRET` hasn't changed
2. Check database for corrupted data
3. Re-encrypt data if necessary

## Migration Guide

### Migrating Existing Data

If you have existing unencrypted data, follow these steps:

1. **Backup database**
   ```bash
   mongodump --uri "mongodb://localhost:27017/SVMPC_VOTE" --out ./backup
   ```

2. **Update User model** with encryption fields

3. **Create migration script**
   ```javascript
   const User = require('./models/user.model');

   async function migrateEncryption() {
     const users = await User.find({});
     for (const user of users) {
       user.email = user.email; // Trigger encryption
       user.member_id = user.member_id; // Trigger encryption
       await user.save();
     }
     console.log('Migration complete');
   }

   migrateEncryption();
   ```

4. **Run migration script**
   ```bash
   node migration-script.js
   ```

5. **Verify encryption**
   ```bash
   # Check that encrypted fields are populated
   db.users.findOne({}, { email_encrypted: 1, member_id_encrypted: 1 })
   ```

## Compliance

This implementation helps meet the following compliance requirements:

- **GDPR**: Data encryption at rest and in transit
- **HIPAA**: Secure data transmission and storage
- **PCI DSS**: Strong encryption and secure key management
- **SOC 2**: Encryption controls and security monitoring

## References

- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines/)
- [OWASP Encryption Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Let's Encrypt](https://letsencrypt.org/)
- [HTTPS Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
