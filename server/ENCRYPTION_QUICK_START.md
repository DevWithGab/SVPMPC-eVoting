# Encryption Quick Start Guide

## Overview

This guide provides quick setup and usage instructions for the data encryption implementation.

## Quick Setup (5 minutes)

### 1. Generate Encryption Secret

```bash
# Generate a random 32-byte secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update .env File

```env
# Add to server/.env
ENCRYPTION_SECRET=<paste-generated-secret-here>
```

### 3. Start Server

```bash
npm run dev
```

The server will now:
- Encrypt email and member_id fields when saving users
- Decrypt them automatically when retrieving users
- Use HTTPS if certificates are configured
- Fall back to HTTP if certificates are not available

## Usage Examples

### Encrypting User Data

```javascript
const User = require('./models/user.model');

// Create user - email and member_id are automatically encrypted
const user = new User({
  email: 'member@example.com',
  member_id: 'MEM001',
  fullName: 'John Doe',
  phone_number: '+1-555-0123',
  password: 'SecurePassword123!',
  role: 'member',
});

await user.save();
// email_encrypted and member_id_encrypted are now stored in database
```

### Retrieving User Data

```javascript
// Retrieve user - email and member_id are automatically decrypted
const user = await User.findById(userId);
console.log(user.email); // 'member@example.com' (decrypted)
console.log(user.member_id); // 'MEM001' (decrypted)
```

### Using Encryption Service Directly

```javascript
const { encrypt, decrypt, generateSecureToken, hashToken } = require('./services/encryptionService');

// Encrypt/decrypt data
const encrypted = encrypt('sensitive@example.com');
const decrypted = decrypt(encrypted);

// Generate and hash tokens
const token = generateSecureToken(32);
const tokenHash = hashToken(token);
```

## HTTPS Setup (Optional)

### Development: Self-Signed Certificate

```bash
# Generate certificate
openssl genrsa -out server.key 2048
openssl req -new -x509 -key server.key -out server.crt -days 365

# Update .env
SSL_CERT_PATH=/path/to/server.crt
SSL_KEY_PATH=/path/to/server.key

# Restart server
npm run dev
```

### Production: Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update .env
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Restart server
npm start
```

## Testing

### Run Encryption Tests

```bash
npm test -- encryptionService.test.js
```

### Manual Testing

```javascript
// Test encryption/decryption
const { encrypt, decrypt } = require('./services/encryptionService');

const plaintext = 'test@example.com';
const encrypted = encrypt(plaintext);
const decrypted = decrypt(encrypted);

console.log('Original:', plaintext);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', plaintext === decrypted); // true
```

## Troubleshooting

### Error: ENCRYPTION_SECRET environment variable is not configured

**Solution**: Add `ENCRYPTION_SECRET` to `.env` file

```env
ENCRYPTION_SECRET=your-secret-key-here
```

### Error: SSL certificate files not found

**Solution**: Either:
1. Generate self-signed certificates (see HTTPS Setup above)
2. Remove `SSL_CERT_PATH` and `SSL_KEY_PATH` from `.env` to use HTTP

### Error: Failed to decrypt data

**Possible causes**:
- `ENCRYPTION_SECRET` changed (data encrypted with different key)
- Encrypted data corrupted
- Wrong encryption algorithm

**Solution**: Verify `ENCRYPTION_SECRET` hasn't changed

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| ENCRYPTION_SECRET | Yes | Master encryption secret (min 16 chars) | `abc123...xyz` |
| SSL_CERT_PATH | No | Path to SSL certificate | `/path/to/cert.crt` |
| SSL_KEY_PATH | No | Path to SSL private key | `/path/to/key.key` |
| NODE_ENV | No | Environment (development/production) | `production` |

## Security Checklist

- [ ] `ENCRYPTION_SECRET` is at least 16 characters long
- [ ] `ENCRYPTION_SECRET` is not committed to version control
- [ ] `ENCRYPTION_SECRET` is stored in a secrets management system (production)
- [ ] HTTPS certificates are configured (production)
- [ ] HTTPS is enforced in production
- [ ] Security headers are enabled
- [ ] Passwords are hashed with bcryptjs
- [ ] Tokens are hashed with SHA-256

## Common Tasks

### Migrate Existing Data

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

### Verify Encryption

```javascript
const User = require('./models/user.model');

async function verifyEncryption() {
  const user = await User.findOne({});
  console.log('Email encrypted:', !!user.email_encrypted);
  console.log('Member ID encrypted:', !!user.member_id_encrypted);
  console.log('Email decrypted:', user.email);
  console.log('Member ID decrypted:', user.member_id);
}

verifyEncryption();
```

### Check HTTPS Status

```bash
# Check if HTTPS is enabled
curl -v https://localhost:3000/health

# Check security headers
curl -I https://localhost:3000/health
```

## Performance Notes

- Encryption/decryption adds minimal overhead (~1-5ms per operation)
- Indexes on plaintext fields (email, member_id) still work
- Encrypted fields are stored separately for at-rest encryption
- Decryption happens automatically on retrieval

## Next Steps

1. Read `ENCRYPTION_GUIDE.md` for detailed documentation
2. Run tests: `npm test -- encryptionService.test.js`
3. Configure HTTPS for production
4. Test with bulk import workflow
5. Deploy to production

## Support

For issues or questions:
1. Check `ENCRYPTION_GUIDE.md` for detailed documentation
2. Review test cases in `encryptionService.test.js`
3. Check server logs for error messages
4. Verify environment variables are set correctly
