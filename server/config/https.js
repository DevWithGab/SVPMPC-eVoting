/**
 * HTTPS Configuration
 * Provides HTTPS setup for secure data transmission
 * 
 * Requirements:
 * - Ensure HTTPS for all data transmission
 * - Support both HTTP (development) and HTTPS (production)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Creates an HTTPS server with SSL/TLS certificates
 * In production, use certificates from a trusted CA (Let's Encrypt, etc.)
 * In development, self-signed certificates can be used
 * 
 * @param {object} app - Express application
 * @returns {object} HTTPS server instance or null if HTTPS not configured
 */
function createHTTPSServer(app) {
  try {
    const certPath = process.env.SSL_CERT_PATH;
    const keyPath = process.env.SSL_KEY_PATH;

    // Only create HTTPS server if certificates are configured
    if (!certPath || !keyPath) {
      console.warn('HTTPS certificates not configured. Set SSL_CERT_PATH and SSL_KEY_PATH environment variables.');
      console.warn('For production, use certificates from a trusted CA (Let\'s Encrypt, etc.)');
      return null;
    }

    // Check if certificate files exist
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.warn(`SSL certificate files not found at ${certPath} or ${keyPath}`);
      console.warn('HTTPS server will not be created. Using HTTP only.');
      return null;
    }

    // Read certificate and key files
    const cert = fs.readFileSync(certPath, 'utf8');
    const key = fs.readFileSync(keyPath, 'utf8');

    // Create HTTPS server with strong security options
    const httpsServer = https.createServer(
      {
        cert,
        key,
        // Security options
        minVersion: 'TLSv1.2', // Require TLS 1.2 or higher
        ciphers: 'HIGH:!aNULL:!MD5', // Use strong ciphers
        honorCipherOrder: true, // Prefer server's cipher order
      },
      app
    );

    console.log('HTTPS server configured with SSL/TLS certificates');
    return httpsServer;
  } catch (error) {
    console.error('Error creating HTTPS server:', error.message);
    return null;
  }
}

/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function enforceHTTPS(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https' && req.protocol !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
}

/**
 * Middleware to set security headers
 * Helps protect against common web vulnerabilities
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function setSecurityHeaders(req, res, next) {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

module.exports = {
  createHTTPSServer,
  enforceHTTPS,
  setSecurityHeaders,
};
