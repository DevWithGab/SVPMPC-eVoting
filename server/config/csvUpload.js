/**
 * CSV Upload Configuration
 * Configures multer for CSV file uploads with proper validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create CSV uploads directory if it doesn't exist
const csvUploadsDir = path.join(__dirname, '../uploads/csv');
if (!fs.existsSync(csvUploadsDir)) {
  fs.mkdirSync(csvUploadsDir, { recursive: true });
}

// Setup storage for CSV files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, csvUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter - only allow CSV files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['text/csv', 'application/vnd.ms-excel'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check both MIME type and file extension
  if ((allowedMimes.includes(file.mimetype) || fileExtension === '.csv') && fileExtension === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Create multer instance for CSV uploads
const csvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for CSV files
  },
});

module.exports = { csvUpload };
