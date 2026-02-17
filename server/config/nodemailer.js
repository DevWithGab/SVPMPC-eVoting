/**
 * Nodemailer Configuration
 * Configures email sending via Nodemailer
 * Supports Gmail, custom SMTP, and other providers
 */

const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter
 * Supports multiple email providers via environment variables
 * 
 * @returns {object} - Nodemailer transporter instance
 */
function createTransporter() {
  // Gmail configuration (recommended for development/testing)
  if (process.env.EMAIL_PROVIDER === 'gmail' || !process.env.EMAIL_PROVIDER) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });
  }

  // Custom SMTP configuration
  if (process.env.EMAIL_PROVIDER === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Fallback to Gmail
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Verifies the transporter connection
 * Useful for testing email configuration
 * 
 * @param {object} transporter - Nodemailer transporter instance
 * @returns {Promise<boolean>} - True if connection successful
 */
async function verifyTransporter(transporter) {
  try {
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error.message);
    return false;
  }
}

// Create transporter instance
const transporter = createTransporter();

module.exports = {
  transporter,
  createTransporter,
  verifyTransporter,
};
