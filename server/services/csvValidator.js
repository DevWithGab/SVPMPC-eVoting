/**
 * CSV Validation Utility
 * Handles file format validation and column validation for bulk member imports
 */

const REQUIRED_COLUMNS = ['member_id', 'name', 'phone_number'];
const OPTIONAL_COLUMNS = ['email'];
const ALLOWED_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Validates that the file is in CSV format
 * @param {string} filename - The name of the uploaded file
 * @returns {object} - { isValid: boolean, error?: string }
 */
function validateFileFormat(filename) {
  if (!filename || typeof filename !== 'string') {
    return { isValid: false, error: 'Invalid filename' };
  }

  const extension = filename.toLowerCase().split('.').pop();
  if (extension !== 'csv') {
    return { isValid: false, error: 'File must be in CSV format (.csv)' };
  }

  return { isValid: true };
}

/**
 * Validates that CSV headers contain all required columns
 * @param {string[]} headers - Array of column headers from CSV
 * @returns {object} - { isValid: boolean, error?: string, missingColumns?: string[] }
 */
function validateHeaders(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return { isValid: false, error: 'CSV file is empty or has no headers' };
  }

  // Check for required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    return {
      isValid: false,
      error: `Missing required columns: ${missingColumns.join(', ')}`,
      missingColumns
    };
  }

  // Check for unexpected columns (warn but don't fail)
  const unexpectedColumns = headers.filter(col => !ALLOWED_COLUMNS.includes(col));
  if (unexpectedColumns.length > 0) {
    console.warn(`Warning: Unexpected columns in CSV: ${unexpectedColumns.join(', ')}`);
  }

  return { isValid: true };
}

/**
 * Validates that optional email column exists if provided
 * @param {string[]} headers - Array of column headers from CSV
 * @returns {object} - { hasEmail: boolean }
 */
function validateOptionalColumns(headers) {
  return {
    hasEmail: headers.includes('email')
  };
}

module.exports = {
  validateFileFormat,
  validateHeaders,
  validateOptionalColumns,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  ALLOWED_COLUMNS
};
